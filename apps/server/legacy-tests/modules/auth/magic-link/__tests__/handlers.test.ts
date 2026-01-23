// apps/server/src/modules/auth/magic-link/__tests__/handlers.test.ts
import { InvalidTokenError } from '@abe-stack/core';
import { handleMagicLinkRequest, handleMagicLinkVerify } from '@auth/magic-link/handlers';
import { requestMagicLink, verifyMagicLink } from '@auth/magic-link/service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '@shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@auth/magic-link/service', () => ({
  requestMagicLink: vi.fn(),
  verifyMagicLink: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): AppContext {
  return {
    db: {
      execute: vi.fn().mockResolvedValue(0),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      raw: vi.fn().mockResolvedValue([]),
    } as AppContext['db'],
    repos: {} as AppContext['repos'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    : {
      auth: {
        strategies: ['magic'],
        jwt: {
          secret: 'test-secret-32-characters-long!!',
          accessTokenExpiry: '15m',
        },
        argon2: {},
        refreshToken: {
          expiryDays: 7,
        },
        cookie: {
          name: 'refreshToken',
          secret: 'test-secret',
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        },
        magicLink: {
          tokenExpiryMinutes: 15,
          maxAttempts: 3,
        },
      },
      server: {
        port: 8080,
        appBaseUrl: 'http://localhost:8080',
      },
    } as AppContext[''],
    log: {
      error: vi.fn(),
    } as unknown as AppContext['log'],
    pubsub: {} as AppContext['pubsub'],
    cache: {} as AppContext['cache'],
  } as unknown as AppContext;
}

function createMockRequest(overrides?: Partial<RequestWithCookies>): RequestWithCookies {
  return {
    headers: {},
    cookies: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
    ...overrides,
  };
}

function createMockReply(): ReplyWithCookies {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

// ============================================================================
// Tests: handleMagicLinkRequest
// ============================================================================

describe('Magic Link Handlers', () => {
  let mockCtx: AppContext;
  let mockRequest: RequestWithCookies;
  let mockReply: ReplyWithCookies;

  beforeEach(() => {
    mockCtx = createMockContext();
    mockRequest = createMockRequest();
    mockReply = createMockReply();
    vi.clearAllMocks();
  });

  describe('handleMagicLinkRequest', () => {
    test('should return success when magic link is created', async () => {
      const body = {
        email: 'test@example.com',
        returnUrl: '/dashboard',
      };

      vi.mocked(requestMagicLink).mockResolvedValue({
        success: true,
        message: 'If an account exists with this email, a magic link has been sent.',
      });

      const result = await handleMagicLinkRequest(mockCtx, body, mockRequest);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        success: true,
        message: 'If an account exists with this email, a magic link has been sent.',
      });
      expect(requestMagicLink).toHaveBeenCalledWith(
        mockCtx.db,
        mockCtx.repos,
        mockCtx.email,
        'test@example.com',
        mockCtx..server.appBaseUrl,
        '127.0.0.1',
        'test-agent',
        {
          tokenExpiryMinutes: mockCtx..auth.magicLink.tokenExpiryMinutes,
          maxAttemptsPerEmail: mockCtx..auth.magicLink.maxAttempts,
        },
      );
    });

    test('should return error when email is missing', async () => {
      const body = {
        returnUrl: '/dashboard',
      } as unknown as { email: string; returnUrl?: string };

      const result = await handleMagicLinkRequest(mockCtx, body, mockRequest);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: 'Email is required' });
    });

    test('should return error when email is invalid', async () => {
      const body = {
        email: 'invalid-email',
        returnUrl: '/dashboard',
      };

      const result = await handleMagicLinkRequest(mockCtx, body, mockRequest);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: 'Invalid email format' });
    });

    test('should return error when service throws', async () => {
      const body = {
        email: 'test@example.com',
        returnUrl: '/dashboard',
      };

      vi.mocked(requestMagicLink).mockRejectedValue(new Error('Service error'));

      const result = await handleMagicLinkRequest(mockCtx, body, mockRequest);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: 'Internal server error' });
    });
  });

  describe('handleMagicLinkVerify', () => {
    test('should return success when token is valid', async () => {
      const body = {
        token: 'valid-token',
      };

      vi.mocked(verifyMagicLink).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: null,
          avatarUrl: null,
          role: 'user',
          createdAt: new Date().toISOString(),
        },
      });

      const result = await handleMagicLinkVerify(mockCtx, body, mockRequest, mockReply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        token: 'access-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: null,
          avatarUrl: null,
          role: 'user',
          createdAt: expect.any(String),
        },
      });
      expect(verifyMagicLink).toHaveBeenCalledWith(mockCtx.db, mockCtx.repos, mockCtx..auth, 'valid-token');
    });

    test('should return error when token is missing', async () => {
      const body = { token: '' };

      vi.mocked(verifyMagicLink).mockRejectedValue(new InvalidTokenError('Invalid or expired magic link'));

      const result = await handleMagicLinkVerify(mockCtx, body, mockRequest, mockReply);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: 'Invalid or expired magic link' });
    });

    test('should return error when token is invalid', async () => {
      const body = {
        token: 'invalid-token',
      };

      vi.mocked(verifyMagicLink).mockRejectedValue(new InvalidTokenError('Invalid or expired token'));

      const result = await handleMagicLinkVerify(mockCtx, body, mockRequest, mockReply);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: 'Invalid or expired token' });
    });

    test('should return error when service throws', async () => {
      const body = {
        token: 'some-token',
      };

      vi.mocked(verifyMagicLink).mockRejectedValue(new Error('Service error'));

      const result = await handleMagicLinkVerify(mockCtx, body, mockRequest, mockReply);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: 'Internal server error' });
    });
  });
});
