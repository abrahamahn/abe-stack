// apps/server/src/modules/auth/handlers/__tests__/refresh.test.ts
/**
 * Refresh Handler Tests
 *
 * Comprehensive tests for token refresh using HTTP-only refresh token cookie.
 */

import { refreshUserTokens } from '@auth/service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '@auth/utils';
import { ERROR_MESSAGES, InvalidTokenError, TokenReuseError } from '@shared';
import { REFRESH_COOKIE_NAME } from '@shared/constants';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleRefresh } from '../refresh';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '@shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Use vi.hoisted to create mock function before vi.mock hoisting
const mockSendTokenReuseAlert = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@auth/service', () => ({
  refreshUserTokens: vi.fn(),
}));

vi.mock('@auth/utils', () => ({
  setRefreshTokenCookie: vi.fn(),
  clearRefreshTokenCookie: vi.fn(),
}));

vi.mock('@auth/security', () => ({
  sendTokenReuseAlert: mockSendTokenReuseAlert,
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    config: {
      auth: {
        jwt: {
          secret: 'test-secret-32-characters-long!!',
          accessTokenExpiry: '15m',
        },
        argon2: {},
        refreshToken: {
          expiryDays: 7,
          gracePeriodSeconds: 30,
        },
      },
      server: {
        port: 8080,
        appBaseUrl: 'http://localhost:8080',
      },
    } as AppContext['config'],
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
    },
    storage: {} as AppContext['storage'],
    pubsub: {} as AppContext['pubsub'],
    ...overrides,
  } as unknown as AppContext;
}

function createMockReply(): ReplyWithCookies {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

function createMockRequest(
  cookies: Record<string, string | undefined> = {},
  requestInfo?: Partial<RequestWithCookies['requestInfo']>,
): RequestWithCookies {
  return {
    cookies,
    headers: { authorization: undefined },
    user: undefined,
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      ...requestInfo,
    },
  };
}

// ============================================================================
// Tests: handleRefresh
// ============================================================================

describe('handleRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Cases', () => {
    test('should return 200 with new access token on valid refresh', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-refresh-token' });
      const reply = createMockReply();

      const mockResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      vi.mocked(refreshUserTokens).mockResolvedValue(mockResult);

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ token: 'new-access-token' });
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(
        reply,
        'new-refresh-token',
        ctx.config.auth,
      );
    });

    test('should pass request info to service for token rotation', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'refresh-token' },
        { ipAddress: '192.168.1.100', userAgent: 'Mozilla/5.0' },
      );
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      await handleRefresh(ctx, request, reply);

      expect(refreshUserTokens).toHaveBeenCalledWith(
        ctx.db,
        ctx.config.auth,
        'refresh-token',
        '192.168.1.100',
        'Mozilla/5.0',
      );
    });

    test('should set new refresh token cookie with auth config', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'old-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'rotated-refresh-token',
      });

      await handleRefresh(ctx, request, reply);

      expect(setRefreshTokenCookie).toHaveBeenCalledWith(
        reply,
        'rotated-refresh-token',
        ctx.config.auth,
      );
    });

    test('should handle token rotation with grace period', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'recently-used-token' });
      const reply = createMockReply();

      // Simulating a token that was just rotated but within grace period
      vi.mocked(refreshUserTokens).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'grace-period-token',
      });

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ token: 'new-access-token' });
    });
  });

  describe('Missing Token Cases', () => {
    test('should return 401 when refresh token cookie is missing', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({}); // No cookies
      const reply = createMockReply();

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.NO_REFRESH_TOKEN });
      expect(refreshUserTokens).not.toHaveBeenCalled();
      expect(setRefreshTokenCookie).not.toHaveBeenCalled();
      expect(clearRefreshTokenCookie).not.toHaveBeenCalled();
    });

    test('should return 401 when refresh token cookie is undefined', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: undefined });
      const reply = createMockReply();

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.NO_REFRESH_TOKEN });
    });

    test('should return 401 when cookies object has other cookies but not refresh token', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        sessionId: 'some-session',
        _csrf: 'csrf-token',
      });
      const reply = createMockReply();

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.NO_REFRESH_TOKEN });
    });
  });

  describe('Invalid Token Cases', () => {
    test('should return 401 and clear cookie on invalid token', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'invalid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new InvalidTokenError());

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(reply);
      expect(setRefreshTokenCookie).not.toHaveBeenCalled();
    });

    test('should return 401 and clear cookie on expired token', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'expired-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new InvalidTokenError('Token has expired'));

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    });

    test('should return 401 and clear cookie on malformed token', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'not-a-valid-token-format' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new InvalidTokenError('Malformed token'));

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    });

    test('should return 401 and clear cookie when token family is revoked', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'revoked-family-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(
        new InvalidTokenError('Token family has been revoked'),
      );

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    });
  });

  describe('Token Reuse Detection', () => {
    test('should return 401 and clear cookie on token reuse', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'reused-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(
        new TokenReuseError('user-123', 'test@example.com', 'family-123', '192.168.1.1', 'Mozilla'),
      );

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    });

    test('should send email alert when token reuse is detected with email', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'reused-token' },
        { ipAddress: '10.0.0.1', userAgent: 'Test Agent' },
      );
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(
        new TokenReuseError(
          'user-123',
          'victim@example.com',
          'family-123',
          '192.168.1.1',
          'Mozilla',
        ),
      );

      await handleRefresh(ctx, request, reply);

      // Wait for the fire-and-forget promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockSendTokenReuseAlert).toHaveBeenCalledWith(ctx.email, {
        email: 'victim@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla',
        timestamp: expect.any(Date),
      });
    });

    test('should use request IP/UA when error does not have them', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'reused-token' },
        { ipAddress: '10.0.0.50', userAgent: 'Safari' },
      );
      const reply = createMockReply();

      // TokenReuseError without IP/UA - should fall back to request info
      vi.mocked(refreshUserTokens).mockRejectedValue(
        new TokenReuseError('user-123', 'user@example.com', 'family-123', undefined, undefined),
      );

      await handleRefresh(ctx, request, reply);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockSendTokenReuseAlert).toHaveBeenCalledWith(ctx.email, {
        email: 'user@example.com',
        ipAddress: '10.0.0.50',
        userAgent: 'Safari',
        timestamp: expect.any(Date),
      });
    });

    test('should not send email when TokenReuseError has no email', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'reused-token' });
      const reply = createMockReply();

      // TokenReuseError without email - can happen if token lookup fails
      vi.mocked(refreshUserTokens).mockRejectedValue(
        new TokenReuseError('user-123', undefined, 'family-123'),
      );

      const result = await handleRefresh(ctx, request, reply);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockSendTokenReuseAlert).not.toHaveBeenCalled();
      expect(result.status).toBe(401);
    });

    test('should log error when email sending fails but still return 401', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'reused-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(
        new TokenReuseError('user-123', 'user@example.com', 'family-123'),
      );
      mockSendTokenReuseAlert.mockRejectedValue(new Error('SMTP failed'));

      const result = await handleRefresh(ctx, request, reply);

      // Wait for the fire-and-forget promise to reject and be caught
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(result.status).toBe(401);
      expect(ctx.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.any(Error),
          userId: 'user-123',
          email: 'user@example.com',
        }),
        'Failed to send token reuse alert email',
      );
    });

    test('should not block response while sending email', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'reused-token' });
      const reply = createMockReply();

      // Create a slow email service
      let emailResolved = false;
      mockSendTokenReuseAlert.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              emailResolved = true;
              resolve();
            }, 100);
          }),
      );

      vi.mocked(refreshUserTokens).mockRejectedValue(
        new TokenReuseError('user-123', 'user@example.com', 'family-123'),
      );

      const result = await handleRefresh(ctx, request, reply);

      // Response should be returned immediately, email not yet resolved
      expect(result.status).toBe(401);
      expect(emailResolved).toBe(false);

      // Wait for email to complete
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(emailResolved).toBe(true);
    });
  });

  describe('Error Cases', () => {
    test('should return 500 on database error', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new Error('Database connection failed'));

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
      expect(ctx.log.error).toHaveBeenCalled();
    });

    test('should return 500 on JWT signing error', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new Error('JWT signing failed'));

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    });

    test('should return 500 on unexpected error', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new Error('Unexpected error'));

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    });

    test('should not clear cookie on non-InvalidTokenError errors', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new Error('Database error'));

      await handleRefresh(ctx, request, reply);

      expect(clearRefreshTokenCookie).not.toHaveBeenCalled();
    });
  });

  describe('Request Info Edge Cases', () => {
    test('should handle missing user agent', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'valid-token' },
        { ipAddress: '127.0.0.1', userAgent: undefined },
      );
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(refreshUserTokens).toHaveBeenCalledWith(
        ctx.db,
        ctx.config.auth,
        'valid-token',
        '127.0.0.1',
        undefined,
      );
    });

    test('should handle IPv6 address', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'valid-token' },
        { ipAddress: '::1', userAgent: 'test-agent' },
      );
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(refreshUserTokens).toHaveBeenCalledWith(
        ctx.db,
        ctx.config.auth,
        'valid-token',
        '::1',
        'test-agent',
      );
    });

    test('should handle proxied IP address', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'valid-token' },
        { ipAddress: '203.0.113.195', userAgent: 'Mobile Safari' },
      );
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(refreshUserTokens).toHaveBeenCalledWith(
        ctx.db,
        ctx.config.auth,
        'valid-token',
        '203.0.113.195',
        'Mobile Safari',
      );
    });
  });

  describe('Token Format Edge Cases', () => {
    test('should handle very long refresh token', async () => {
      const ctx = createMockContext();
      const longToken = 'a'.repeat(512); // 512 character token
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: longToken });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(refreshUserTokens).toHaveBeenCalledWith(
        ctx.db,
        ctx.config.auth,
        longToken,
        expect.any(String),
        expect.any(String),
      );
    });

    test('should handle hex-encoded refresh token', async () => {
      const ctx = createMockContext();
      const hexToken = 'deadbeef'.repeat(16); // 128 character hex string
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: hexToken });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(200);
    });

    test('should handle base64-encoded refresh token', async () => {
      const ctx = createMockContext();
      const base64Token = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=';
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: base64Token });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(200);
    });

    test('should handle empty string token as missing', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: '' });
      const reply = createMockReply();

      const result = await handleRefresh(ctx, request, reply);

      // Empty string is falsy, so it should be treated as missing
      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.NO_REFRESH_TOKEN });
    });
  });

  describe('Response Structure', () => {
    test('should return RefreshResponse type with token field', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockResolvedValue({
        accessToken: 'jwt-access-token-here',
        refreshToken: 'new-refresh-token',
      });

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('token');
      expect((result.body as { token: string }).token).toBe('jwt-access-token-here');
    });

    test('should not expose refresh token in response body', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'should-not-be-in-body',
      });

      const result = await handleRefresh(ctx, request, reply);

      expect(result.body).not.toHaveProperty('refreshToken');
      // Refresh token should only be set via cookie
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(
        reply,
        'should-not-be-in-body',
        ctx.config.auth,
      );
    });
  });
});
