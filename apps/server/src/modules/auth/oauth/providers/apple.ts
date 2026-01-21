// apps/server/src/modules/auth/oauth/providers/apple.ts
/**
 * Apple OAuth Provider (Sign in with Apple)
 *
 * Implements Sign in with Apple OAuth flow.
 * Note: Apple requires additional setup (Apple Developer account, private key).
 *
 * Key differences from other providers:
 * - Uses RS256 JWT for client_secret (generated from private key)
 * - User info is returned in the id_token, not a separate API call
 * - User's name is only returned on first authorization
 */

import { createPrivateKey } from 'node:crypto';

import { OAuthError } from '@shared';

import type { OAuthProviderClient, OAuthTokenResponse, OAuthUserInfo } from '../types';

// ============================================================================
// Configuration
// ============================================================================

const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';

const APPLE_SCOPES = ['email', 'name'];

// ============================================================================
// Types
// ============================================================================

interface AppleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token: string;
  error?: string;
  error_description?: string;
}

interface AppleIdTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string; // User's unique ID
  email?: string;
  email_verified?: string | boolean;
  is_private_email?: string | boolean;
  nonce?: string;
  nonce_supported?: boolean;
  real_user_status?: number;
}

interface AppleClientSecretOptions {
  teamId: string;
  clientId: string;
  keyId: string;
  privateKey: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate Apple client_secret JWT
 * Apple requires a JWT signed with your private key as the client_secret
 */
async function generateClientSecret(options: AppleClientSecretOptions): Promise<string> {
  const { teamId, clientId, keyId, privateKey } = options;

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86400 * 180; // 180 days (Apple maximum)

  const header = {
    alg: 'ES256',
    kid: keyId,
    typ: 'JWT',
  };

  const payload = {
    iss: teamId,
    iat: now,
    exp,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  // Base64url encode
  const base64url = (data: object): string =>
    Buffer.from(JSON.stringify(data))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

  const headerB64 = base64url(header);
  const payloadB64 = base64url(payload);
  const message = `${headerB64}.${payloadB64}`;

  // Sign with private key using native crypto
  const { sign } = await import('node:crypto');
  const key = createPrivateKey({
    key: privateKey,
    format: 'pem',
  });

  const signature = sign('sha256', Buffer.from(message), key);

  // Convert DER signature to raw r||s format for ES256
  // DER format: 0x30 [total length] 0x02 [r length] [r] 0x02 [s length] [s]
  const derToRaw = (der: Buffer): Buffer => {
    // Skip 0x30 and length byte
    let offset = 2;

    // Read r
    const rMarker = der[offset];
    if (rMarker !== 0x02) throw new Error('Invalid DER signature');
    offset++;
    const rLen = der[offset] ?? 0;
    offset++;
    let r = der.subarray(offset, offset + rLen);
    offset += rLen;

    // Read s
    const sMarker = der[offset];
    if (sMarker !== 0x02) throw new Error('Invalid DER signature');
    offset++;
    const sLen = der[offset] ?? 0;
    offset++;
    let s = der.subarray(offset, offset + sLen);

    // Remove leading zeros (DER uses signed integers)
    if (r.length > 32) r = r.subarray(r.length - 32);
    if (s.length > 32) s = s.subarray(s.length - 32);

    // Pad to 32 bytes if needed
    const raw = Buffer.alloc(64);
    r.copy(raw, 32 - r.length);
    s.copy(raw, 64 - s.length);

    return raw;
  };

  const rawSignature = derToRaw(signature);
  const signatureB64 = rawSignature
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${message}.${signatureB64}`;
}

/**
 * Decode and verify Apple id_token
 * In production, you should verify the signature against Apple's public keys
 */
function decodeIdToken(idToken: string): AppleIdTokenPayload {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new OAuthError('Invalid id_token format', 'apple', 'INVALID_ID_TOKEN');
  }

  try {
    const payloadB64 = (parts[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (payloadB64.length % 4)) % 4);
    const payload = Buffer.from(payloadB64 + padding, 'base64').toString('utf8');
    return JSON.parse(payload) as AppleIdTokenPayload;
  } catch {
    throw new OAuthError('Failed to decode id_token', 'apple', 'INVALID_ID_TOKEN');
  }
}

// ============================================================================
// Provider Implementation
// ============================================================================

export interface AppleProviderConfig {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}

/**
 * Create an Apple OAuth provider client
 */
export function createAppleProvider(config: AppleProviderConfig): OAuthProviderClient {
  const { clientId, teamId, keyId, privateKey } = config;

  return {
    provider: 'apple',

    getAuthorizationUrl(state: string, redirectUri: string): string {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: APPLE_SCOPES.join(' '),
        state,
        response_mode: 'form_post', // Apple recommends form_post for security
      });

      return `${APPLE_AUTH_URL}?${params.toString()}`;
    },

    async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResponse> {
      // Generate client_secret JWT
      const clientSecret = await generateClientSecret({
        teamId,
        clientId,
        keyId,
        privateKey,
      });

      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });

      const response = await fetch(APPLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new OAuthError(`Failed to exchange code: ${error}`, 'apple', 'TOKEN_EXCHANGE_FAILED');
      }

      const data = (await response.json()) as AppleTokenResponse;

      if (data.error) {
        throw new OAuthError(
          `Apple OAuth error: ${data.error_description || data.error}`,
          'apple',
          'TOKEN_EXCHANGE_FAILED',
        );
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        tokenType: data.token_type,
      };
    },

    getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
      // Apple doesn't have a userinfo endpoint
      // User info must be extracted from the id_token during token exchange
      // This method requires the id_token to be passed (we'll handle this in the service)

      // For Apple, we need to store the id_token and decode it
      // The accessToken parameter here will actually contain the id_token
      // This is a workaround since Apple's user info is in the id_token

      const payload = decodeIdToken(accessToken);

      if (!payload.email) {
        throw new OAuthError(
          'No email found in Apple id_token. User may have chosen to hide their email.',
          'apple',
          'NO_EMAIL',
        );
      }

      // Apple returns email_verified as string "true" or boolean
      const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

      return Promise.resolve({
        id: payload.sub,
        email: payload.email,
        name: null, // Name is only provided on first authorization in a separate user object
        emailVerified,
      });
    },
  };
}

/**
 * Special helper for Apple: extract user info from id_token
 * Call this during token exchange since Apple includes user info in id_token
 */
export function extractAppleUserFromIdToken(idToken: string): OAuthUserInfo {
  const payload = decodeIdToken(idToken);

  if (!payload.email) {
    throw new OAuthError('No email found in Apple id_token', 'apple', 'NO_EMAIL');
  }

  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

  return {
    id: payload.sub,
    email: payload.email,
    name: null,
    emailVerified,
  };
}
