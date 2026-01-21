// apps/server/src/modules/auth/oauth/__tests__/providers.test.ts
/**
 * OAuth Provider Unit Tests
 *
 * Tests the OAuth provider clients by mocking fetch calls.
 */

import { OAuthError } from '@abe-stack/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createGitHubProvider, createGoogleProvider } from '../providers';

// ============================================================================
// Mock fetch
// ============================================================================

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.clearAllMocks();
});

// ============================================================================
// Tests: Google Provider
// ============================================================================

describe('Google OAuth Provider', () => {
  const clientId = 'google-client-id';
  const clientSecret = 'google-client-secret';
  const provider = createGoogleProvider(clientId, clientSecret);

  describe('getAuthorizationUrl', () => {
    test('should generate correct authorization URL', () => {
      const state = 'random-state-123';
      const redirectUri = 'http://localhost:3000/callback';

      const url = provider.getAuthorizationUrl(state, redirectUri);

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain(`client_id=${clientId}`);
      expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
      expect(url).toContain('response_type=code');
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('access_type=offline');
      expect(url).toContain('scope=email+profile+openid');
    });
  });

  describe('exchangeCode', () => {
    test('should exchange code for tokens', async () => {
      const code = 'auth-code-123';
      const redirectUri = 'http://localhost:3000/callback';

      const mockResponse = {
        access_token: 'google-access-token',
        refresh_token: 'google-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile openid',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const tokens = await provider.exchangeCode(code, redirectUri);

      expect(tokens.accessToken).toBe('google-access-token');
      expect(tokens.refreshToken).toBe('google-refresh-token');
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.expiresAt).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );
    });

    test('should throw OAuthError on token exchange failure', async () => {
      const code = 'invalid-code';
      const redirectUri = 'http://localhost:3000/callback';

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Invalid authorization code'),
      } as Response);

      await expect(provider.exchangeCode(code, redirectUri)).rejects.toThrow(OAuthError);
    });
  });

  describe('getUserInfo', () => {
    test('should get user info from access token', async () => {
      const accessToken = 'google-access-token';

      const mockUserInfo = {
        id: '123456789',
        email: 'user@gmail.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://lh3.googleusercontent.com/...',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      } as Response);

      const userInfo = await provider.getUserInfo(accessToken);

      expect(userInfo.id).toBe('123456789');
      expect(userInfo.email).toBe('user@gmail.com');
      expect(userInfo.emailVerified).toBe(true);
      expect(userInfo.name).toBe('Test User');
      expect(userInfo.picture).toBe('https://lh3.googleusercontent.com/...');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
    });

    test('should throw OAuthError on user info failure', async () => {
      const accessToken = 'invalid-token';

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Unauthorized'),
      } as Response);

      await expect(provider.getUserInfo(accessToken)).rejects.toThrow(OAuthError);
    });
  });
});

// ============================================================================
// Tests: GitHub Provider
// ============================================================================

describe('GitHub OAuth Provider', () => {
  const clientId = 'github-client-id';
  const clientSecret = 'github-client-secret';
  const provider = createGitHubProvider(clientId, clientSecret);

  describe('getAuthorizationUrl', () => {
    test('should generate correct authorization URL', () => {
      const state = 'random-state-456';
      const redirectUri = 'http://localhost:3000/callback';

      const url = provider.getAuthorizationUrl(state, redirectUri);

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain(`client_id=${clientId}`);
      expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('scope=user%3Aemail+read%3Auser');
    });
  });

  describe('exchangeCode', () => {
    test('should exchange code for tokens', async () => {
      const code = 'auth-code-456';
      const redirectUri = 'http://localhost:3000/callback';

      const mockResponse = {
        access_token: 'github-access-token',
        token_type: 'bearer',
        scope: 'user:email,read:user',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const tokens = await provider.exchangeCode(code, redirectUri);

      expect(tokens.accessToken).toBe('github-access-token');
      expect(tokens.tokenType).toBe('bearer');
      expect(tokens.scope).toBe('user:email,read:user');
      // GitHub doesn't provide refresh tokens for OAuth apps
      expect(tokens.refreshToken).toBeUndefined();
    });

    test('should throw OAuthError on GitHub error response', async () => {
      const code = 'invalid-code';
      const redirectUri = 'http://localhost:3000/callback';

      const mockResponse = {
        error: 'bad_verification_code',
        error_description: 'The code passed is incorrect or expired.',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true, // GitHub returns 200 with error in body
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await expect(provider.exchangeCode(code, redirectUri)).rejects.toThrow(OAuthError);
    });
  });

  describe('getUserInfo', () => {
    test('should get user info with primary verified email', async () => {
      const accessToken = 'github-access-token';

      const mockUserInfo = {
        id: 12345678,
        login: 'testuser',
        name: 'Test User',
        email: null, // GitHub may not include email in user response
        avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
      };

      const mockEmails = [
        { email: 'secondary@example.com', primary: false, verified: true, visibility: null },
        { email: 'primary@example.com', primary: true, verified: true, visibility: 'public' },
      ];

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserInfo),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEmails),
        } as Response);

      const userInfo = await provider.getUserInfo(accessToken);

      expect(userInfo.id).toBe('12345678');
      expect(userInfo.email).toBe('primary@example.com'); // Uses primary verified email
      expect(userInfo.emailVerified).toBe(true);
      expect(userInfo.name).toBe('Test User');
      expect(userInfo.picture).toBe('https://avatars.githubusercontent.com/u/12345678');
    });

    test('should fallback to any verified email if no primary', async () => {
      const accessToken = 'github-access-token';

      const mockUserInfo = {
        id: 12345678,
        login: 'testuser',
        name: 'Test User',
        email: null,
        avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
      };

      const mockEmails = [
        { email: 'verified@example.com', primary: false, verified: true, visibility: null },
        { email: 'unverified@example.com', primary: true, verified: false, visibility: null },
      ];

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserInfo),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEmails),
        } as Response);

      const userInfo = await provider.getUserInfo(accessToken);

      expect(userInfo.email).toBe('verified@example.com');
      expect(userInfo.emailVerified).toBe(true);
    });

    test('should throw OAuthError when no email available', async () => {
      const accessToken = 'github-access-token';

      const mockUserInfo = {
        id: 12345678,
        login: 'testuser',
        name: 'Test User',
        email: null,
        avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
      };

      const mockEmails: unknown[] = []; // No emails

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserInfo),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEmails),
        } as Response);

      await expect(provider.getUserInfo(accessToken)).rejects.toThrow(OAuthError);
    });
  });
});
