// main/server/core/src/auth/handlers/logout.test.ts
/**
 * Logout Handler Tests
 *
 * Comprehensive tests for user logout via HTTP-only refresh token cookie.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { REFRESH_COOKIE_NAME } from '../index';

import { handleLogout } from './logout';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Create mock functions via vi.hoisted to be available before vi.mock hoisting
const { mockLogoutUser, mockClearRefreshTokenCookie, mockMapErrorToResponse } = vi.hoisted(() => ({
  mockLogoutUser: vi.fn(),
  mockClearRefreshTokenCookie: vi.fn(),
  // Error mapper that uses error.name instead of instanceof (avoids ESM module boundary issues)
  mockMapErrorToResponse: vi.fn((error: unknown, ctx: { log: { error: (e: unknown) => void } }) => {
    ctx.log.error(error);
    return { status: 500, body: { message: 'Internal server error' } };
  }),
}));

// Mock the service module
vi.mock('../service', () => ({
  logoutUser: mockLogoutUser,
}));

vi.mock('../utils', () => ({
  clearRefreshTokenCookie: mockClearRefreshTokenCookie,
}));

// Mock @shared to provide working mapErrorToResponse
vi.mock('@bslt/shared', async (importOriginal) => {
  const original = await importOriginal<typeof import('@bslt/shared')>();
  return {
    ...original,
    mapErrorToResponse: mockMapErrorToResponse,
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
    repos: {} as AppContext['repos'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    config: {} as AppContext['config'],
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

function createMockRequest(cookies: Record<string, string | undefined> = {}): RequestWithCookies {
  return {
    cookies,
    headers: { 'user-agent': 'Test Browser' },
    ip: '127.0.0.1',
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
    },
  } as RequestWithCookies;
}

// ============================================================================
// Tests: handleLogout
// ============================================================================

describe('handleLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful logout', () => {
    test('should return 200 with success message on logout', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-refresh-token' });
      const reply = createMockReply();

      mockLogoutUser.mockResolvedValue(undefined);

      const result = await handleLogout(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ message: 'Logged out successfully' });
    });

    test('should call logoutUser with refresh token from cookie', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'test-refresh-token-123' });
      const reply = createMockReply();

      mockLogoutUser.mockResolvedValue(undefined);

      await handleLogout(ctx, request, reply);

      expect(mockLogoutUser).toHaveBeenCalledWith(ctx.db, ctx.repos, 'test-refresh-token-123');
    });

    test('should clear refresh token cookie on successful logout', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-refresh-token' });
      const reply = createMockReply();

      mockLogoutUser.mockResolvedValue(undefined);

      await handleLogout(ctx, request, reply);

      expect(mockClearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    });

    test('should handle logout when no refresh token cookie exists', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({});
      const reply = createMockReply();

      mockLogoutUser.mockResolvedValue(undefined);

      const result = await handleLogout(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(mockLogoutUser).toHaveBeenCalledWith(ctx.db, ctx.repos, undefined);
      expect(mockClearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    });

    test('should handle logout with undefined cookie value', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: undefined });
      const reply = createMockReply();

      mockLogoutUser.mockResolvedValue(undefined);

      const result = await handleLogout(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(mockLogoutUser).toHaveBeenCalledWith(ctx.db, ctx.repos, undefined);
    });
  });

  describe('error handling', () => {
    test('should return 500 for database errors', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-refresh-token' });
      const reply = createMockReply();

      mockLogoutUser.mockRejectedValue(new Error('Database connection failed'));

      const result = await handleLogout(ctx, request, reply);

      expect(result.status).toBe(500);
      expect((result.body as { message: string }).message).toBe('Internal server error');
    });

    test('should not clear cookie when logoutUser fails', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-refresh-token' });
      const reply = createMockReply();

      mockLogoutUser.mockRejectedValue(new Error('Database error'));

      await handleLogout(ctx, request, reply);

      expect(mockClearRefreshTokenCookie).not.toHaveBeenCalled();
    });

    test('should handle unexpected error types', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-refresh-token' });
      const reply = createMockReply();

      mockLogoutUser.mockRejectedValue('String error');

      const result = await handleLogout(ctx, request, reply);

      expect(result.status).toBe(500);
      expect((result.body as { message: string }).message).toBe('Internal server error');
    });
  });

  describe('cookie handling', () => {
    test('should read refresh token from correct cookie name', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        [REFRESH_COOKIE_NAME]: 'correct-token',
        otherCookie: 'other-value',
      });
      const reply = createMockReply();

      mockLogoutUser.mockResolvedValue(undefined);

      await handleLogout(ctx, request, reply);

      expect(mockLogoutUser).toHaveBeenCalledWith(ctx.db, ctx.repos, 'correct-token');
    });

    test('should handle empty string refresh token', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: '' });
      const reply = createMockReply();

      mockLogoutUser.mockResolvedValue(undefined);

      const result = await handleLogout(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(mockLogoutUser).toHaveBeenCalledWith(ctx.db, ctx.repos, '');
    });
  });
});
