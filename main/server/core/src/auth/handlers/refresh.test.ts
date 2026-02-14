// main/server/core/src/auth/handlers/refresh.test.ts
/**
 * Refresh Handler Tests
 *
 * Comprehensive tests for token refresh using HTTP-only cookie.
 */

import {
    AUTH_ERROR_MESSAGES as ERROR_MESSAGES,
    InvalidTokenError,
    TokenReuseError,
} from '@abe-stack/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { REFRESH_COOKIE_NAME } from '../types';

import { handleRefresh } from './refresh';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Create mock functions via vi.hoisted to be available before vi.mock hoisting
const {
  mockRefreshUserTokens,
  mockSetRefreshTokenCookie,
  mockClearRefreshTokenCookie,
  mockSendTokenReuseAlert,
  mockMapErrorToResponse,
} = vi.hoisted(() => ({
  mockRefreshUserTokens: vi.fn(),
  mockSetRefreshTokenCookie: vi.fn(),
  mockClearRefreshTokenCookie: vi.fn(),
  mockSendTokenReuseAlert: vi.fn().mockResolvedValue(undefined),
  // Error mapper that uses error.name instead of instanceof (avoids ESM module boundary issues)
  mockMapErrorToResponse: vi.fn(
    (error: unknown, logger: { error: (context: unknown, message?: string) => void }) => {
      if (error instanceof Error) {
        switch (error.name) {
          case 'InvalidTokenError':
            return {
              status: 401,
              body: { message: error.message !== '' ? error.message : 'Invalid or expired token' },
            };
          case 'TokenReuseError':
            return { status: 401, body: { message: 'Token has already been used' } };
          default:
            logger.error(error);
            return { status: 500, body: { message: 'Internal server error' } };
        }
      }
      logger.error(error);
      return { status: 500, body: { message: 'Internal server error' } };
    },
  ),
}));

// Mock the service module
vi.mock('../service', () => ({
  refreshUserTokens: mockRefreshUserTokens,
}));

vi.mock('../utils', () => ({
  setRefreshTokenCookie: mockSetRefreshTokenCookie,
  clearRefreshTokenCookie: mockClearRefreshTokenCookie,
}));

vi.mock('../security', () => ({
  sendTokenReuseAlert: mockSendTokenReuseAlert,
}));

vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual<typeof import('../../../../db/src')>('@abe-stack/db');
  return {
    ...actual,
  };
});

// Mock @abe-stack/shared to intercept mapErrorToHttpResponse
vi.mock('@abe-stack/shared', async (importOriginal) => {
  const original = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...original,
    mapErrorToHttpResponse: mockMapErrorToResponse,
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
    repos: {
      refreshTokens: {
        findByToken: vi.fn().mockResolvedValue(null),
      },
    } as unknown as AppContext['repos'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    emailTemplates: {
      emailVerification: vi.fn(() => ({
        subject: 'Verify your email',
        text: 'verify',
        html: '<p>verify</p>',
      })),
      existingAccountRegistrationAttempt: vi.fn(() => ({
        subject: 'Registration attempt',
        text: 'reg',
        html: '<p>reg</p>',
      })),
      passwordReset: vi.fn(() => ({
        subject: 'Reset your password',
        text: 'reset',
        html: '<p>reset</p>',
      })),
      magicLink: vi.fn(() => ({ subject: 'Login link', text: 'login', html: '<p>login</p>' })),
      accountLocked: vi.fn(() => ({
        subject: 'Account locked',
        text: 'locked',
        html: '<p>locked</p>',
      })),
    },
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
    cookies: cookies ?? {},
    headers: { 'user-agent': 'Test Browser' },
    ip: '127.0.0.1',
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
      ...requestInfo,
    },
  } as RequestWithCookies;
}

// ============================================================================
// Tests: handleRefresh
// ============================================================================

describe('handleRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendTokenReuseAlert.mockResolvedValue(undefined);
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

      mockRefreshUserTokens.mockResolvedValue(mockRefreshResult);

      const result = await handleRefresh(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        token: 'new-access-token-123',
      });
      expect(result.body).not.toHaveProperty('ok');
      expect(result.body).not.toHaveProperty('success');
      expect(result.body).not.toHaveProperty('data');
      expect(result.body).not.toHaveProperty('accessToken');
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

      mockRefreshUserTokens.mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(mockRefreshUserTokens).toHaveBeenCalledWith(
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

      mockRefreshUserTokens.mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(mockSetRefreshTokenCookie).toHaveBeenCalledWith(
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

      mockRefreshUserTokens.mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(mockClearRefreshTokenCookie).not.toHaveBeenCalled();
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

      expect(mockRefreshUserTokens).not.toHaveBeenCalled();
    });

    test('should not set or clear cookies when token is missing', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({});
      const reply = createMockReply();

      await handleRefresh(ctx, request, reply);

      expect(mockSetRefreshTokenCookie).not.toHaveBeenCalled();
      expect(mockClearRefreshTokenCookie).not.toHaveBeenCalled();
    });
  });

  describe('invalid token error', () => {
    test('should return 401 and clear cookie for invalid token', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'invalid-token' });
      const reply = createMockReply();

      mockRefreshUserTokens.mockRejectedValue(new InvalidTokenError());

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

      mockRefreshUserTokens.mockRejectedValue(new InvalidTokenError());

      await handleRefresh(ctx, request, reply);

      expect(mockClearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    });

    test('should not set new cookie on invalid token', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'invalid-token' });
      const reply = createMockReply();

      mockRefreshUserTokens.mockRejectedValue(new InvalidTokenError());

      await handleRefresh(ctx, request, reply);

      expect(mockSetRefreshTokenCookie).not.toHaveBeenCalled();
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

      mockRefreshUserTokens.mockRejectedValue(tokenReuseError);

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

      mockRefreshUserTokens.mockRejectedValue(tokenReuseError);

      await handleRefresh(ctx, request, reply);

      expect(mockClearRefreshTokenCookie).toHaveBeenCalledWith(reply);
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

      mockRefreshUserTokens.mockRejectedValue(tokenReuseError);

      await handleRefresh(ctx, request, reply);

      // Wait for fire-and-forget email to be initiated
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSendTokenReuseAlert).toHaveBeenCalledWith(ctx.email, ctx.emailTemplates, {
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

      mockRefreshUserTokens.mockRejectedValue(tokenReuseError);

      await handleRefresh(ctx, request, reply);

      // Wait for fire-and-forget email
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSendTokenReuseAlert).toHaveBeenCalledWith(ctx.email, ctx.emailTemplates, {
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

      mockRefreshUserTokens.mockRejectedValue(tokenReuseError);

      await handleRefresh(ctx, request, reply);

      // Wait to ensure email is not sent
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSendTokenReuseAlert).not.toHaveBeenCalled();
    });

    test('should continue processing if email sending fails', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'reused-token' });
      const reply = createMockReply();

      const tokenReuseError = new TokenReuseError('user-123', 'user@example.com', 'family-id-789');

      mockRefreshUserTokens.mockRejectedValue(tokenReuseError);
      mockSendTokenReuseAlert.mockRejectedValue(new Error('Email service down'));

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
      mockRefreshUserTokens.mockRejectedValue(tokenReuseError);
      mockSendTokenReuseAlert.mockRejectedValue(emailError);

      await handleRefresh(ctx, request, reply);

      // Wait for fire-and-forget to complete and error to be logged
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(ctx.log.error).toHaveBeenCalledWith(
        {
          error: emailError,
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

      mockRefreshUserTokens.mockRejectedValue(tokenReuseError);
      mockSendTokenReuseAlert.mockRejectedValue('String error message');

      await handleRefresh(ctx, request, reply);

      // Wait for fire-and-forget to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(ctx.log.error).toHaveBeenCalledWith(
        {
          error: new Error('String error message'),
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

      mockRefreshUserTokens.mockRejectedValue(new Error('Database connection failed'));

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

      mockRefreshUserTokens.mockRejectedValue(new Error('Unexpected error'));

      await handleRefresh(ctx, request, reply);

      expect(mockClearRefreshTokenCookie).not.toHaveBeenCalled();
    });

    test('should not set new cookie on unexpected errors', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
      const reply = createMockReply();

      mockRefreshUserTokens.mockRejectedValue(new Error('Unexpected error'));

      await handleRefresh(ctx, request, reply);

      expect(mockSetRefreshTokenCookie).not.toHaveBeenCalled();
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

      mockRefreshUserTokens.mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(mockRefreshUserTokens).toHaveBeenCalledWith(
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

      mockRefreshUserTokens.mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(mockRefreshUserTokens).toHaveBeenCalledWith(
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
      const baseRequest = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
      const request: RequestWithCookies = {
        ...baseRequest,
        requestInfo: {
          ipAddress: baseRequest.requestInfo.ipAddress,
        },
      };
      const reply = createMockReply();

      const mockRefreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockRefreshUserTokens.mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(mockRefreshUserTokens).toHaveBeenCalledWith(
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
      expect(mockRefreshUserTokens).not.toHaveBeenCalled();
    });

    test('should handle whitespace-only refresh token as valid', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: '   ' });
      const reply = createMockReply();

      mockRefreshUserTokens.mockRejectedValue(new InvalidTokenError());

      await handleRefresh(ctx, request, reply);

      // Should attempt to process the token (not treat as missing)
      expect(mockRefreshUserTokens).toHaveBeenCalledWith(
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

      mockRefreshUserTokens.mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(mockRefreshUserTokens).toHaveBeenCalledWith(
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

      mockRefreshUserTokens.mockResolvedValue(mockRefreshResult);

      await handleRefresh(ctx, request, reply);

      expect(mockRefreshUserTokens).toHaveBeenCalledWith(
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
