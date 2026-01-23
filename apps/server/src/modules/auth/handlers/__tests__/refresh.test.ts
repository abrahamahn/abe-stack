// apps/server/src/modules/auth/handlers/__tests__/refresh.test.ts
/**
 * Refresh Handler Tests
 *
 * Comprehensive tests for token refresh using HTTP-only cookie.
 */

import { refreshUserTokens } from '@auth/service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '@auth/utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleRefresh } from '../refresh';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '@shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@auth/service', () => ({
  refreshUserTokens: vi.fn(),
}));

vi.mock('@auth/utils', () => ({
  setRefreshTokenCookie: vi.fn(),
  clearRefreshTokenCookie: vi.fn(),
}));

vi.mock('@auth/security', () => ({
  sendTokenReuseAlert: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocking
import { sendTokenReuseAlert } from '@auth/security';
import { ERROR_MESSAGES, InvalidTokenError, TokenReuseError } from '@shared';
import { REFRESH_COOKIE_NAME } from '@shared/constants';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
    repos: {} as AppContext['repos'],
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
        lockout: {
          maxAttempts: 5,
          windowMs: 900000,
          lockoutDurationMs: 1800000,
        },
      },
      server: {
        port: 8080,
        appBaseUrl: 'http://localhost:8080',
      },
    },
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
  cookies?: Record<string, string | undefined>,
  requestInfo?: Partial<RequestWithCookies['requestInfo']>,
): RequestWithCookies {
  return {
    cookies: cookies || {},
    headers: { 'user-agent': 'Test Browser' },
    ip: '127.0.0.1',
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
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

  describe('successful refresh', () => {
    test('should return 200 with new access token on successful refresh', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'old-refresh-token' });
      const reply = createMockReply();

      const mockRefreshResult = {
        accessToken: 'new-access-token-123',
        refreshToken: 'new-refresh-token-456',
      };

      vi.mocked(refreshUserTokens).mockResolvedValue(mockRefreshResult);

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        token: 'new-access-token-123',
      });
    });

    test('should call refreshUserTokens with correct parameters', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'old-refresh-token' },
        { ipAddress: '192.168.1.100', userAgent: 'Mozilla/5.0' },
      );
      const reply = createMockReply();

      const mockRefreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      vi.mocked(refreshUserTokens).mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(refreshUserTokens).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        ctx.config.auth,
        'old-refresh-token',
        '192.168.1.100',
        'Mozilla/5.0',
      );
    });

    test('should set new refresh token cookie on successful refresh', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'old-token' });
      const reply = createMockReply();

      const mockRefreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token-789',
      };

      vi.mocked(refreshUserTokens).mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(setRefreshTokenCookie).toHaveBeenCalledWith(
        reply,
        'new-refresh-token-789',
        ctx.config.auth,
      );
    });

    test('should not clear cookie on successful refresh', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
      const reply = createMockReply();

      const mockRefreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      vi.mocked(refreshUserTokens).mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(clearRefreshTokenCookie).not.toHaveBeenCalled();
    });
  });

  describe('missing refresh token', () => {
    test('should return 401 when refresh token cookie is missing', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({});
      const reply = createMockReply();

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        message: ERROR_MESSAGES.NO_REFRESH_TOKEN,
      });
    });

    test('should return 401 when refresh token cookie is undefined', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: undefined });
      const reply = createMockReply();

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        message: ERROR_MESSAGES.NO_REFRESH_TOKEN,
      });
    });

    test('should not call refreshUserTokens when token is missing', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({});
      const reply = createMockReply();

      await handleRefresh(ctx, request, reply);

      expect(refreshUserTokens).not.toHaveBeenCalled();
    });

    test('should not set or clear cookies when token is missing', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({});
      const reply = createMockReply();

      await handleRefresh(ctx, request, reply);

      expect(setRefreshTokenCookie).not.toHaveBeenCalled();
      expect(clearRefreshTokenCookie).not.toHaveBeenCalled();
    });
  });

  describe('invalid token error', () => {
    test('should return 401 and clear cookie for invalid token', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'invalid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new InvalidTokenError());

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        message: ERROR_MESSAGES.INVALID_TOKEN,
      });
    });

    test('should clear refresh token cookie on invalid token', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'invalid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new InvalidTokenError());

      await handleRefresh(ctx, request, reply);

      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    });

    test('should not set new cookie on invalid token', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'invalid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new InvalidTokenError());

      await handleRefresh(ctx, request, reply);

      expect(setRefreshTokenCookie).not.toHaveBeenCalled();
    });
  });

  describe('token reuse error', () => {
    test('should return 401 and clear cookie for token reuse', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'reused-token' });
      const reply = createMockReply();

      const tokenReuseError = new TokenReuseError(
        'user-123',
        'user@example.com',
        'family-id-789',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      vi.mocked(refreshUserTokens).mockRejectedValue(tokenReuseError);

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        message: ERROR_MESSAGES.INVALID_TOKEN,
      });
    });

    test('should clear refresh token cookie on token reuse', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'reused-token' });
      const reply = createMockReply();

      const tokenReuseError = new TokenReuseError('user-123', 'user@example.com', 'family-id-789');

      vi.mocked(refreshUserTokens).mockRejectedValue(tokenReuseError);

      await handleRefresh(ctx, request, reply);

      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    });

    test('should send security alert email when email is present', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'reused-token' },
        { ipAddress: '10.0.0.1', userAgent: 'Chrome Browser' },
      );
      const reply = createMockReply();

      const tokenReuseError = new TokenReuseError(
        'user-123',
        'user@example.com',
        'family-id-789',
        '192.168.1.1',
        'Firefox Browser',
      );

      vi.mocked(refreshUserTokens).mockRejectedValue(tokenReuseError);

      await handleRefresh(ctx, request, reply);

      // Wait for fire-and-forget email to be initiated
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(sendTokenReuseAlert).toHaveBeenCalledWith(ctx.email, {
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Firefox Browser',
        timestamp: expect.any(Date),
      });
    });

    test('should use request IP/UA if error does not contain them', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'reused-token' },
        { ipAddress: '10.0.0.1', userAgent: 'Chrome Browser' },
      );
      const reply = createMockReply();

      const tokenReuseError = new TokenReuseError(
        'user-123',
        'user@example.com',
        'family-id-789',
        undefined,
        undefined,
      );

      vi.mocked(refreshUserTokens).mockRejectedValue(tokenReuseError);

      await handleRefresh(ctx, request, reply);

      // Wait for fire-and-forget email
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(sendTokenReuseAlert).toHaveBeenCalledWith(ctx.email, {
        email: 'user@example.com',
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome Browser',
        timestamp: expect.any(Date),
      });
    });

    test('should not send email when error does not contain email', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'reused-token' });
      const reply = createMockReply();

      const tokenReuseError = new TokenReuseError('user-123', undefined, 'family-id-789');

      vi.mocked(refreshUserTokens).mockRejectedValue(tokenReuseError);

      await handleRefresh(ctx, request, reply);

      // Wait to ensure email is not sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(sendTokenReuseAlert).not.toHaveBeenCalled();
    });

    test('should continue processing if email sending fails', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'reused-token' });
      const reply = createMockReply();

      const tokenReuseError = new TokenReuseError('user-123', 'user@example.com', 'family-id-789');

      vi.mocked(refreshUserTokens).mockRejectedValue(tokenReuseError);
      vi.mocked(sendTokenReuseAlert).mockRejectedValue(new Error('Email service down'));

      const result = await handleRefresh(ctx, request, reply);

      // Wait for fire-and-forget to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should still return 401 even if email fails
      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        message: ERROR_MESSAGES.INVALID_TOKEN,
      });
    });

    test('should log error when email sending fails', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'reused-token' });
      const reply = createMockReply();

      const tokenReuseError = new TokenReuseError('user-123', 'user@example.com', 'family-id-789');

      const emailError = new Error('SMTP connection failed');
      vi.mocked(refreshUserTokens).mockRejectedValue(tokenReuseError);
      vi.mocked(sendTokenReuseAlert).mockRejectedValue(emailError);

      await handleRefresh(ctx, request, reply);

      // Wait for fire-and-forget to complete and error to be logged
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(ctx.log.error).toHaveBeenCalledWith(
        {
          err: emailError,
          userId: 'user-123',
          email: 'user@example.com',
        },
        'Failed to send token reuse alert email',
      );
    });

    test('should handle non-Error email failures', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'reused-token' });
      const reply = createMockReply();

      const tokenReuseError = new TokenReuseError('user-123', 'user@example.com', 'family-id-789');

      vi.mocked(refreshUserTokens).mockRejectedValue(tokenReuseError);
      vi.mocked(sendTokenReuseAlert).mockRejectedValue('String error message');

      await handleRefresh(ctx, request, reply);

      // Wait for fire-and-forget to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(ctx.log.error).toHaveBeenCalledWith(
        {
          err: new Error('String error message'),
          userId: 'user-123',
          email: 'user@example.com',
        },
        'Failed to send token reuse alert email',
      );
    });
  });

  describe('other errors', () => {
    test('should return 500 for unexpected errors', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new Error('Database connection failed'));

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({
        message: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    });

    test('should not clear cookie on unexpected errors', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new Error('Unexpected error'));

      await handleRefresh(ctx, request, reply);

      expect(clearRefreshTokenCookie).not.toHaveBeenCalled();
    });

    test('should not set new cookie on unexpected errors', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new Error('Unexpected error'));

      await handleRefresh(ctx, request, reply);

      expect(setRefreshTokenCookie).not.toHaveBeenCalled();
    });
  });

  describe('request info extraction', () => {
    test('should use IP address from requestInfo', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'valid-token' },
        { ipAddress: '203.0.113.10' },
      );
      const reply = createMockReply();

      const mockRefreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      vi.mocked(refreshUserTokens).mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(refreshUserTokens).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        '203.0.113.10',
        expect.anything(),
      );
    });

    test('should use user agent from requestInfo', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'valid-token' },
        { userAgent: 'Safari/14.0' },
      );
      const reply = createMockReply();

      const mockRefreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      vi.mocked(refreshUserTokens).mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(refreshUserTokens).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'Safari/14.0',
      );
    });

    test('should handle undefined user agent', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'valid-token' },
        { userAgent: undefined },
      );
      const reply = createMockReply();

      const mockRefreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      vi.mocked(refreshUserTokens).mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(refreshUserTokens).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        undefined,
      );
    });
  });

  describe('edge cases', () => {
    test('should handle empty string refresh token as missing', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: '' });
      const reply = createMockReply();

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        message: ERROR_MESSAGES.NO_REFRESH_TOKEN,
      });
      expect(refreshUserTokens).not.toHaveBeenCalled();
    });

    test('should handle whitespace-only refresh token as valid', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: '   ' });
      const reply = createMockReply();

      vi.mocked(refreshUserTokens).mockRejectedValue(new InvalidTokenError());

      await handleRefresh(ctx, request, reply);

      // Should attempt to process the token (not treat as missing)
      expect(refreshUserTokens).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        '   ',
        expect.anything(),
        expect.anything(),
      );
    });

    test('should handle very long refresh token', async () => {
      const ctx = createMockContext();
      const longToken = 'a'.repeat(5000);
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: longToken });
      const reply = createMockReply();

      const mockRefreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      vi.mocked(refreshUserTokens).mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(refreshUserTokens).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        longToken,
        expect.anything(),
        expect.anything(),
      );
    });

    test('should handle various IP address formats', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(
        { [REFRESH_COOKIE_NAME]: 'valid-token' },
        { ipAddress: '::1' }, // IPv6 loopback
      );
      const reply = createMockReply();

      const mockRefreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      vi.mocked(refreshUserTokens).mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(refreshUserTokens).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        '::1',
        expect.anything(),
      );
    });
  });
});
