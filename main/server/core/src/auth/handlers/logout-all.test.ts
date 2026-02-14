// main/server/core/src/auth/handlers/logout-all.test.ts
/**
 * Logout All Devices Handler Tests
 *
 * Comprehensive tests for logging out from all devices by revoking all refresh tokens.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { clearRefreshTokenCookie, revokeAllUserTokens } from '../utils';

import { handleLogoutAll } from './logout-all';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('../utils', () => ({
  clearRefreshTokenCookie: vi.fn(),
  revokeAllUserTokens: vi.fn(),
}));

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

function createMockRequest(user?: RequestWithCookies['user']): RequestWithCookies {
  return {
    cookies: {},
    headers: { 'user-agent': 'Test Browser' },
    ip: '127.0.0.1',
    ...(user !== undefined ? { user } : {}),
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
    },
  } as RequestWithCookies;
}

// ============================================================================
// Tests: handleLogoutAll
// ============================================================================

describe('handleLogoutAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful logout all', () => {
    test('should return 200 with success message', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
      const reply = createMockReply();

      vi.mocked(revokeAllUserTokens).mockResolvedValue(undefined);

      const result = await handleLogoutAll(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ message: 'Logged out from all devices' });
    });

    test('should call revokeAllUserTokens with user ID from request', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
      const reply = createMockReply();

      vi.mocked(revokeAllUserTokens).mockResolvedValue(undefined);

      await handleLogoutAll(ctx, request, reply);

      expect(revokeAllUserTokens).toHaveBeenCalledWith(ctx.db, 'user-123');
    });

    test('should clear refresh token cookie on successful logout', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
      const reply = createMockReply();

      vi.mocked(revokeAllUserTokens).mockResolvedValue(undefined);

      await handleLogoutAll(ctx, request, reply);

      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    });

    test('should handle admin user logout all', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        userId: 'admin-456',
        email: 'admin@example.com',
        role: 'admin',
      });
      const reply = createMockReply();

      vi.mocked(revokeAllUserTokens).mockResolvedValue(undefined);

      const result = await handleLogoutAll(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(revokeAllUserTokens).toHaveBeenCalledWith(ctx.db, 'admin-456');
    });
  });

  describe('unauthorized access', () => {
    test('should return 401 when user is not authenticated', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(undefined);
      const reply = createMockReply();

      const result = await handleLogoutAll(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: 'Unauthorized' });
    });

    test('should return 401 when userId is undefined', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        userId: undefined as unknown as string,
        email: 'test@example.com',
        role: 'user',
      });
      const reply = createMockReply();

      const result = await handleLogoutAll(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ message: 'Unauthorized' });
    });

    test('should not call revokeAllUserTokens when unauthorized', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(undefined);
      const reply = createMockReply();

      await handleLogoutAll(ctx, request, reply);

      expect(revokeAllUserTokens).not.toHaveBeenCalled();
    });

    test('should not clear cookie when unauthorized', async () => {
      const ctx = createMockContext();
      const request = createMockRequest(undefined);
      const reply = createMockReply();

      await handleLogoutAll(ctx, request, reply);

      expect(clearRefreshTokenCookie).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should return 500 for database errors', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
      const reply = createMockReply();

      vi.mocked(revokeAllUserTokens).mockRejectedValue(new Error('Database connection failed'));

      const result = await handleLogoutAll(ctx, request, reply);

      expect(result.status).toBe(500);
      expect((result.body as { message: string }).message).toBe('Internal server error');
    });

    test('should not clear cookie when revokeAllUserTokens fails', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
      const reply = createMockReply();

      vi.mocked(revokeAllUserTokens).mockRejectedValue(new Error('Database error'));

      await handleLogoutAll(ctx, request, reply);

      expect(clearRefreshTokenCookie).not.toHaveBeenCalled();
    });

    test('should handle unexpected error types', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
      const reply = createMockReply();

      vi.mocked(revokeAllUserTokens).mockRejectedValue({ code: 'UNKNOWN_ERROR' });

      const result = await handleLogoutAll(ctx, request, reply);

      expect(result.status).toBe(500);
      expect((result.body as { message: string }).message).toBe('Internal server error');
    });

    test('should handle null rejection', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
      const reply = createMockReply();

      vi.mocked(revokeAllUserTokens).mockRejectedValue(null);

      const result = await handleLogoutAll(ctx, request, reply);

      expect(result.status).toBe(500);
    });
  });

  describe('user context', () => {
    test('should handle user with only required fields', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        userId: 'minimal-user',
        email: 'minimal@example.com',
        role: 'user',
      });
      const reply = createMockReply();

      vi.mocked(revokeAllUserTokens).mockResolvedValue(undefined);

      const result = await handleLogoutAll(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(revokeAllUserTokens).toHaveBeenCalledWith(ctx.db, 'minimal-user');
    });

    test('should use correct user ID regardless of email or role', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({
        userId: 'specific-user-id',
        email: 'different@example.com',
        role: 'admin',
      });
      const reply = createMockReply();

      vi.mocked(revokeAllUserTokens).mockResolvedValue(undefined);

      await handleLogoutAll(ctx, request, reply);

      expect(revokeAllUserTokens).toHaveBeenCalledWith(ctx.db, 'specific-user-id');
    });
  });
});
