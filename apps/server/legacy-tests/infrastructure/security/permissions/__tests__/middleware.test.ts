// apps/server/src/infrastructure/security/permissions/__tests__/middleware.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createDefaultPermission, createPermissionChecker } from '../checker';
import {
  createPermissionMiddleware,
  createStandalonePermissionGuard,
  getPermissionDenialReason,
  getRecordIdFromParams,
  hasPermission,
} from '../middleware';

import type { PermissionChecker } from '../checker';
import type { PermissionRecord, RecordLoader } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

interface MockRequest {
  user?: {
    userId: string;
    role: 'user' | 'admin';
  };
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  method?: string;
  permissionResult?: {
    allowed: boolean;
    reason?: string;
    matchedRule?: string;
  };
}

interface MockReply {
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

function createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    user: { userId: 'user-1', role: 'user' },
    params: {},
    body: {},
    method: 'GET',
    ...overrides,
  };
}

function createMockReply(): MockReply {
  const reply: MockReply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply;
}

function createMockRecordLoader(records: Map<string, PermissionRecord>): RecordLoader {
  return async (table: string, id: string) => {
    const key = `${table}:${id}`;
    return records.get(key) ?? null;
  };
}

function createTestChecker(records: Map<string, PermissionRecord> = new Map()): PermissionChecker {
  return createPermissionChecker({
    : createDefaultPermission(),
    recordLoader: createMockRecordLoader(records),
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('Permission Middleware', () => {
  describe('createPermissionMiddleware', () => {
    let records: Map<string, PermissionRecord>;
    let checker: PermissionChecker;

    beforeEach(() => {
      records = new Map([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
        ['tasks:task-2', { id: 'task-2', ownerId: 'other-user' }],
      ]);
      checker = createTestChecker(records);
    });

    describe('requireReadPermission', () => {
      test('should allow owner to read record', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.requireReadPermission('tasks');

        const request = createMockRequest({
          params: { id: 'task-1' },
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(reply.status).not.toHaveBeenCalledWith(403);
        expect(request.permissionResult?.allowed).toBe(true);
      });

      test('should deny non-owner from reading record', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.requireReadPermission('tasks');

        const request = createMockRequest({
          params: { id: 'task-2' },
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(reply.status).toHaveBeenCalledWith(403);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Forbidden',
          }),
        );
      });

      test('should allow admin to read any record', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.requireReadPermission('tasks');

        const request = createMockRequest({
          user: { userId: 'admin-1', role: 'admin' },
          params: { id: 'task-2' },
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(reply.status).not.toHaveBeenCalledWith(403);
        expect(request.permissionResult?.allowed).toBe(true);
      });

      test('should reject unauthenticated requests', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.requireReadPermission('tasks');

        const request = createMockRequest({
          user: undefined,
          params: { id: 'task-1' },
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(reply.status).toHaveBeenCalledWith(401);
        expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
      });

      test('should use custom getRecordId function', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.requireReadPermission(
          'tasks',
          (req) => (req.params as Record<string, string>)?.taskId ?? null,
        );

        const request = createMockRequest({
          params: { taskId: 'task-1' },
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(request.permissionResult?.allowed).toBe(true);
      });
    });

    describe('requireWritePermission', () => {
      test('should allow owner to write record', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.requireWritePermission('tasks');

        const request = createMockRequest({
          params: { id: 'task-1' },
          method: 'PUT',
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(reply.status).not.toHaveBeenCalledWith(403);
        expect(request.permissionResult?.allowed).toBe(true);
      });

      test('should deny non-owner from writing record', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.requireWritePermission('tasks');

        const request = createMockRequest({
          params: { id: 'task-2' },
          method: 'PUT',
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(reply.status).toHaveBeenCalledWith(403);
      });

      test('should allow create operation', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.requireWritePermission('tasks', undefined, 'create');

        const request = createMockRequest({
          method: 'POST',
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(request.permissionResult?.allowed).toBe(true);
      });
    });

    describe('requireDeletePermission', () => {
      test('should allow owner to delete record', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.requireDeletePermission('tasks');

        const request = createMockRequest({
          params: { id: 'task-1' },
          method: 'DELETE',
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(request.permissionResult?.allowed).toBe(true);
      });

      test('should deny non-owner from deleting record', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.requireDeletePermission('tasks');

        const request = createMockRequest({
          params: { id: 'task-2' },
          method: 'DELETE',
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(reply.status).toHaveBeenCalledWith(403);
      });
    });

    describe('requireAdminPermission', () => {
      test('should allow admin', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.requireAdminPermission('tasks');

        const request = createMockRequest({
          user: { userId: 'admin-1', role: 'admin' },
          params: { id: 'task-1' },
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(request.permissionResult?.allowed).toBe(true);
      });

      test('should deny non-admin', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.requireAdminPermission('tasks');

        const request = createMockRequest({
          params: { id: 'task-1' },
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(reply.status).toHaveBeenCalledWith(403);
      });
    });

    describe('createPermissionGuard', () => {
      test('should create custom guard', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.createPermissionGuard({
          table: 'tasks',
          permission: 'read',
          getRecordId: (req) => (req.params as Record<string, string>)?.id ?? null,
        });

        const request = createMockRequest({
          params: { id: 'task-1' },
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(request.permissionResult?.allowed).toBe(true);
      });

      test('should handle missing record pointer', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.createPermissionGuard({
          table: '',
          permission: 'read',
        });

        const request = createMockRequest({
          params: {},
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(reply.status).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Bad Request',
          }),
        );
      });
    });

    describe('filterRecordsMiddleware', () => {
      test('should filter to readable records', async () => {
        const middleware = createPermissionMiddleware({ checker });

        const request = createMockRequest();
        const allRecords = [
          { id: 'task-1', ownerId: 'user-1' },
          { id: 'task-2', ownerId: 'other-user' },
        ];

        const filtered = await middleware.filterRecordsMiddleware(
          request as never,
          'tasks',
          allRecords,
        );

        expect(filtered).toHaveLength(1);
        expect(filtered[0]!.id).toBe('task-1');
      });

      test('should return empty array for unauthenticated request', async () => {
        const middleware = createPermissionMiddleware({ checker });

        const request = createMockRequest({ user: undefined });
        const allRecords = [{ id: 'task-1', ownerId: 'user-1' }];

        const filtered = await middleware.filterRecordsMiddleware(
          request as never,
          'tasks',
          allRecords,
        );

        expect(filtered).toHaveLength(0);
      });
    });

    describe('Custom error handler', () => {
      test('should use custom onDenied handler', async () => {
        const customOnDenied = vi.fn();
        const middleware = createPermissionMiddleware({
          checker,
          onDenied: customOnDenied,
        });
        const handler = middleware.requireReadPermission('tasks');

        const request = createMockRequest({
          params: { id: 'task-2' },
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(customOnDenied).toHaveBeenCalledWith(request, reply, expect.any(String));
      });
    });

    describe('Record pointer extraction', () => {
      test('should extract from params', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.createPermissionGuard({
          table: '',
          permission: 'read',
        });

        const request = createMockRequest({
          params: { table: 'tasks', id: 'task-1' },
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(request.permissionResult?.allowed).toBe(true);
      });

      test('should extract from body', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.createPermissionGuard({
          table: '',
          permission: 'read',
        });

        const request = createMockRequest({
          params: {},
          body: { table: 'tasks', id: 'task-1' },
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(request.permissionResult?.allowed).toBe(true);
      });

      test('should use recordId param alias', async () => {
        const middleware = createPermissionMiddleware({ checker });
        const handler = middleware.createPermissionGuard({
          table: '',
          permission: 'read',
        });

        const request = createMockRequest({
          params: { table: 'tasks', recordId: 'task-1' },
        });
        const reply = createMockReply();

        await handler(request as never, reply as never);

        expect(request.permissionResult?.allowed).toBe(true);
      });
    });
  });

  describe('createStandalonePermissionGuard', () => {
    let records: Map<string, PermissionRecord>;
    let checker: PermissionChecker;

    beforeEach(() => {
      records = new Map([['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }]]);
      checker = createTestChecker(records);
    });

    test('should create standalone guard', async () => {
      const guard = createStandalonePermissionGuard(checker, {
        permission: 'read',
        table: 'tasks',
        getRecordId: (req) => (req.params as Record<string, string>)?.id ?? null,
      });

      const request = createMockRequest({
        params: { id: 'task-1' },
      });
      const reply = createMockReply();

      await guard(request as never, reply as never);

      expect(request.permissionResult?.allowed).toBe(true);
    });

    test('should reject unauthenticated', async () => {
      const guard = createStandalonePermissionGuard(checker, {
        permission: 'read',
        table: 'tasks',
        getRecordId: () => 'task-1',
      });

      const request = createMockRequest({ user: undefined });
      const reply = createMockReply();

      await guard(request as never, reply as never);

      expect(reply.status).toHaveBeenCalledWith(401);
    });

    test('should reject missing record ID for non-create', async () => {
      const guard = createStandalonePermissionGuard(checker, {
        permission: 'read',
        table: 'tasks',
        getRecordId: () => null,
      });

      const request = createMockRequest();
      const reply = createMockReply();

      await guard(request as never, reply as never);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Record ID required',
        }),
      );
    });

    test('should use custom onDenied', async () => {
      records.set('tasks:task-2', { id: 'task-2', ownerId: 'other' });
      checker = createTestChecker(records);

      const customOnDenied = vi.fn();
      const guard = createStandalonePermissionGuard(checker, {
        permission: 'read',
        table: 'tasks',
        getRecordId: () => 'task-2',
        onDenied: customOnDenied,
      });

      const request = createMockRequest();
      const reply = createMockReply();

      await guard(request as never, reply as never);

      expect(customOnDenied).toHaveBeenCalled();
    });
  });

  describe('Helper functions', () => {
    describe('hasPermission', () => {
      test('should return true when allowed', () => {
        const request = createMockRequest({
          permissionResult: { allowed: true },
        });

        expect(hasPermission(request as never)).toBe(true);
      });

      test('should return false when denied', () => {
        const request = createMockRequest({
          permissionResult: { allowed: false, reason: 'Denied' },
        });

        expect(hasPermission(request as never)).toBe(false);
      });

      test('should return false when no result', () => {
        const request = createMockRequest({
          permissionResult: undefined,
        });

        expect(hasPermission(request as never)).toBe(false);
      });
    });

    describe('getPermissionDenialReason', () => {
      test('should return reason when denied', () => {
        const request = createMockRequest({
          permissionResult: { allowed: false, reason: 'Test reason' },
        });

        expect(getPermissionDenialReason(request as never)).toBe('Test reason');
      });

      test('should return undefined when allowed', () => {
        const request = createMockRequest({
          permissionResult: { allowed: true },
        });

        expect(getPermissionDenialReason(request as never)).toBeUndefined();
      });

      test('should return undefined when no result', () => {
        const request = createMockRequest();

        expect(getPermissionDenialReason(request as never)).toBeUndefined();
      });
    });

    describe('getRecordIdFromParams', () => {
      test('should get id from params', () => {
        const request = createMockRequest({
          params: { id: 'record-1' },
        });

        expect(getRecordIdFromParams(request as never)).toBe('record-1');
      });

      test('should get recordId from params', () => {
        const request = createMockRequest({
          params: { recordId: 'record-1' },
        });

        expect(getRecordIdFromParams(request as never)).toBe('record-1');
      });

      test('should use custom param names', () => {
        const request = createMockRequest({
          params: { taskId: 'task-1' },
        });

        expect(getRecordIdFromParams(request as never, ['taskId'])).toBe('task-1');
      });

      test('should return null when not found', () => {
        const request = createMockRequest({
          params: { other: 'value' },
        });

        expect(getRecordIdFromParams(request as never)).toBeNull();
      });

      test('should return null when no params', () => {
        const request = createMockRequest({
          params: undefined,
        });

        expect(getRecordIdFromParams(request as never)).toBeNull();
      });
    });
  });
});
