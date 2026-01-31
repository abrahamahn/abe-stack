// modules/auth/src/oauth/providers/github.ts
/**
 * GitHub OAuth Provider
 *
 * Implements OAuth 2.0 for GitHub authentication.
 * Scopes: user:email, read:user (for basic user info and verified email)
 *
 * @module oauth/providers/github
 */

import { OAuthError } from '@abe-stack/core';

import type { OAuthProviderClient, OAuthTokenResponse, OAuthUserInfo } from '../types';

// ============================================================================
// Configuration
// ============================================================================

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USERINFO_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

const GITHUB_SCOPES = ['user:email', 'read:user'];

// ============================================================================
// Types
// ============================================================================

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserInfo {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

// ============================================================================
// Provider Implementation
// ============================================================================

/**
 * Create a GitHub OAuth provider client.
 *
 * @param clientId - GitHub OAuth client ID
 * @param clientSecret - GitHub OAuth client secret
 * @returns OAuth provider client implementation
 * @complexity O(1)
 */
export function createGitHubProvider(clientId: string, clientSecret: string): OAuthProviderClient {
  return {
    provider: 'github',

    getAuthorizationUrl(state: string, redirectUri: string): string {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: GITHUB_SCOPES.join(' '),
        state,
        allow_signup: 'true',
      });

      return `${GITHUB_AUTH_URL}?${params.toString()}`;
    },

    async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResponse> {
      const response = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new OAuthError(
          `Failed to exchange code: ${error}`,
          'github',
          'TOKEN_EXCHANGE_FAILED',
        );
      }

      const data = (await response.json()) as GitHubTokenResponse;

      if (data.error != null && data.error !== '') {
        throw new OAuthError(
          `GitHub OAuth error: ${data.error_description ?? data.error}`,
          'github',
          'TOKEN_EXCHANGE_FAILED',
        );
      }

      // GitHub doesn't provide refresh tokens or expiry for OAuth apps
      // (only for GitHub Apps with user-to-server tokens)
      return {
        accessToken: data.access_token,
        tokenType: data.token_type,
        scope: data.scope,
      };
    },

    async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
      // Fetch user profile
      const userResponse = await fetch(GITHUB_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!userResponse.ok) {
        const error = await userResponse.text();
        throw new OAuthError(`Failed to get user info: ${error}`, 'github', 'USERINFO_FAILED');
      }

      const userData = (await userResponse.json()) as GitHubUserInfo;

      // Fetch user emails to get primary verified email
      const emailsResponse = await fetch(GITHUB_EMAILS_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      let email = userData.email;
      let emailVerified = false;

      if (emailsResponse.ok) {
        const emails = (await emailsResponse.json()) as GitHubEmail[];
        // Find primary verified email
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        if (primaryEmail != null) {
          email = primaryEmail.email;
          emailVerified = true;
        } else {
          // Fall back to any verified email
          const verifiedEmail = emails.find((e) => e.verified);
          if (verifiedEmail != null) {
            email = verifiedEmail.email;
            emailVerified = true;
          }
        }
      }

      if (email == null || email === '') {
        throw new OAuthError(
          'No email found on GitHub account. Please make your email public or add a verified email.',
          'github',
          'NO_EMAIL',
        );
      }

      return {
        id: userData.id.toString(),
        email,
        name: userData.name,
        emailVerified,
        picture: userData.avatar_url,
      };
    },
  };
}
