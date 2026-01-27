// apps/server/src/modules/admin/__tests__/userHandlers.test.ts
import { UserNotFoundError } from '@abe-stack/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
    handleGetUser,
    handleListUsers,
    handleLockUser,
    handleUnlockUser,
    handleUpdateUser,
} from '../userHandlers';

import type { AppContext, RequestWithCookies } from '@shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

// Define AdminUser type inline to avoid export issues
interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'moderator' | 'admin';
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  lockedUntil: string | null;
  failedLoginAttempts: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../userService.js', () => ({
  listUsers: vi.fn(),
  getUserById: vi.fn(),
  updateUser: vi.fn(),
  lockUser: vi.fn(),
  unlockUser: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    emailVerified: true,
    emailVerifiedAt: '2024-01-01T00:00:00.000Z',
    lockedUntil: null,
    failedLoginAttempts: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockContext(): AppContext {
  return {
    config: {} as AppContext['config'],
    db: {} as AppContext['db'],
    repos: {
      users: {} as AppContext['repos']['users'],
    } as AppContext['repos'],
    email: {} as AppContext['email'],
    storage: {} as AppContext['storage'],
    pubsub: {} as AppContext['pubsub'],
    cache: {} as AppContext['cache'],
    billing: {} as AppContext['billing'],
    notifications: {} as AppContext['notifications'],
    queue: {} as AppContext['queue'],
    write: {} as AppContext['write'],
    search: {} as AppContext['search'],
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as AppContext['log'],
  };
}

function createMockRequest(
  overrides: Partial<RequestWithCookies> = {},
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): RequestWithCookies & FastifyRequest {
  return {
    cookies: {},
    headers: {},
    user: { userId: 'admin-123', email: 'admin@example.com', role: 'admin' },
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    params,
    query,
    ...overrides,
  } as unknown as RequestWithCookies & FastifyRequest;
}

function createMockReply(): FastifyReply {
  return {} as FastifyReply;
}

// ============================================================================
// Tests
// ============================================================================

describe('Admin User Handlers', () => {
  let mockCtx: AppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  describe('handleListUsers', () => {
    test('should return 200 with user list', async () => {
      const { listUsers } = await import('../userService.js');
      const mockUsers = [createMockAdminUser(), createMockAdminUser({ id: 'user-456' })];
      vi.mocked(listUsers).mockResolvedValue({
        data: mockUsers,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const req = createMockRequest({}, {}, { page: '1', limit: '20' });
      const result = await handleListUsers(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(200);
      expect('body' in result && 'data' in result.body).toBe(true);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createMockRequest({ user: undefined });
      const result = await handleListUsers(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(401);
    });

    test('should pass query params as filters', async () => {
      const { listUsers } = await import('../userService.js');
      vi.mocked(listUsers).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      const req = createMockRequest(
        {},
        {},
        { search: 'test', role: 'admin', status: 'active', sortBy: 'email' },
      );
      await handleListUsers(mockCtx, undefined, req, createMockReply());

      expect(listUsers).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          search: 'test',
          role: 'admin',
          status: 'active',
          sortBy: 'email',
        }),
      );
    });
  });

  describe('handleGetUser', () => {
    test('should return 200 with user details', async () => {
      const { getUserById } = await import('../userService.js');
      const mockUser = createMockAdminUser();
      vi.mocked(getUserById).mockResolvedValue(mockUser);

      const req = createMockRequest({}, { id: 'user-123' });
      const result = await handleGetUser(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(200);
      expect('body' in result && 'id' in result.body).toBe(true);
    });

    test('should return 404 when user not found', async () => {
      const { getUserById } = await import('../userService.js');
      vi.mocked(getUserById).mockRejectedValue(new UserNotFoundError('User not found'));

      const req = createMockRequest({}, { id: 'nonexistent' });
      const result = await handleGetUser(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(404);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createMockRequest({ user: undefined }, { id: 'user-123' });
      const result = await handleGetUser(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(401);
    });
  });

  describe('handleUpdateUser', () => {
    test('should return 200 with updated user', async () => {
      const { updateUser } = await import('../userService.js');
      const mockUser = createMockAdminUser({ name: 'Updated Name' });
      vi.mocked(updateUser).mockResolvedValue(mockUser);

      const req = createMockRequest({}, { id: 'user-123' });
      const result = await handleUpdateUser(
        mockCtx,
        { name: 'Updated Name' },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(200);
      expect('body' in result && 'user' in result.body).toBe(true);
    });

    test('should return 404 when user not found', async () => {
      const { updateUser } = await import('../userService.js');
      vi.mocked(updateUser).mockRejectedValue(new UserNotFoundError('User not found'));

      const req = createMockRequest({}, { id: 'nonexistent' });
      const result = await handleUpdateUser(mockCtx, { name: 'Test' }, req, createMockReply());

      expect(result.status).toBe(404);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createMockRequest({ user: undefined }, { id: 'user-123' });
      const result = await handleUpdateUser(mockCtx, { name: 'Test' }, req, createMockReply());

      expect(result.status).toBe(401);
    });
  });

  describe('handleLockUser', () => {
    test('should return 200 with locked user', async () => {
      const { lockUser } = await import('../userService.js');
      const mockUser = createMockAdminUser({ lockedUntil: '2099-12-31T23:59:59.999Z' });
      vi.mocked(lockUser).mockResolvedValue(mockUser);

      const req = createMockRequest({}, { id: 'user-123' });
      const result = await handleLockUser(
        mockCtx,
        { reason: 'Terms violation', durationMinutes: 60 },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(200);
      expect('body' in result && 'user' in result.body).toBe(true);
    });

    test('should return 400 when trying to lock self', async () => {
      const req = createMockRequest(
        { user: { userId: 'user-123', email: 'admin@example.com', role: 'admin' } },
        { id: 'user-123' },
      );
      const result = await handleLockUser(mockCtx, { reason: 'Test' }, req, createMockReply());

      expect(result.status).toBe(400);
    });

    test('should return 404 when user not found', async () => {
      const { lockUser } = await import('../userService.js');
      vi.mocked(lockUser).mockRejectedValue(new UserNotFoundError('User not found'));

      const req = createMockRequest({}, { id: 'nonexistent' });
      const result = await handleLockUser(mockCtx, { reason: 'Test' }, req, createMockReply());

      expect(result.status).toBe(404);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createMockRequest({ user: undefined }, { id: 'user-123' });
      const result = await handleLockUser(mockCtx, { reason: 'Test' }, req, createMockReply());

      expect(result.status).toBe(401);
    });
  });

  describe('handleUnlockUser', () => {
    test('should return 200 with unlocked user', async () => {
      const { unlockUser } = await import('../userService.js');
      const mockUser = createMockAdminUser({ lockedUntil: null });
      vi.mocked(unlockUser).mockResolvedValue(mockUser);

      const req = createMockRequest({}, { id: 'user-123' });
      const result = await handleUnlockUser(
        mockCtx,
        { email: '', reason: 'Identity verified' },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(200);
      expect('body' in result && 'user' in result.body).toBe(true);
    });

    test('should return 404 when user not found', async () => {
      const { unlockUser } = await import('../userService.js');
      vi.mocked(unlockUser).mockRejectedValue(new UserNotFoundError('User not found'));

      const req = createMockRequest({}, { id: 'nonexistent' });
      const result = await handleUnlockUser(
        mockCtx,
        { email: '', reason: 'Test' },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(404);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createMockRequest({ user: undefined }, { id: 'user-123' });
      const result = await handleUnlockUser(
        mockCtx,
        { email: '', reason: 'Test' },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(401);
    });
  });
});
