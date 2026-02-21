// main/server/core/src/auth/oauth/providers/kakao.ts
/**
 * Kakao OAuth Provider
 *
 * Implements OAuth 2.0 for Kakao authentication.
 *
 * @module oauth/providers/kakao
 */

import { OAuthError } from '@bslt/shared';

import type { OAuthProviderClient, OAuthTokenResponse, OAuthUserInfo } from '../types';

const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USERINFO_URL = 'https://kapi.kakao.com/v2/user/me';

const KAKAO_SCOPES = ['account_email', 'profile_nickname', 'profile_image'];

interface KakaoTokenResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

interface KakaoUserInfo {
  id: number;
  kakao_account?: {
    email?: string;
    is_email_verified?: boolean;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

export function createKakaoProvider(clientId: string, clientSecret?: string): OAuthProviderClient {
  return {
    provider: 'kakao',

    getAuthorizationUrl(state: string, redirectUri: string): string {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: KAKAO_SCOPES.join(','),
        state,
      });
      return `${KAKAO_AUTH_URL}?${params.toString()}`;
    },

    async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResponse> {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
      });
      if (clientSecret !== undefined && clientSecret !== '') {
        params.set('client_secret', clientSecret);
      }

      const response = await fetch(KAKAO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new OAuthError(`Failed to exchange code: ${error}`, 'kakao', 'TOKEN_EXCHANGE_FAILED');
      }

      const data = (await response.json()) as KakaoTokenResponse;
      return {
        accessToken: data.access_token,
        ...(data.refresh_token !== undefined ? { refreshToken: data.refresh_token } : {}),
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        tokenType: data.token_type,
        ...(data.scope !== undefined ? { scope: data.scope } : {}),
      };
    },

    async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
      const response = await fetch(KAKAO_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new OAuthError(`Failed to get user info: ${error}`, 'kakao', 'USERINFO_FAILED');
      }

      const data = (await response.json()) as KakaoUserInfo;
      const email = data.kakao_account?.email;
      if (email === undefined || email === '') {
        throw new OAuthError(
          'No email found on Kakao account. Please consent to email sharing.',
          'kakao',
          'NO_EMAIL',
        );
      }

      const result: OAuthUserInfo = {
        id: data.id.toString(),
        email,
        name: data.kakao_account?.profile?.nickname ?? null,
        emailVerified: data.kakao_account?.is_email_verified === true,
      };

      const picture = data.kakao_account?.profile?.profile_image_url;
      if (picture !== undefined && picture !== '') {
        result.picture = picture;
      }

      return result;
    },
  };
}
