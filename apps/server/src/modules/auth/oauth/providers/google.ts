// apps/server/src/modules/auth/oauth/providers/google.ts
/**
 * Google OAuth Provider
 *
 * Implements OAuth 2.0 for Google Sign-In.
 * Scopes: email, profile (for basic user info)
 */

import { OAuthError } from '@abe-stack/core';

import type { OAuthProviderClient, OAuthTokenResponse, OAuthUserInfo } from '../types';

// ============================================================================
// Configuration
// ============================================================================

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const GOOGLE_SCOPES = ['email', 'profile', 'openid'];

// ============================================================================
// Types
// ============================================================================

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

// ============================================================================
// Provider Implementation
// ============================================================================

/**
 * Create a Google OAuth provider client
 */
export function createGoogleProvider(clientId: string, clientSecret: string): OAuthProviderClient {
  return {
    provider: 'google',

    getAuthorizationUrl(state: string, redirectUri: string): string {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: GOOGLE_SCOPES.join(' '),
        state,
        access_type: 'offline', // Request refresh token
        prompt: 'consent', // Force consent to get refresh token
      });

      return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    },

    async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResponse> {
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });

      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new OAuthError(
          `Failed to exchange code: ${error}`,
          'google',
          'TOKEN_EXCHANGE_FAILED',
        );
      }

      const data = (await response.json()) as GoogleTokenResponse;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        tokenType: data.token_type,
        scope: data.scope,
      };
    },

    async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
      const response = await fetch(GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new OAuthError(`Failed to get user info: ${error}`, 'google', 'USERINFO_FAILED');
      }

      const data = (await response.json()) as GoogleUserInfo;

      return {
        id: data.id,
        email: data.email,
        name: data.name !== '' ? data.name : null,
        emailVerified: data.verified_email,
        picture: data.picture,
      };
    },
  };
}
