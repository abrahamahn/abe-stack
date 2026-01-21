// apps/server/src/modules/auth/handlers/__tests__/logout.test.ts
/**
 * Logout Handler Tests
 *
 * Comprehensive tests for user logout via HTTP-only refresh token cookie.
 */

import { logoutUser } from '@auth/service';
import { clearRefreshTokenCookie } from '@auth/utils';
import { REFRESH_COOKIE_NAME } from '@shared/constants';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleLogout } from '../logout';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '@shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@auth/service', () => ({
  logoutUser: vi.fn(),
}));

vi.mock('@auth/utils', () => ({
  clearRefreshTokenCookie: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
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
  };
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

      vi.mocked(logoutUser).mockResolvedValue(undefined);

      const result = await handleLogout(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ message: 'Logged out successfully' });
    });

    test('should call logoutUser with refresh token from cookie', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'test-refresh-token-123' });
      const reply = createMockReply();

      vi.mocked(logoutUser).mockResolvedValue(undefined);

      await handleLogout(ctx, request, reply);

      expect(logoutUser).toHaveBeenCalledWith(ctx.db, 'test-refresh-token-123');
    });

    test('should clear refresh token cookie on successful logout', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-refresh-token' });
      const reply = createMockReply();

      vi.mocked(logoutUser).mockResolvedValue(undefined);

      await handleLogout(ctx, request, reply);

      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    });

    test('should handle logout when no refresh token cookie exists', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({});
      const reply = createMockReply();

      vi.mocked(logoutUser).mockResolvedValue(undefined);

      const result = await handleLogout(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(logoutUser).toHaveBeenCalledWith(ctx.db, undefined);
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    });

    test('should handle logout with undefined cookie value', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: undefined });
      const reply = createMockReply();

      vi.mocked(logoutUser).mockResolvedValue(undefined);

      const result = await handleLogout(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(logoutUser).toHaveBeenCalledWith(ctx.db, undefined);
    });
  });

  describe('error handling', () => {
    test('should return 500 for database errors', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-refresh-token' });
      const reply = createMockReply();

      vi.mocked(logoutUser).mockRejectedValue(new Error('Database connection failed'));

      const result = await handleLogout(ctx, request, reply);

      expect(result.status).toBe(500);
      expect((result.body as { message: string }).message).toBe('Internal server error');
    });

    test('should not clear cookie when logoutUser fails', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-refresh-token' });
      const reply = createMockReply();

      vi.mocked(logoutUser).mockRejectedValue(new Error('Database error'));

      await handleLogout(ctx, request, reply);

      expect(clearRefreshTokenCookie).not.toHaveBeenCalled();
    });

    test('should handle unexpected error types', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-refresh-token' });
      const reply = createMockReply();

      vi.mocked(logoutUser).mockRejectedValue('String error');

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

      vi.mocked(logoutUser).mockResolvedValue(undefined);

      await handleLogout(ctx, request, reply);

      expect(logoutUser).toHaveBeenCalledWith(ctx.db, 'correct-token');
    });

    test('should handle empty string refresh token', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ [REFRESH_COOKIE_NAME]: '' });
      const reply = createMockReply();

      vi.mocked(logoutUser).mockResolvedValue(undefined);

      const result = await handleLogout(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(logoutUser).toHaveBeenCalledWith(ctx.db, '');
    });
  });
});
