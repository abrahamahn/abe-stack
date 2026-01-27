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

import { createPrivateKey, createPublicKey, createVerify } from 'node:crypto';

import { OAuthError } from '@abe-stack/core';

import type { OAuthProviderClient, OAuthTokenResponse, OAuthUserInfo } from '../types';

// ============================================================================
// Configuration
// ============================================================================

const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

const APPLE_SCOPES = ['email', 'name'];

// Cache for Apple's public keys (refreshed every hour)
let appleKeysCache: { keys: AppleJWK[]; fetchedAt: number } | null = null;
const KEYS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

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

/**
 * Apple's JWK (JSON Web Key) format
 */
interface AppleJWK {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string; // RSA modulus
  e: string; // RSA exponent
}

interface AppleKeysResponse {
  keys: AppleJWK[];
}

interface JwtHeader {
  alg: string;
  kid: string;
}

// ============================================================================
// Apple Public Key Management
// ============================================================================

/**
 * Fetch Apple's public keys for id_token verification
 * Keys are cached for 1 hour to reduce latency
 */
async function fetchApplePublicKeys(): Promise<AppleJWK[]> {
  const now = Date.now();

  // Return cached keys if still valid
  if (appleKeysCache != null && now - appleKeysCache.fetchedAt < KEYS_CACHE_TTL_MS) {
    return appleKeysCache.keys;
  }

  const response = await fetch(APPLE_KEYS_URL);

  if (!response.ok) {
    throw new OAuthError(
      `Failed to fetch Apple public keys: ${String(response.status)}`,
      'apple',
      'KEYS_FETCH_FAILED',
    );
  }

  const data = (await response.json()) as AppleKeysResponse;

  // Update cache
  appleKeysCache = {
    keys: data.keys,
    fetchedAt: now,
  };

  return data.keys;
}

/**
 * Convert Apple JWK (RSA) to PEM format for crypto verification
 */
function jwkToPem(jwk: AppleJWK): string {
  // Use Node's createPublicKey to convert JWK to PEM directly
  const publicKey = createPublicKey({
    key: {
      kty: 'RSA',
      n: jwk.n,
      e: jwk.e,
    },
    format: 'jwk',
  });

  const pem = publicKey.export({ type: 'spki', format: 'pem' });
  if (typeof pem === 'string') {
    return pem;
  }
  throw new OAuthError('Failed to convert JWK to PEM format', 'apple', 'JWK_CONVERSION_FAILED');
}

/**
 * Parse JWT header without verification
 */
function parseJwtHeader(token: string): JwtHeader {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new OAuthError('Invalid JWT format', 'apple', 'INVALID_ID_TOKEN');
  }

  try {
    const headerB64 = (parts[0] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (headerB64.length % 4)) % 4);
    const header = Buffer.from(headerB64 + padding, 'base64').toString('utf8');
    return JSON.parse(header) as JwtHeader;
  } catch {
    throw new OAuthError('Failed to parse JWT header', 'apple', 'INVALID_ID_TOKEN');
  }
}

/**
 * Verify Apple id_token signature using Apple's public keys
 */
async function verifyIdTokenSignature(idToken: string): Promise<void> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new OAuthError('Invalid id_token format', 'apple', 'INVALID_ID_TOKEN');
  }

  // Parse header to get key ID
  const header = parseJwtHeader(idToken);

  if (header.alg !== 'RS256') {
    throw new OAuthError(
      `Unsupported algorithm: ${header.alg}. Expected RS256`,
      'apple',
      'INVALID_ALGORITHM',
    );
  }

  // Fetch Apple's public keys
  const keys = await fetchApplePublicKeys();

  // Find the key matching the token's kid
  if (header.kid === '') {
    throw new OAuthError('Missing kid in JWT header', 'apple', 'MISSING_KID');
  }
  const key = keys.find((k) => k.kid === header.kid);
  if (key == null) {
    throw new OAuthError(
      `No matching public key found for kid: ${header.kid}`,
      'apple',
      'KEY_NOT_FOUND',
    );
  }

  // Convert JWK to PEM
  const pem = jwkToPem(key);

  // Verify signature
  const part0 = parts[0] ?? '';
  const part1 = parts[1] ?? '';
  const part2 = parts[2] ?? '';
  const signedContent = `${part0}.${part1}`;
  const signatureB64 = part2.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (signatureB64.length % 4)) % 4);
  const signature = Buffer.from(signatureB64 + padding, 'base64');

  const verifier = createVerify('RSA-SHA256');
  verifier.update(signedContent);

  const isValid = verifier.verify(pem, signature);

  if (!isValid) {
    throw new OAuthError('Invalid id_token signature', 'apple', 'INVALID_SIGNATURE');
  }
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
 * Decode id_token payload without verification (internal use only)
 */
function decodeIdTokenPayload(idToken: string): AppleIdTokenPayload {
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

/**
 * Verify and decode Apple id_token
 *
 * Performs full verification:
 * 1. Signature verification against Apple's public keys
 * 2. Issuer validation (must be https://appleid.apple.com)
 * 3. Audience validation (must match client_id)
 * 4. Expiration check
 */
async function verifyAndDecodeIdToken(
  idToken: string,
  clientId: string,
): Promise<AppleIdTokenPayload> {
  // Step 1: Verify signature
  await verifyIdTokenSignature(idToken);

  // Step 2: Decode payload
  const payload = decodeIdTokenPayload(idToken);

  // Step 3: Validate issuer
  if (payload.iss !== APPLE_ISSUER) {
    throw new OAuthError(
      `Invalid issuer: ${payload.iss}. Expected: ${APPLE_ISSUER}`,
      'apple',
      'INVALID_ISSUER',
    );
  }

  // Step 4: Validate audience (must be our client_id)
  if (payload.aud !== clientId) {
    throw new OAuthError(
      `Invalid audience: ${payload.aud}. Expected: ${clientId}`,
      'apple',
      'INVALID_AUDIENCE',
    );
  }

  // Step 5: Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new OAuthError('id_token has expired', 'apple', 'TOKEN_EXPIRED');
  }

  // Step 6: Check issued-at is not in the future (with 5 minute tolerance for clock skew)
  if (payload.iat > now + 300) {
    throw new OAuthError('id_token issued in the future', 'apple', 'INVALID_IAT');
  }

  return payload;
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

      if (data.error != null && data.error !== '') {
        throw new OAuthError(
          `Apple OAuth error: ${data.error_description ?? data.error}`,
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

    async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
      // Apple doesn't have a userinfo endpoint
      // User info must be extracted from the id_token during token exchange
      // This method requires the id_token to be passed (we'll handle this in the service)

      // For Apple, we need to store the id_token and decode it
      // The accessToken parameter here will actually contain the id_token
      // This is a workaround since Apple's user info is in the id_token

      // Verify signature and decode (validates issuer, audience, expiration)
      const payload = await verifyAndDecodeIdToken(accessToken, clientId);

      if (payload.email == null || payload.email === '') {
        throw new OAuthError(
          'No email found in Apple id_token. User may have chosen to hide their email.',
          'apple',
          'NO_EMAIL',
        );
      }

      // Apple returns email_verified as string "true" or boolean
      const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

      return {
        id: payload.sub,
        email: payload.email,
        name: null, // Name is only provided on first authorization in a separate user object
        emailVerified,
      };
    },
  };
}

/**
 * Special helper for Apple: verify and extract user info from id_token
 * Call this during token exchange since Apple includes user info in id_token
 *
 * @param idToken - The id_token from Apple's token response
 * @param clientId - Your Apple client_id (Services ID) for audience validation
 * @returns User info extracted from the verified token
 */
export async function extractAppleUserFromIdToken(
  idToken: string,
  clientId: string,
): Promise<OAuthUserInfo> {
  // Fully verify the id_token (signature, issuer, audience, expiration)
  const payload = await verifyAndDecodeIdToken(idToken, clientId);

  if (payload.email == null || payload.email === '') {
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

/**
 * Clear the Apple public keys cache (useful for testing)
 */
export function clearAppleKeysCache(): void {
  appleKeysCache = null;
}
