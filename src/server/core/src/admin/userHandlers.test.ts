// backend/core/src/admin/userHandlers.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  handleGetUser,
  handleListUsers,
  handleLockUser,
  handleUnlockUser,
  handleUpdateUser,
} from './userHandlers';
import * as userService from './userService';

import type { AdminAppContext, AdminRequest } from './types';
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
// Mocks - use relative path to match vitest module resolution
// ============================================================================

// Use vi.hoisted to ensure the mock class is defined before vi.mock runs
const { MockUserNotFoundError } = vi.hoisted(() => {
  class MockUserNotFoundError extends Error {
    constructor(message: string = 'User not found') {
      super(message);
      this.name = 'UserNotFoundError';
    }
  }
  return { MockUserNotFoundError };
});

// Mock @abe-stack/shared to export our MockUserNotFoundError
// This ensures the handler's instanceof check works with our mock
vi.mock('@abe-stack/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...actual,
    UserNotFoundError: MockUserNotFoundError,
  };
});

vi.mock('./userService', () => ({
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

function createMockContext(): AdminAppContext {
  return {
    config: {} as AdminAppContext['config'],
    db: {} as AdminAppContext['db'],
    repos: {
      users: {} as AdminAppContext['repos']['users'],
    } as AdminAppContext['repos'],
    email: { send: vi.fn() },
    storage: {
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
      getSignedUrl: vi.fn(),
    },
    pubsub: {},
    cache: {},
    billing: {
      createCheckoutSession: vi.fn(),
      createCustomerPortalSession: vi.fn(),
      getSubscription: vi.fn(),
      cancelSubscription: vi.fn(),
    },
    notifications: {
      isConfigured: vi.fn().mockReturnValue(false),
    },
    queue: {},
    write: {},
    search: {},
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  } as AdminAppContext;
}

function createMockRequest(
  overrides: Partial<AdminRequest> = {},
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): AdminRequest & FastifyRequest {
  return {
    cookies: {},
    headers: {},
    user: { userId: 'admin-123', email: 'admin@example.com', role: 'admin' },
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    params,
    query,
    ...overrides,
  } as unknown as AdminRequest & FastifyRequest;
}

function createMockReply(): FastifyReply {
  return {} as FastifyReply;
}

// ============================================================================
// Tests
// ============================================================================

describe('Admin User Handlers', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  describe('handleListUsers', () => {
    test('should return 200 with user list', async () => {
      const mockUsers = [createMockAdminUser(), createMockAdminUser({ id: 'user-456' })];
      vi.mocked(userService.listUsers).mockResolvedValue({
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
      vi.mocked(userService.listUsers).mockResolvedValue({
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

      expect(userService.listUsers).toHaveBeenCalledWith(
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
      const mockUser = createMockAdminUser();
      vi.mocked(userService.getUserById).mockResolvedValue(mockUser);

      const req = createMockRequest({}, { id: 'user-123' });
      const result = await handleGetUser(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(200);
      expect('body' in result && 'id' in result.body).toBe(true);
    });

    test('should return 404 when user not found', async () => {
      vi.mocked(userService.getUserById).mockRejectedValue(
        new MockUserNotFoundError('User not found'),
      );

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
      const mockUser = createMockAdminUser({ name: 'Updated Name' });
      vi.mocked(userService.updateUser).mockResolvedValue(mockUser);

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
      vi.mocked(userService.updateUser).mockRejectedValue(
        new MockUserNotFoundError('User not found'),
      );

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
      const mockUser = createMockAdminUser({ lockedUntil: '2099-12-31T23:59:59.999Z' });
      vi.mocked(userService.lockUser).mockResolvedValue(mockUser);

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
      vi.mocked(userService.lockUser).mockRejectedValue(
        new MockUserNotFoundError('User not found'),
      );

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
      const mockUser = createMockAdminUser({ lockedUntil: null });
      vi.mocked(userService.unlockUser).mockResolvedValue(mockUser);

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
      vi.mocked(userService.unlockUser).mockRejectedValue(
        new MockUserNotFoundError('User not found'),
      );

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
