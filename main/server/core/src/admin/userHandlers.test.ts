// main/server/core/src/admin/userHandlers.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  handleGetUser,
  handleHardBan,
  handleListUsers,
  handleLockUser,
  handleUnlockUser,
  handleUpdateUser,
} from './userHandlers';
import * as userService from './userService';

import type { AdminAppContext, AdminRequest } from './types';
import type { HttpReply, HttpRequest } from '../../../system/src';
import type { AdminUser } from '@bslt/shared';

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

// Mock @bslt/shared to export our MockUserNotFoundError
// This ensures the handler's instanceof check works with our mock
vi.mock('@bslt/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bslt/shared')>();
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
  hardBanUser: vi.fn(),
  searchUsers: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    emailVerified: true,
    emailVerifiedAt: '2024-01-01T00:00:00.000Z',
    lockedUntil: null,
    lockReason: null,
    failedLoginAttempts: 0,
    phone: null,
    phoneVerified: false,
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
    email: { send: vi.fn(), healthCheck: vi.fn() },
    storage: {
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
      getSignedUrl: vi.fn(),
    },
    pubsub: {},
    cache: {},
    billing: {
      provider: 'stripe' as const,
      createCustomer: vi.fn(),
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn(),
      resumeSubscription: vi.fn(),
      updateSubscription: vi.fn(),
      getSubscription: vi.fn(),
      createSetupIntent: vi.fn(),
      listPaymentMethods: vi.fn(),
      attachPaymentMethod: vi.fn(),
      detachPaymentMethod: vi.fn(),
      setDefaultPaymentMethod: vi.fn(),
      listInvoices: vi.fn(),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      archivePrice: vi.fn(),
      verifyWebhookSignature: vi.fn(),
      parseWebhookEvent: vi.fn(),
      createCustomerPortalSession: vi.fn(),
    } as unknown,
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
    errorTracker: {
      captureError: vi.fn(),
      addBreadcrumb: vi.fn(),
      setUserContext: vi.fn(),
    },
  } as AdminAppContext;
}

function createMockRequest(
  overrides: Partial<AdminRequest> = {},
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): AdminRequest & HttpRequest {
  return {
    cookies: {},
    headers: {},
    user: { userId: 'admin-123', email: 'admin@example.com', role: 'admin' },
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    params,
    query,
    ...overrides,
  } as unknown as AdminRequest & HttpRequest;
}

function createUnauthenticatedRequest(
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): AdminRequest & HttpRequest {
  return {
    cookies: {},
    headers: {},
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    params,
    query,
  } as unknown as AdminRequest & HttpRequest;
}

function createMockReply(): HttpReply {
  return {} as HttpReply;
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
      const req = createUnauthenticatedRequest();
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
      const req = createUnauthenticatedRequest({ id: 'user-123' });
      const result = await handleGetUser(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(401);
    });
  });

  describe('handleUpdateUser', () => {
    test('should return 200 with updated user', async () => {
      const mockUser = createMockAdminUser({ firstName: 'Updated', lastName: 'Name' });
      vi.mocked(userService.updateUser).mockResolvedValue(mockUser);

      const req = createMockRequest({}, { id: 'user-123' });
      const result = await handleUpdateUser(
        mockCtx,
        { firstName: 'Updated', lastName: 'Name' },
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
      const result = await handleUpdateUser(mockCtx, { firstName: 'Test' }, req, createMockReply());

      expect(result.status).toBe(404);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createUnauthenticatedRequest({ id: 'user-123' });
      const result = await handleUpdateUser(mockCtx, { firstName: 'Test' }, req, createMockReply());

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
      const req = createUnauthenticatedRequest({ id: 'user-123' });
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
      const req = createUnauthenticatedRequest({ id: 'user-123' });
      const result = await handleUnlockUser(
        mockCtx,
        { email: '', reason: 'Test' },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(401);
    });
  });

  describe('handleHardBan', () => {
    function createSudoRequest(
      overrides: Partial<AdminRequest> = {},
      params: Record<string, string> = {},
    ): AdminRequest & HttpRequest {
      return createMockRequest(
        {
          headers: { 'x-sudo-token': 'valid-sudo-token' },
          ...overrides,
        } as unknown as Partial<AdminRequest>,
        params,
      );
    }

    test('should return 200 with ban result', async () => {
      const gracePeriodEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      vi.mocked(userService.hardBanUser).mockResolvedValue({
        message: 'User has been permanently banned',
        gracePeriodEnds,
      });

      const req = createSudoRequest({}, { id: 'user-123' });
      const result = await handleHardBan(
        mockCtx,
        { reason: 'Severe ToS violation' },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(200);
      expect('body' in result && 'gracePeriodEnds' in result.body).toBe(true);
    });

    test('should return 403 when sudo token is missing', async () => {
      const req = createMockRequest({}, { id: 'user-123' });
      const result = await handleHardBan(
        mockCtx,
        { reason: 'Severe ToS violation' },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(403);
    });

    test('should return 400 when trying to ban self', async () => {
      const req = createSudoRequest(
        { user: { userId: 'user-123', email: 'admin@example.com', role: 'admin' } },
        { id: 'user-123' },
      );
      const result = await handleHardBan(mockCtx, { reason: 'Test' }, req, createMockReply());

      expect(result.status).toBe(400);
      expect('body' in result && 'message' in result.body).toBe(true);
      expect((result.body as { message: string }).message).toBe('Cannot ban your own account');
    });

    test('should return 404 when user not found', async () => {
      vi.mocked(userService.hardBanUser).mockRejectedValue(
        new MockUserNotFoundError('User not found'),
      );

      const req = createSudoRequest({}, { id: 'nonexistent' });
      const result = await handleHardBan(mockCtx, { reason: 'Test' }, req, createMockReply());

      expect(result.status).toBe(404);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createUnauthenticatedRequest({ id: 'user-123' });
      const result = await handleHardBan(mockCtx, { reason: 'Test' }, req, createMockReply());

      expect(result.status).toBe(401);
    });

    test('should pass correct parameters to hardBanUser', async () => {
      const gracePeriodEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      vi.mocked(userService.hardBanUser).mockResolvedValue({
        message: 'User has been permanently banned',
        gracePeriodEnds,
      });

      const req = createSudoRequest({}, { id: 'target-user' });
      await handleHardBan(mockCtx, { reason: 'Spam and abuse' }, req, createMockReply());

      expect(userService.hardBanUser).toHaveBeenCalledWith(
        mockCtx.db,
        mockCtx.repos.users,
        'target-user',
        'admin-123',
        'Spam and abuse',
        expect.objectContaining({ emailService: mockCtx.email }),
      );
    });
  });
});
