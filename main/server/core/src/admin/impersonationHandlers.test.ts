// main/server/core/src/admin/impersonationHandlers.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import * as impersonationService from './impersonation';
import { handleEndImpersonation, handleStartImpersonation } from './impersonationHandlers';

import type { AdminAppContext, AdminRequest } from './types';
import type { HttpReply, HttpRequest } from '../../../system/src';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('./impersonation', () => ({
  startImpersonation: vi.fn(),
  endImpersonation: vi.fn(),
  ImpersonationForbiddenError: class ImpersonationForbiddenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ImpersonationForbiddenError';
    }
  },
  ImpersonationRateLimitError: class ImpersonationRateLimitError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ImpersonationRateLimitError';
    }
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): AdminAppContext {
  return {
    config: {
      billing: {},
      auth: { jwt: { secret: 'test-secret-that-is-at-least-32-characters-long' } },
    } as unknown as AdminAppContext['config'],
    db: {} as AdminAppContext['db'],
    repos: {
      users: {} as AdminAppContext['repos']['users'],
      auditEvents: {
        create: vi.fn().mockResolvedValue({}),
      },
    } as unknown as AdminAppContext['repos'],
    email: { send: vi.fn(), healthCheck: vi.fn() },
    storage: {
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
      getSignedUrl: vi.fn(),
    },
    pubsub: {},
    cache: {},
    billing: {} as unknown,
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

describe('Impersonation Handlers', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // handleStartImpersonation
  // ==========================================================================

  describe('handleStartImpersonation', () => {
    test('should return 200 with impersonation result on success', async () => {
      const mockResult = {
        token: 'impersonation-jwt-token',
        expiresAt: '2026-02-11T12:00:00.000Z',
        targetUser: {
          id: 'target-1',
          email: 'target@test.com',
          username: 'target',
          firstName: 'Target',
          lastName: 'User',
          role: 'user' as const,
          emailVerified: true,
          emailVerifiedAt: '2024-01-01T00:00:00.000Z',
          lockedUntil: null,
          lockReason: null,
          failedLoginAttempts: 0,
          phone: null,
          phoneVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      vi.mocked(impersonationService.startImpersonation).mockResolvedValue(mockResult);

      const req = createMockRequest({}, { userId: 'target-1' });
      const result = await handleStartImpersonation(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(200);
      expect('body' in result && 'token' in result.body).toBe(true);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createUnauthenticatedRequest({ userId: 'target-1' });
      const result = await handleStartImpersonation(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(401);
    });

    test('should return 400 when target userId is empty', async () => {
      const req = createMockRequest({}, { userId: '' });
      const result = await handleStartImpersonation(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(400);
      expect((result.body as { message: string }).message).toBe('Target user ID is required');
    });

    test('should return 403 when ImpersonationForbiddenError is thrown', async () => {
      vi.mocked(impersonationService.startImpersonation).mockRejectedValue(
        new impersonationService.ImpersonationForbiddenError('Cannot impersonate admin users'),
      );

      const req = createMockRequest({}, { userId: 'admin-2' });
      const result = await handleStartImpersonation(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(403);
      expect((result.body as { message: string }).message).toBe('Cannot impersonate admin users');
    });

    test('should return 429 when ImpersonationRateLimitError is thrown', async () => {
      vi.mocked(impersonationService.startImpersonation).mockRejectedValue(
        new impersonationService.ImpersonationRateLimitError('Rate limit exceeded'),
      );

      const req = createMockRequest({}, { userId: 'target-1' });
      const result = await handleStartImpersonation(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(429);
      expect((result.body as { message: string }).message).toBe('Rate limit exceeded');
    });

    test('should return 500 on unexpected error', async () => {
      vi.mocked(impersonationService.startImpersonation).mockRejectedValue(
        new Error('Database error'),
      );

      const req = createMockRequest({}, { userId: 'target-1' });
      const result = await handleStartImpersonation(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(500);
    });

    test('should return 500 when JWT secret is not available', async () => {
      // Override config to remove auth.jwt.secret
      mockCtx = {
        ...mockCtx,
        config: { billing: {} } as unknown as AdminAppContext['config'],
      };

      const req = createMockRequest({}, { userId: 'target-1' });
      const result = await handleStartImpersonation(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(500);
    });

    test('should pass audit logger that uses repos.auditEvents', async () => {
      const mockResult = {
        token: 'token',
        expiresAt: '2026-02-11T12:00:00.000Z',
        targetUser: {
          id: 'target-1',
          email: 'target@test.com',
          username: 'target',
          firstName: 'Target',
          lastName: 'User',
          role: 'user' as const,
          emailVerified: true,
          emailVerifiedAt: null,
          lockedUntil: null,
          lockReason: null,
          failedLoginAttempts: 0,
          phone: null,
          phoneVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      vi.mocked(impersonationService.startImpersonation).mockResolvedValue(mockResult);

      const req = createMockRequest({}, { userId: 'target-1' });
      await handleStartImpersonation(mockCtx, undefined, req, createMockReply());

      // Verify startImpersonation was called with the correct parameters
      expect(impersonationService.startImpersonation).toHaveBeenCalledWith(
        mockCtx.repos,
        'admin-123',
        'target-1',
        { jwtSecret: 'test-secret-that-is-at-least-32-characters-long' },
        expect.any(Function),
      );
    });
  });

  // ==========================================================================
  // handleEndImpersonation
  // ==========================================================================

  describe('handleEndImpersonation', () => {
    test('should return 200 with end result on success', async () => {
      vi.mocked(impersonationService.endImpersonation).mockResolvedValue({
        message: 'Impersonation session ended',
      });

      const req = createMockRequest();
      const result = await handleEndImpersonation(
        mockCtx,
        { targetUserId: 'target-1' },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(200);
      expect((result.body as { message: string }).message).toBe('Impersonation session ended');
    });

    test('should accept targetUserId from query params', async () => {
      vi.mocked(impersonationService.endImpersonation).mockResolvedValue({
        message: 'Impersonation session ended',
      });

      const req = createMockRequest({}, {}, { targetUserId: 'target-1' });
      const result = await handleEndImpersonation(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(200);
    });

    test('should return 401 when not authenticated', async () => {
      const req = createUnauthenticatedRequest();
      const result = await handleEndImpersonation(
        mockCtx,
        { targetUserId: 'target-1' },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(401);
    });

    test('should return 400 when targetUserId is missing', async () => {
      const req = createMockRequest();
      const result = await handleEndImpersonation(mockCtx, undefined, req, createMockReply());

      expect(result.status).toBe(400);
      expect((result.body as { message: string }).message).toBe('targetUserId is required');
    });

    test('should return 400 when targetUserId is empty string', async () => {
      const req = createMockRequest();
      const result = await handleEndImpersonation(
        mockCtx,
        { targetUserId: '' },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(400);
    });

    test('should return 500 on unexpected error', async () => {
      vi.mocked(impersonationService.endImpersonation).mockRejectedValue(
        new Error('Database error'),
      );

      const req = createMockRequest();
      const result = await handleEndImpersonation(
        mockCtx,
        { targetUserId: 'target-1' },
        req,
        createMockReply(),
      );

      expect(result.status).toBe(500);
    });

    test('should log audit event via repos on success', async () => {
      vi.mocked(impersonationService.endImpersonation).mockResolvedValue({
        message: 'Impersonation session ended',
      });

      const req = createMockRequest();
      await handleEndImpersonation(mockCtx, { targetUserId: 'target-1' }, req, createMockReply());

      expect(impersonationService.endImpersonation).toHaveBeenCalledWith(
        'admin-123',
        'target-1',
        expect.any(Function),
      );
    });
  });
});
