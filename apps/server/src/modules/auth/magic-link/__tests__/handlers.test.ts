// apps/server/src/modules/auth/magic-link/__tests__/handlers.test.ts
/**
 * Magic Link Handlers Unit Tests
 *
 * Tests the HTTP handlers for magic link authentication.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { EmailSendError, InvalidTokenError, TooManyRequestsError } from '@abe-stack/core';

import { handleMagicLinkRequest, handleMagicLinkVerify } from '../handlers';
import { requestMagicLink, verifyMagicLink } from '../service';
import { setRefreshTokenCookie } from '../../utils';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '@shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('../service', () => ({
  requestMagicLink: vi.fn(),
  verifyMagicLink: vi.fn(),
}));

vi.mock('../../utils', () => ({
  setRefreshTokenCookie: vi.fn(),
}));

// Mock @shared to provide mapErrorToResponse and error classes
vi.mock('@shared', async () => {
  const actual = await vi.importActual('@shared');
  return {
    ...actual,
    mapErrorToResponse: vi.fn((error: Error, _ctx: unknown) => {
      // Simulate mapErrorToResponse behavior for test error types
      if (error.name === 'TooManyRequestsError') {
        return { status: 429, body: { message: error.message, code: 'TOO_MANY_REQUESTS' } };
      }
      if (error.name === 'InvalidTokenError') {
        return { status: 401, body: { message: error.message, code: 'INVALID_TOKEN' } };
      }
      return { status: 500, body: { message: 'Internal server error' } };
    }),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): AppContext {
  return {
    db: {} as AppContext['db'],
    email: {} as AppContext['email'],
    config: {
      server: {
        appBaseUrl: 'http://localhost:5173',
      },
      auth: {
        jwt: {
          secret: 'test-secret',
          accessTokenExpiry: '15m',
        },
        refreshToken: {
          expiryDays: 7,
        },
      },
    } as AppContext['config'],
    storage: {} as AppContext['storage'],
    pubsub: {} as AppContext['pubsub'],
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(() => createMockContext().log),
    },
  } as unknown as AppContext;
}

function createMockRequest(options: Partial<RequestWithCookies> = {}): RequestWithCookies {
  return {
    cookies: {},
    headers: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Test)',
    },
    ...options,
  } as RequestWithCookies;
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

describe('handleMagicLinkRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return success response when magic link is sent', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const body = { email: 'test@example.com' };

    vi.mocked(requestMagicLink).mockResolvedValue({
      success: true,
      message: 'If an account exists with this email, a magic link has been sent.',
    });

    const result = await handleMagicLinkRequest(ctx, body, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      message: 'If an account exists with this email, a magic link has been sent.',
    });

    expect(requestMagicLink).toHaveBeenCalledWith(
      ctx.db,
      ctx.email,
      'test@example.com',
      'http://localhost:5173',
      '127.0.0.1',
      'Mozilla/5.0 (Test)',
    );
  });

  test('should return success even when email fails (to prevent enumeration)', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const body = { email: 'test@example.com' };

    vi.mocked(requestMagicLink).mockRejectedValue(
      new EmailSendError('Failed to send', new Error('SMTP error')),
    );

    const result = await handleMagicLinkRequest(ctx, body, request);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(ctx.log.error).toHaveBeenCalled();
  });

  test('should return error for rate limiting', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const body = { email: 'test@example.com' };

    vi.mocked(requestMagicLink).mockRejectedValue(
      new TooManyRequestsError('Too many requests', 3600),
    );

    const result = await handleMagicLinkRequest(ctx, body, request);

    expect(result.status).toBe(429);
    expect(result.body.message).toContain('Too many');
  });
});

// ============================================================================
// Tests: handleMagicLinkVerify
// ============================================================================

describe('handleMagicLinkVerify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return auth response on successful verification', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const reply = createMockReply();
    const body = { token: 'valid-magic-link-token' };

    const mockAuthResult = {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
      },
    };

    vi.mocked(verifyMagicLink).mockResolvedValue(mockAuthResult);

    const result = await handleMagicLinkVerify(ctx, body, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      token: 'access-token-123',
      user: mockAuthResult.user,
    });

    expect(verifyMagicLink).toHaveBeenCalledWith(ctx.db, ctx.config.auth, 'valid-magic-link-token');
    expect(setRefreshTokenCookie).toHaveBeenCalledWith(reply, 'refresh-token-123', ctx.config.auth);
  });

  test('should return error for invalid token', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const reply = createMockReply();
    const body = { token: 'invalid-token' };

    vi.mocked(verifyMagicLink).mockRejectedValue(
      new InvalidTokenError('Invalid or expired magic link'),
    );

    const result = await handleMagicLinkVerify(ctx, body, request, reply);

    expect(result.status).toBe(401);
    expect(result.body.message).toContain('Invalid');
  });

  test('should return error for expired token', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const reply = createMockReply();
    const body = { token: 'expired-token' };

    vi.mocked(verifyMagicLink).mockRejectedValue(
      new InvalidTokenError('Invalid or expired magic link'),
    );

    const result = await handleMagicLinkVerify(ctx, body, request, reply);

    expect(result.status).toBe(401);
  });
});
