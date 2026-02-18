// main/server/core/src/auth/handlers/invalidate-sessions.test.ts
/**
 * Tests for Invalidate Sessions Handler
 *
 * Validates session invalidation by incrementing token version and revoking tokens.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mock Dependencies
// ============================================================================

const { mockMapErrorToHttpResponse, mockClearRefreshTokenCookie, mockRevokeAllUserTokens } =
  vi.hoisted(() => ({
    mockMapErrorToHttpResponse: vi.fn(
      (error: unknown, logger: { error: (context: unknown, message?: string) => void }) => {
        if (error instanceof Error) {
          logger.error(error);
          return { status: 500, body: { message: 'Internal server error' } };
        }
        logger.error(error);
        return { status: 500, body: { message: 'Internal server error' } };
      },
    ),
    mockClearRefreshTokenCookie: vi.fn(),
    mockRevokeAllUserTokens: vi.fn(),
  }));

vi.mock('@bslt/shared', async (importOriginal) => {
  const original = await importOriginal<typeof import('@bslt/shared')>();
  return {
    ...original,
    mapErrorToHttpResponse: mockMapErrorToHttpResponse,
  };
});

vi.mock('../utils', () => ({
  clearRefreshTokenCookie: mockClearRefreshTokenCookie,
  revokeAllUserTokens: mockRevokeAllUserTokens,
}));

import { handleInvalidateSessions } from './invalidate-sessions';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';

// ============================================================================
// Mock Context
// ============================================================================

function createMockCtx(): AppContext {
  return {
    repos: {
      users: {
        incrementTokenVersion: vi.fn(),
        findByEmail: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
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
    db: {} as never,
    email: {} as never,
    emailTemplates: {} as never,
    storage: {} as never,
    pubsub: {} as never,
    config: {
      auth: {} as never,
      server: { appBaseUrl: 'http://localhost:3000' },
    },
  } as unknown as AppContext;
}

function createMockRequest(userId?: string): RequestWithCookies {
  return {
    user: userId !== undefined ? { userId, email: 'test@example.com', role: 'user' } : undefined,
    requestInfo: {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    },
    cookies: {},
    headers: {},
  } as unknown as RequestWithCookies;
}

function createMockReply(): ReplyWithCookies {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
    send: vi.fn(),
    code: vi.fn(),
  } as unknown as ReplyWithCookies;
}

// ============================================================================
// Tests: handleInvalidateSessions
// ============================================================================

describe('handleInvalidateSessions', () => {
  let ctx: AppContext;
  let reply: ReplyWithCookies;

  beforeEach(() => {
    ctx = createMockCtx();
    reply = createMockReply();
    vi.clearAllMocks();
  });

  it('should return 200 and invalidate sessions for authenticated user', async () => {
    vi.mocked(ctx.repos.users.incrementTokenVersion).mockResolvedValue(1);
    mockRevokeAllUserTokens.mockResolvedValue(undefined);

    const result = await handleInvalidateSessions(ctx, createMockRequest('user-1'), reply);

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.message).toBe('All sessions invalidated');
    }
  });

  it('should return 401 when user is not authenticated', async () => {
    const result = await handleInvalidateSessions(ctx, createMockRequest(), reply);

    expect(result.status).toBe(401);
    if (result.status === 401) {
      expect(result.body.message).toBe('Unauthorized');
    }
  });

  it('should return 401 when userId is empty string', async () => {
    const request = createMockRequest('');

    const result = await handleInvalidateSessions(ctx, request, reply);

    expect(result.status).toBe(401);
    if (result.status === 401) {
      expect(result.body.message).toBe('Unauthorized');
    }
  });

  it('should call incrementTokenVersion with correct userId', async () => {
    vi.mocked(ctx.repos.users.incrementTokenVersion).mockResolvedValue(1);
    mockRevokeAllUserTokens.mockResolvedValue(undefined);

    await handleInvalidateSessions(ctx, createMockRequest('user-1'), reply);

    expect(ctx.repos.users.incrementTokenVersion).toHaveBeenCalledWith('user-1');
    expect(ctx.repos.users.incrementTokenVersion).toHaveBeenCalledTimes(1);
  });

  it('should call revokeAllUserTokens with correct db and userId', async () => {
    vi.mocked(ctx.repos.users.incrementTokenVersion).mockResolvedValue(1);
    mockRevokeAllUserTokens.mockResolvedValue(undefined);

    await handleInvalidateSessions(ctx, createMockRequest('user-1'), reply);

    expect(mockRevokeAllUserTokens).toHaveBeenCalledWith(ctx.db, 'user-1');
    expect(mockRevokeAllUserTokens).toHaveBeenCalledTimes(1);
  });

  it('should call clearRefreshTokenCookie with reply', async () => {
    vi.mocked(ctx.repos.users.incrementTokenVersion).mockResolvedValue(1);
    mockRevokeAllUserTokens.mockResolvedValue(undefined);

    await handleInvalidateSessions(ctx, createMockRequest('user-1'), reply);

    expect(mockClearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    expect(mockClearRefreshTokenCookie).toHaveBeenCalledTimes(1);
  });

  it('should return error response when incrementTokenVersion throws', async () => {
    const error = new Error('Database error');
    vi.mocked(ctx.repos.users.incrementTokenVersion).mockRejectedValue(error);

    const result = await handleInvalidateSessions(ctx, createMockRequest('user-1'), reply);

    expect(result.status).toBe(500);
    if (result.status === 500) {
      expect(result.body.message).toBe('Internal server error');
    }
    expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(error, expect.any(Object));
  });

  it('should return error response when revokeAllUserTokens throws', async () => {
    vi.mocked(ctx.repos.users.incrementTokenVersion).mockResolvedValue(1);
    const error = new Error('Token revocation failed');
    mockRevokeAllUserTokens.mockRejectedValue(error);

    const result = await handleInvalidateSessions(ctx, createMockRequest('user-1'), reply);

    expect(result.status).toBe(500);
    if (result.status === 500) {
      expect(result.body.message).toBe('Internal server error');
    }
    expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(error, expect.any(Object));
  });

  it('should not call incrementTokenVersion when user is not authenticated', async () => {
    await handleInvalidateSessions(ctx, createMockRequest(), reply);

    expect(ctx.repos.users.incrementTokenVersion).not.toHaveBeenCalled();
    expect(mockRevokeAllUserTokens).not.toHaveBeenCalled();
    expect(mockClearRefreshTokenCookie).not.toHaveBeenCalled();
  });
});
