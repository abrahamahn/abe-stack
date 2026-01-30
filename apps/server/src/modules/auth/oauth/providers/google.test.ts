// apps/server/src/modules/auth/oauth/providers/google.test.ts
/**
 * Google OAuth Provider Unit Tests
 *
 * Comprehensive tests for Google OAuth 2.0 provider implementation.
 * Tests authorization URL generation, token exchange, and user info retrieval.
 */

import { OAuthError } from '@abe-stack/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGoogleProvider } from '@abe-stack/auth/oauth/providers/google';

import type { OAuthProviderClient } from '@abe-stack/auth/oauth/types';

// ============================================================================
// Test Setup
// ============================================================================

const TEST_CLIENT_ID = 'test-google-client-id-123';
const TEST_CLIENT_SECRET = 'test-google-client-secret-456';
const TEST_STATE = 'random-csrf-state-token-xyz';
const TEST_REDIRECT_URI = 'https://example.com/auth/callback/google';
const TEST_AUTH_CODE = 'test-authorization-code-abc';
const TEST_ACCESS_TOKEN = 'test-google-access-token-def';

// Store original fetch to restore after tests
const originalFetch = global.fetch;

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Create a successful token exchange response
 */
function createMockTokenResponse(overrides?: Partial<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token: string;
}>) {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'email profile openid',
    id_token: 'mock-id-token',
    ...overrides,
  };
}

/**
 * Create a successful user info response
 */
function createMockUserInfo(overrides?: Partial<{
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}>) {
  return {
    id: '123456789012345678901',
    email: 'test.user@gmail.com',
    verified_email: true,
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://lh3.googleusercontent.com/a/test-photo-url',
    ...overrides,
  };
}

/**
 * Create a mock fetch Response
 */
function createMockResponse(data: unknown, options: { ok: boolean; status?: number } = { ok: true }) {
  return {
    ok: options.ok,
    status: options.status ?? (options.ok ? 200 : 400),
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
  } as unknown as Response;
}

// ============================================================================
// Test Lifecycle
// ============================================================================

beforeEach(() => {
  // Mock global fetch
  global.fetch = vi.fn();
});

afterEach(() => {
  // Restore original fetch
  global.fetch = originalFetch;
  // Clear all mocks
  vi.clearAllMocks();
});

// ============================================================================
// Tests: Provider Creation
// ============================================================================

describe('createGoogleProvider', () => {
  it('should create a Google OAuth provider with correct configuration', () => {
    const provider = createGoogleProvider(TEST_CLIENT_ID, TEST_CLIENT_SECRET);

    expect(provider).toBeDefined();
    expect(provider.provider).toBe('google');
    expect(typeof provider.getAuthorizationUrl).toBe('function');
    expect(typeof provider.exchangeCode).toBe('function');
    expect(typeof provider.getUserInfo).toBe('function');
  });

  it('should satisfy OAuthProviderClient interface', () => {
    const provider: OAuthProviderClient = createGoogleProvider(TEST_CLIENT_ID, TEST_CLIENT_SECRET);

    expect(provider.provider).toBe('google');
  });
});

// ============================================================================
// Tests: Authorization URL Generation
// ============================================================================

describe('getAuthorizationUrl', () => {
  const provider = createGoogleProvider(TEST_CLIENT_ID, TEST_CLIENT_SECRET);

  it('should generate a valid Google OAuth authorization URL', () => {
    const url = provider.getAuthorizationUrl(TEST_STATE, TEST_REDIRECT_URI);

    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain(`client_id=${TEST_CLIENT_ID}`);
    expect(url).toContain(`redirect_uri=${encodeURIComponent(TEST_REDIRECT_URI)}`);
    expect(url).toContain('response_type=code');
    expect(url).toContain(`state=${TEST_STATE}`);
  });

  it('should include required OAuth scopes', () => {
    const url = provider.getAuthorizationUrl(TEST_STATE, TEST_REDIRECT_URI);

    // Scopes should be space-separated and URL-encoded
    expect(url).toContain('scope=email+profile+openid');
  });

  it('should request offline access for refresh token', () => {
    const url = provider.getAuthorizationUrl(TEST_STATE, TEST_REDIRECT_URI);

    expect(url).toContain('access_type=offline');
  });

  it('should force consent prompt to ensure refresh token is granted', () => {
    const url = provider.getAuthorizationUrl(TEST_STATE, TEST_REDIRECT_URI);

    expect(url).toContain('prompt=consent');
  });

  it('should handle special characters in redirect URI', () => {
    const specialRedirectUri = 'https://example.com/auth?param=value&other=123';
    const url = provider.getAuthorizationUrl(TEST_STATE, specialRedirectUri);

    expect(url).toContain(encodeURIComponent(specialRedirectUri));
  });

  it('should handle special characters in state parameter', () => {
    const specialState = 'state-with-special/chars+&=?';
    const url = provider.getAuthorizationUrl(specialState, TEST_REDIRECT_URI);

    // URLSearchParams automatically encodes special characters
    expect(url).toContain('state=state-with-special%2Fchars%2B%26%3D%3F');
  });

  it('should generate consistent URLs for same inputs', () => {
    const url1 = provider.getAuthorizationUrl(TEST_STATE, TEST_REDIRECT_URI);
    const url2 = provider.getAuthorizationUrl(TEST_STATE, TEST_REDIRECT_URI);

    expect(url1).toBe(url2);
  });

  it('should generate different URLs for different states', () => {
    const url1 = provider.getAuthorizationUrl('state-1', TEST_REDIRECT_URI);
    const url2 = provider.getAuthorizationUrl('state-2', TEST_REDIRECT_URI);

    expect(url1).not.toBe(url2);
  });

  it('should generate different URLs for different redirect URIs', () => {
    const url1 = provider.getAuthorizationUrl(TEST_STATE, 'https://example.com/callback1');
    const url2 = provider.getAuthorizationUrl(TEST_STATE, 'https://example.com/callback2');

    expect(url1).not.toBe(url2);
  });
});

// ============================================================================
// Tests: Token Exchange
// ============================================================================

describe('exchangeCode', () => {
  const provider = createGoogleProvider(TEST_CLIENT_ID, TEST_CLIENT_SECRET);

  describe('successful token exchange', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockTokenResponse = createMockTokenResponse();
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockTokenResponse));

      const result = await provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.scope).toBe('email profile openid');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should calculate correct expiry time from expires_in', async () => {
      const expiresIn = 7200; // 2 hours
      const beforeRequest = Date.now();

      const mockTokenResponse = createMockTokenResponse({ expires_in: expiresIn });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockTokenResponse));

      const result = await provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI);

      const afterRequest = Date.now();
      const expectedMinExpiry = beforeRequest + expiresIn * 1000;
      const expectedMaxExpiry = afterRequest + expiresIn * 1000;

      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt!.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(result.expiresAt!.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it('should make POST request to correct Google token endpoint', async () => {
      const mockTokenResponse = createMockTokenResponse();
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockTokenResponse));

      await provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI);

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

    it('should send correct request parameters', async () => {
      const mockTokenResponse = createMockTokenResponse();
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockTokenResponse));

      await provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = fetchCall?.[1]?.body as string;

      expect(requestBody).toContain(`client_id=${TEST_CLIENT_ID}`);
      expect(requestBody).toContain(`client_secret=${TEST_CLIENT_SECRET}`);
      expect(requestBody).toContain(`code=${TEST_AUTH_CODE}`);
      expect(requestBody).toContain('grant_type=authorization_code');
      expect(requestBody).toContain(`redirect_uri=${encodeURIComponent(TEST_REDIRECT_URI)}`);
    });

    it('should handle response without refresh token', async () => {
      const mockTokenResponse = createMockTokenResponse();
      delete mockTokenResponse.refresh_token;

      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockTokenResponse));

      const result = await provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeUndefined();
    });

    it('should handle response without id_token', async () => {
      const mockTokenResponse = createMockTokenResponse();
      delete mockTokenResponse.id_token;

      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockTokenResponse));

      const result = await provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI);

      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should preserve token_type from response', async () => {
      const mockTokenResponse = createMockTokenResponse({ token_type: 'bearer' });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockTokenResponse));

      const result = await provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI);

      expect(result.tokenType).toBe('bearer');
    });
  });

  describe('error handling', () => {
    it('should throw OAuthError when response is not ok', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse('Invalid authorization code', { ok: false, status: 400 }),
      );

      await expect(provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI)).rejects.toMatchObject({
        name: 'OAuthError',
      });
    });

    it('should include error message in thrown OAuthError', async () => {
      const errorMessage = 'invalid_grant: Code was already redeemed';
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse(errorMessage, { ok: false, status: 400 }),
      );

      await expect(provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI)).rejects.toThrow(
        `Failed to exchange code: ${errorMessage}`,
      );
    });

    it('should include provider name in thrown OAuthError', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse('Error', { ok: false, status: 400 }),
      );

      try {
        await provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI);
        expect.fail('Should have thrown OAuthError');
      } catch (error) {
        expect((error as OAuthError).name).toBe('OAuthError');
        expect((error as OAuthError).provider).toBe('google');
      }
    });

    it('should include error code in thrown OAuthError', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse('Error', { ok: false, status: 400 }),
      );

      try {
        await provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI);
        expect.fail('Should have thrown OAuthError');
      } catch (error) {
        expect((error as OAuthError).name).toBe('OAuthError');
        expect((error as OAuthError).code).toBe('TOKEN_EXCHANGE_FAILED');
      }
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await expect(provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI)).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle JSON parsing errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: vi.fn().mockResolvedValue('Not valid JSON'),
      } as unknown as Response);

      await expect(provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI)).rejects.toThrow(
        'Invalid JSON',
      );
    });

    it('should handle 401 unauthorized errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse('Unauthorized', { ok: false, status: 401 }),
      );

      await expect(provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI)).rejects.toMatchObject({
        name: 'OAuthError',
      });
    });

    it('should handle 500 server errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse('Internal Server Error', { ok: false, status: 500 }),
      );

      await expect(provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI)).rejects.toMatchObject({
        name: 'OAuthError',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty authorization code', async () => {
      const mockTokenResponse = createMockTokenResponse();
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockTokenResponse));

      await provider.exchangeCode('', TEST_REDIRECT_URI);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = fetchCall?.[1]?.body as string;

      expect(requestBody).toContain('code=');
    });

    it('should handle very long authorization codes', async () => {
      const longCode = 'a'.repeat(1000);
      const mockTokenResponse = createMockTokenResponse();
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockTokenResponse));

      await provider.exchangeCode(longCode, TEST_REDIRECT_URI);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = fetchCall?.[1]?.body as string;

      expect(requestBody).toContain(`code=${longCode}`);
    });

    it('should handle special characters in authorization code', async () => {
      const specialCode = 'code-with/special+chars=';
      const mockTokenResponse = createMockTokenResponse();
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockTokenResponse));

      await provider.exchangeCode(specialCode, TEST_REDIRECT_URI);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = fetchCall?.[1]?.body as string;

      expect(requestBody).toContain('code=');
    });

    it('should handle expires_in of 0 (immediate expiry)', async () => {
      const mockTokenResponse = createMockTokenResponse({ expires_in: 0 });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockTokenResponse));

      const result = await provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI);

      expect(result.expiresAt).toBeDefined();
      // Allow 2 second tolerance for timing differences between when token was created and now
      expect(result.expiresAt!.getTime()).toBeGreaterThanOrEqual(Date.now() - 2000);
    });

    it('should handle very large expires_in values', async () => {
      const largeExpiresIn = 999999999; // ~31 years
      const mockTokenResponse = createMockTokenResponse({ expires_in: largeExpiresIn });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockTokenResponse));

      const result = await provider.exchangeCode(TEST_AUTH_CODE, TEST_REDIRECT_URI);

      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt!.getTime()).toBeGreaterThan(Date.now() + largeExpiresIn * 1000 - 1000);
    });
  });
});

// ============================================================================
// Tests: User Info Retrieval
// ============================================================================

describe('getUserInfo', () => {
  const provider = createGoogleProvider(TEST_CLIENT_ID, TEST_CLIENT_SECRET);

  describe('successful user info retrieval', () => {
    it('should retrieve user info with access token', async () => {
      const mockUserInfo = createMockUserInfo();
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.id).toBe('123456789012345678901');
      expect(result.email).toBe('test.user@gmail.com');
      expect(result.name).toBe('Test User');
      expect(result.emailVerified).toBe(true);
      expect(result.picture).toBe('https://lh3.googleusercontent.com/a/test-photo-url');
    });

    it('should make GET request to correct Google userinfo endpoint', async () => {
      const mockUserInfo = createMockUserInfo();
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${TEST_ACCESS_TOKEN}`,
          },
        }),
      );
    });

    it('should include Bearer token in Authorization header', async () => {
      const mockUserInfo = createMockUserInfo();
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      await provider.getUserInfo(TEST_ACCESS_TOKEN);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = fetchCall?.[1]?.headers as Record<string, string>;

      expect(headers['Authorization']).toBe(`Bearer ${TEST_ACCESS_TOKEN}`);
    });

    it('should map Google user fields to OAuthUserInfo interface', async () => {
      const mockUserInfo = createMockUserInfo({
        id: 'google-id-123',
        email: 'custom@example.com',
        name: 'Custom Name',
        verified_email: false,
        picture: 'https://example.com/photo.jpg',
      });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.id).toBe('google-id-123');
      expect(result.email).toBe('custom@example.com');
      expect(result.name).toBe('Custom Name');
      expect(result.emailVerified).toBe(false);
      expect(result.picture).toBe('https://example.com/photo.jpg');
    });

    it('should handle optional given_name and family_name fields', async () => {
      const mockUserInfo = createMockUserInfo({
        given_name: 'John',
        family_name: 'Doe',
      });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test User'); // Uses full name, not given/family
    });

    it('should handle missing optional picture field', async () => {
      const mockUserInfo = createMockUserInfo();
      delete mockUserInfo.picture;

      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.picture).toBeUndefined();
    });

    it('should handle empty string name as null', async () => {
      const mockUserInfo = createMockUserInfo({ name: '' });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.name).toBeNull();
    });

    it('should handle non-empty string name', async () => {
      const mockUserInfo = createMockUserInfo({ name: 'Valid Name' });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.name).toBe('Valid Name');
    });

    it('should handle whitespace-only name as non-empty', async () => {
      const mockUserInfo = createMockUserInfo({ name: '   ' });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.name).toBe('   '); // Whitespace is not empty string
    });
  });

  describe('error handling', () => {
    it('should throw OAuthError when response is not ok', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse('Unauthorized', { ok: false, status: 401 }),
      );

      await expect(provider.getUserInfo(TEST_ACCESS_TOKEN)).rejects.toMatchObject({
        name: 'OAuthError',
      });
    });

    it('should include error message in thrown OAuthError', async () => {
      const errorMessage = 'Invalid Credentials';
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse(errorMessage, { ok: false, status: 401 }),
      );

      await expect(provider.getUserInfo(TEST_ACCESS_TOKEN)).rejects.toThrow(
        `Failed to get user info: ${errorMessage}`,
      );
    });

    it('should include provider name in thrown OAuthError', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse('Error', { ok: false, status: 401 }),
      );

      try {
        await provider.getUserInfo(TEST_ACCESS_TOKEN);
        expect.fail('Should have thrown OAuthError');
      } catch (error) {
        expect((error as OAuthError).name).toBe('OAuthError');
        expect((error as OAuthError).provider).toBe('google');
      }
    });

    it('should include error code in thrown OAuthError', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse('Error', { ok: false, status: 401 }),
      );

      try {
        await provider.getUserInfo(TEST_ACCESS_TOKEN);
        expect.fail('Should have thrown OAuthError');
      } catch (error) {
        expect((error as OAuthError).name).toBe('OAuthError');
        expect((error as OAuthError).code).toBe('USERINFO_FAILED');
      }
    });

    it('should handle 401 unauthorized errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse('Invalid token', { ok: false, status: 401 }),
      );

      await expect(provider.getUserInfo(TEST_ACCESS_TOKEN)).rejects.toMatchObject({
        name: 'OAuthError',
      });
    });

    it('should handle 403 forbidden errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse('Insufficient permissions', { ok: false, status: 403 }),
      );

      await expect(provider.getUserInfo(TEST_ACCESS_TOKEN)).rejects.toMatchObject({
        name: 'OAuthError',
      });
    });

    it('should handle 500 server errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        createMockResponse('Server error', { ok: false, status: 500 }),
      );

      await expect(provider.getUserInfo(TEST_ACCESS_TOKEN)).rejects.toMatchObject({
        name: 'OAuthError',
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network failure'));

      await expect(provider.getUserInfo(TEST_ACCESS_TOKEN)).rejects.toThrow('Network failure');
    });

    it('should handle JSON parsing errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Malformed JSON')),
        text: vi.fn().mockResolvedValue('Not JSON'),
      } as unknown as Response);

      await expect(provider.getUserInfo(TEST_ACCESS_TOKEN)).rejects.toThrow('Malformed JSON');
    });
  });

  describe('edge cases', () => {
    it('should handle empty access token', async () => {
      const mockUserInfo = createMockUserInfo();
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      await provider.getUserInfo('');

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = fetchCall?.[1]?.headers as Record<string, string>;

      expect(headers['Authorization']).toBe('Bearer ');
    });

    it('should handle very long access tokens', async () => {
      const longToken = 'a'.repeat(10000);
      const mockUserInfo = createMockUserInfo();
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      await provider.getUserInfo(longToken);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = fetchCall?.[1]?.headers as Record<string, string>;

      expect(headers['Authorization']).toBe(`Bearer ${longToken}`);
    });

    it('should handle access tokens with special characters', async () => {
      const specialToken = 'token.with-special_chars/+=';
      const mockUserInfo = createMockUserInfo();
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      await provider.getUserInfo(specialToken);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = fetchCall?.[1]?.headers as Record<string, string>;

      expect(headers['Authorization']).toBe(`Bearer ${specialToken}`);
    });

    it('should handle very long user IDs', async () => {
      const longId = '9'.repeat(100);
      const mockUserInfo = createMockUserInfo({ id: longId });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.id).toBe(longId);
    });

    it('should handle very long email addresses', async () => {
      const longLocalPart = 'a'.repeat(64);
      const longEmail = `${longLocalPart}@example.com`;
      const mockUserInfo = createMockUserInfo({ email: longEmail });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.email).toBe(longEmail);
    });

    it('should handle very long names', async () => {
      const longName = 'A'.repeat(500);
      const mockUserInfo = createMockUserInfo({ name: longName });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.name).toBe(longName);
    });

    it('should handle names with special characters', async () => {
      const specialName = "Test O'Connor-Smith (Sr.) 名前";
      const mockUserInfo = createMockUserInfo({ name: specialName });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.name).toBe(specialName);
    });

    it('should handle email addresses with plus addressing', async () => {
      const emailWithPlus = 'user+tag@gmail.com';
      const mockUserInfo = createMockUserInfo({ email: emailWithPlus });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.email).toBe(emailWithPlus);
    });

    it('should handle international domain names in email', async () => {
      const internationalEmail = 'user@münchen.de';
      const mockUserInfo = createMockUserInfo({ email: internationalEmail });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.email).toBe(internationalEmail);
    });

    it('should handle boolean verified_email correctly when true', async () => {
      const mockUserInfo = createMockUserInfo({ verified_email: true });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.emailVerified).toBe(true);
    });

    it('should handle boolean verified_email correctly when false', async () => {
      const mockUserInfo = createMockUserInfo({ verified_email: false });
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse(mockUserInfo));

      const result = await provider.getUserInfo(TEST_ACCESS_TOKEN);

      expect(result.emailVerified).toBe(false);
    });
  });
});
