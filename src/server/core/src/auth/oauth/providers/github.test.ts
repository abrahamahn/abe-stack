// src/server/core/src/auth/oauth/providers/github.test.ts
/**
 * GitHub OAuth Provider Tests
 *
 * Comprehensive unit tests for GitHub OAuth 2.0 authentication provider.
 * Tests authorization URL generation, code exchange, and user info retrieval.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGitHubProvider } from './github';

import type { OAuthProviderClient } from '../types';
import type { OAuthError } from '@abe-stack/shared';

// ============================================================================
// Test Setup
// ============================================================================

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('createGitHubProvider', () => {
  let provider: OAuthProviderClient;
  const clientId = 'test-client-id';
  const clientSecret = 'test-client-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    provider = createGitHubProvider(clientId, clientSecret);
  });

  // ==========================================================================
  // Provider Metadata
  // ==========================================================================

  describe('provider metadata', () => {
    it('should have correct provider name', () => {
      expect(provider.provider).toBe('github');
    });
  });

  // ==========================================================================
  // getAuthorizationUrl
  // ==========================================================================

  describe('getAuthorizationUrl', () => {
    describe('when given valid parameters', () => {
      it('should generate valid authorization URL', () => {
        const state = 'random-state-123';
        const redirectUri = 'http://localhost:3000/auth/github/callback';

        const url = provider.getAuthorizationUrl(state, redirectUri);

        expect(url).toContain('https://github.com/login/oauth/authorize');
        expect(url).toContain(`client_id=${clientId}`);
        expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
        expect(url).toContain(`state=${state}`);
      });

      it('should include required scopes', () => {
        const state = 'random-state-123';
        const redirectUri = 'http://localhost:3000/auth/github/callback';

        const url = provider.getAuthorizationUrl(state, redirectUri);

        expect(url).toContain('scope=user%3Aemail+read%3Auser');
      });

      it('should include allow_signup parameter', () => {
        const state = 'random-state-123';
        const redirectUri = 'http://localhost:3000/auth/github/callback';

        const url = provider.getAuthorizationUrl(state, redirectUri);

        expect(url).toContain('allow_signup=true');
      });
    });

    describe('edge cases', () => {
      it('should handle special characters in redirect URI', () => {
        const state = 'state-with-special';
        const redirectUri = 'http://localhost:3000/auth/callback?param=value&other=test';

        const url = provider.getAuthorizationUrl(state, redirectUri);

        expect(url).toContain(encodeURIComponent(redirectUri));
      });

      it('should handle empty state string', () => {
        const state = '';
        const redirectUri = 'http://localhost:3000/auth/github/callback';

        const url = provider.getAuthorizationUrl(state, redirectUri);

        expect(url).toContain('state=');
      });
    });
  });

  // ==========================================================================
  // exchangeCode
  // ==========================================================================

  describe('exchangeCode', () => {
    const code = 'authorization-code-123';
    const redirectUri = 'http://localhost:3000/auth/github/callback';

    describe('when exchange is successful', () => {
      it('should exchange code for access token', async () => {
        const mockResponse = {
          access_token: 'gho_test_access_token_123',
          token_type: 'bearer',
          scope: 'user:email read:user',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => mockResponse,
        });

        const result = await provider.exchangeCode(code, redirectUri);

        expect(result).toEqual({
          accessToken: 'gho_test_access_token_123',
          tokenType: 'bearer',
          scope: 'user:email read:user',
        });
      });

      it('should call GitHub token endpoint with correct parameters', async () => {
        const mockResponse = {
          access_token: 'gho_test_token',
          token_type: 'bearer',
          scope: 'user:email',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => mockResponse,
        });

        await provider.exchangeCode(code, redirectUri);

        expect(mockFetch).toHaveBeenCalledWith('https://github.com/login/oauth/access_token', {
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
      });

      it('should not include refresh token or expiry (GitHub OAuth limitation)', async () => {
        const mockResponse = {
          access_token: 'gho_test_token',
          token_type: 'bearer',
          scope: 'user:email',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => mockResponse,
        });

        const result = await provider.exchangeCode(code, redirectUri);

        expect(result.refreshToken).toBeUndefined();
        expect(result.expiresAt).toBeUndefined();
      });
    });

    describe('when exchange fails', () => {
      it('should throw OAuthError when HTTP request fails', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          text: () => 'Invalid client credentials',
        });

        await expect(provider.exchangeCode(code, redirectUri)).rejects.toMatchObject({
          name: 'OAuthError',
        });
      });

      it('should throw OAuthError with correct error code on HTTP failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          text: () => 'Network error',
        });

        try {
          await provider.exchangeCode(code, redirectUri);
          expect.fail('Should have thrown OAuthError');
        } catch (error) {
          expect((error as OAuthError).name).toBe('OAuthError');
          expect((error as OAuthError).provider).toBe('github');
        }
      });

      it('should throw OAuthError when response contains error field', async () => {
        const errorResponse = {
          error: 'invalid_grant',
          error_description: 'The code has expired',
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: () => errorResponse,
        });

        await expect(provider.exchangeCode(code, redirectUri)).rejects.toThrow(
          'GitHub OAuth error: The code has expired',
        );
      });

      it('should use error field when error_description is missing', async () => {
        const errorResponse = {
          error: 'bad_verification_code',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => errorResponse,
        });

        await expect(provider.exchangeCode(code, redirectUri)).rejects.toThrow(
          'GitHub OAuth error: bad_verification_code',
        );
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network failure'));

        await expect(provider.exchangeCode(code, redirectUri)).rejects.toThrow('Network failure');
      });
    });

    describe('edge cases', () => {
      it('should handle empty error field (treats as non-error)', async () => {
        const mockResponse = {
          access_token: 'gho_test_token',
          token_type: 'bearer',
          scope: 'user:email',
          error: '',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => mockResponse,
        });

        const result = await provider.exchangeCode(code, redirectUri);

        expect(result.accessToken).toBe('gho_test_token');
      });

      it('should handle response with extra fields', async () => {
        const mockResponse = {
          access_token: 'gho_test_token',
          token_type: 'bearer',
          scope: 'user:email',
          extra_field: 'ignored',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => mockResponse,
        });

        const result = await provider.exchangeCode(code, redirectUri);

        expect(result.accessToken).toBe('gho_test_token');
      });
    });
  });

  // ==========================================================================
  // getUserInfo
  // ==========================================================================

  describe('getUserInfo', () => {
    const accessToken = 'gho_test_access_token_123';

    describe('when user info fetch is successful', () => {
      it('should retrieve user info with verified email', async () => {
        const mockUserData = {
          id: 12345678,
          login: 'octocat',
          name: 'The Octocat',
          email: 'octocat@github.com',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
        };

        const mockEmailsData = [
          {
            email: 'octocat@github.com',
            primary: true,
            verified: true,
            visibility: 'public',
          },
        ];

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockUserData,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockEmailsData,
          });

        const result = await provider.getUserInfo(accessToken);

        expect(result).toEqual({
          id: '12345678',
          email: 'octocat@github.com',
          name: 'The Octocat',
          emailVerified: true,
          picture: 'https://avatars.githubusercontent.com/u/12345678',
        });
      });

      it('should call GitHub API with correct headers', async () => {
        const mockUserData = {
          id: 12345678,
          login: 'octocat',
          name: 'The Octocat',
          email: 'octocat@github.com',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => mockUserData,
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => [],
        });

        await provider.getUserInfo(accessToken);

        expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        expect(mockFetch).toHaveBeenNthCalledWith(2, 'https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });
      });

      it('should prefer primary verified email over user profile email', async () => {
        const mockUserData = {
          id: 12345678,
          login: 'octocat',
          name: 'The Octocat',
          email: 'public@example.com',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
        };

        const mockEmailsData = [
          {
            email: 'primary@example.com',
            primary: true,
            verified: true,
            visibility: null,
          },
          {
            email: 'public@example.com',
            primary: false,
            verified: false,
            visibility: 'public',
          },
        ];

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockUserData,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockEmailsData,
          });

        const result = await provider.getUserInfo(accessToken);

        expect(result.email).toBe('primary@example.com');
        expect(result.emailVerified).toBe(true);
      });

      it('should fall back to any verified email if no primary', async () => {
        const mockUserData = {
          id: 12345678,
          login: 'octocat',
          name: 'The Octocat',
          email: null,
          avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
        };

        const mockEmailsData = [
          {
            email: 'unverified@example.com',
            primary: true,
            verified: false,
            visibility: null,
          },
          {
            email: 'verified@example.com',
            primary: false,
            verified: true,
            visibility: null,
          },
        ];

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockUserData,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockEmailsData,
          });

        const result = await provider.getUserInfo(accessToken);

        expect(result.email).toBe('verified@example.com');
        expect(result.emailVerified).toBe(true);
      });

      it('should use profile email when emails API fails', async () => {
        const mockUserData = {
          id: 12345678,
          login: 'octocat',
          name: 'The Octocat',
          email: 'public@example.com',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockUserData,
          })
          .mockResolvedValueOnce({
            ok: false,
            text: () => 'API rate limit exceeded',
          });

        const result = await provider.getUserInfo(accessToken);

        expect(result.email).toBe('public@example.com');
        expect(result.emailVerified).toBe(false);
      });

      it('should handle null name in user profile', async () => {
        const mockUserData = {
          id: 12345678,
          login: 'octocat',
          name: null,
          email: 'octocat@github.com',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
        };

        const mockEmailsData = [
          {
            email: 'octocat@github.com',
            primary: true,
            verified: true,
            visibility: 'public',
          },
        ];

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockUserData,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockEmailsData,
          });

        const result = await provider.getUserInfo(accessToken);

        expect(result.name).toBeNull();
        expect(result.email).toBe('octocat@github.com');
      });

      it('should convert numeric ID to string', async () => {
        const mockUserData = {
          id: 99999999,
          login: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://avatars.githubusercontent.com/u/99999999',
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockUserData,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => [],
          });

        const result = await provider.getUserInfo(accessToken);

        expect(result.id).toBe('99999999');
        expect(typeof result.id).toBe('string');
      });
    });

    describe('when user info fetch fails', () => {
      it('should throw OAuthError when user API fails', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          text: () => 'Unauthorized',
        });

        await expect(provider.getUserInfo(accessToken)).rejects.toThrow('Failed to get user info');
      });

      it('should throw OAuthError with correct error code on user API failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          text: () => 'Bad credentials',
        });

        try {
          await provider.getUserInfo(accessToken);
          expect.fail('Should have thrown OAuthError');
        } catch (error) {
          expect((error as OAuthError).name).toBe('OAuthError');
          expect((error as OAuthError).provider).toBe('github');
        }
      });

      it('should throw OAuthError when no email is available', async () => {
        const mockUserData = {
          id: 12345678,
          login: 'octocat',
          name: 'The Octocat',
          email: null,
          avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
        };

        const mockEmailsData: never[] = [];

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockUserData,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockEmailsData,
          });

        await expect(provider.getUserInfo(accessToken)).rejects.toThrow('No email found');
      });

      it('should throw OAuthError when email is empty string', async () => {
        const mockUserData = {
          id: 12345678,
          login: 'octocat',
          name: 'The Octocat',
          email: '',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockUserData,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => [],
          });

        await expect(provider.getUserInfo(accessToken)).rejects.toThrow('No email found');
      });

      it('should handle network errors on user API call', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

        await expect(provider.getUserInfo(accessToken)).rejects.toThrow('Network timeout');
      });
    });

    describe('edge cases', () => {
      it('should handle empty emails array', async () => {
        const mockUserData = {
          id: 12345678,
          login: 'octocat',
          name: 'The Octocat',
          email: 'fallback@example.com',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockUserData,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => [],
          });

        const result = await provider.getUserInfo(accessToken);

        expect(result.email).toBe('fallback@example.com');
        expect(result.emailVerified).toBe(false);
      });

      it('should handle all unverified emails', async () => {
        const mockUserData = {
          id: 12345678,
          login: 'octocat',
          name: 'The Octocat',
          email: 'public@example.com',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
        };

        const mockEmailsData = [
          {
            email: 'unverified1@example.com',
            primary: true,
            verified: false,
            visibility: null,
          },
          {
            email: 'unverified2@example.com',
            primary: false,
            verified: false,
            visibility: null,
          },
        ];

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockUserData,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockEmailsData,
          });

        const result = await provider.getUserInfo(accessToken);

        expect(result.email).toBe('public@example.com');
        expect(result.emailVerified).toBe(false);
      });

      it('should handle multiple verified emails (prefer primary)', async () => {
        const mockUserData = {
          id: 12345678,
          login: 'octocat',
          name: 'The Octocat',
          email: null,
          avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
        };

        const mockEmailsData = [
          {
            email: 'secondary@example.com',
            primary: false,
            verified: true,
            visibility: null,
          },
          {
            email: 'primary@example.com',
            primary: true,
            verified: true,
            visibility: 'public',
          },
        ];

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockUserData,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockEmailsData,
          });

        const result = await provider.getUserInfo(accessToken);

        expect(result.email).toBe('primary@example.com');
        expect(result.emailVerified).toBe(true);
      });

      it('should handle large user IDs correctly', async () => {
        const mockUserData = {
          id: 9007199254740991, // MAX_SAFE_INTEGER
          login: 'biguser',
          name: 'Big User',
          email: 'big@example.com',
          avatar_url: 'https://avatars.githubusercontent.com/u/9007199254740991',
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => mockUserData,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => [],
          });

        const result = await provider.getUserInfo(accessToken);

        expect(result.id).toBe('9007199254740991');
      });
    });
  });
});
