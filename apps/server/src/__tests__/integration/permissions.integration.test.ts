// apps/server/src/__tests__/integration/permissions.integration.test.ts
/* eslint-disable @typescript-eslint/no-misused-promises -- Fastify preHandler supports async functions */
/**
 * Row-Level Permissions Integration Tests
 *
 * Tests the permission system including rule factories, PermissionChecker,
 * and middleware integration using fastify.inject().
 */

import {
  createAdminRule,
  createCustomRule,
  createDefaultPermissionConfig,
  createMemberRule,
  createOwnerRule,
  createPermissionChecker,
} from '@infra/permissions/checker';
import {
  createPermissionMiddleware,
  createStandalonePermissionGuard,
} from '@infra/permissions/middleware';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { parseJsonResponse } from './test-utils';

import type { PermissionChecker } from '@infra/permissions/checker';
import type { PermissionConfig, PermissionRecord, RecordLoader } from '@infra/permissions/types';
import type { FastifyInstance } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRecordLoader(records: Map<string, PermissionRecord>): RecordLoader {
  return async (table: string, id: string) => {
    const key = `${table}:${id}`;
    return records.get(key) ?? null;
  };
}

function createTestChecker(
  config: PermissionConfig,
  records: Map<string, PermissionRecord> = new Map(),
): PermissionChecker {
  return createPermissionChecker({
    config,
    recordLoader: createMockRecordLoader(records),
  });
}

// ============================================================================
// Permission Rule Factories Tests
// ============================================================================

describe('Permission Rule Factories', () => {
  describe('createAdminRule', () => {
    test('should create admin rule with all permissions', () => {
      const rule = createAdminRule();

      expect(rule.type).toBe('role');
      expect(rule.roles).toEqual(['admin']);
      expect(rule.grants).toEqual(['read', 'write', 'delete', 'admin']);
      expect(rule.priority).toBe(100);
    });

    test('should create admin rule with custom priority', () => {
      const config: PermissionConfig = {
        globalRules: [createAdminRule()],
        defaultDeny: true,
      };

      expect(config.globalRules[0]?.priority).toBe(100);
    });
  });

  describe('createOwnerRule', () => {
    test('should create owner rule with default grants', () => {
      const rule = createOwnerRule();

      expect(rule.type).toBe('ownership');
      expect(rule.grants).toEqual(['read', 'write', 'delete']);
      expect(rule.priority).toBe(50);
    });

    test('should create owner rule with custom grants', () => {
      const rule = createOwnerRule(['read'], 'authorId', 75);

      expect(rule.grants).toEqual(['read']);
      expect(rule.ownerField).toBe('authorId');
      expect(rule.priority).toBe(75);
    });

    test('should create owner rule with custom owner field', () => {
      const rule = createOwnerRule(['read', 'write'], 'createdBy');

      expect(rule.ownerField).toBe('createdBy');
    });
  });

  describe('createMemberRule', () => {
    test('should create member rule with default grants (read only)', () => {
      const rule = createMemberRule();

      expect(rule.type).toBe('membership');
      expect(rule.grants).toEqual(['read']);
      expect(rule.priority).toBe(25);
    });

    test('should create member rule with custom grants', () => {
      const rule = createMemberRule(['read', 'write'], 'collaborators', 60);

      expect(rule.grants).toEqual(['read', 'write']);
      expect(rule.memberField).toBe('collaborators');
      expect(rule.priority).toBe(60);
    });
  });

  describe('createCustomRule', () => {
    test('should create custom rule with predicate function', () => {
      const predicate = (_userId: string, _role: string, record: PermissionRecord) => {
        return record.status === 'public';
      };

      const rule = createCustomRule(predicate, ['read'], ['posts'], 75);

      expect(rule.type).toBe('custom');
      expect(rule.grants).toEqual(['read']);
      expect(rule.tables).toEqual(['posts']);
      expect(rule.priority).toBe(75);
    });

    test('should create custom rule applicable to all tables by default', () => {
      const rule = createCustomRule(() => true, ['read']);

      expect(rule.tables).toBeUndefined();
    });
  });
});

// ============================================================================
// PermissionChecker Integration Tests
// ============================================================================

describe('PermissionChecker Integration', () => {
  describe('Read Permissions', () => {
    test('should allow admin to read any record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other-user' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const result = await checker.checkReadPermission('admin-user', 'admin', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('role:admin');
    });

    test('should allow owner to read their record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('ownership:ownerId');
    });

    test('should allow member to read shared record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'owner', memberIds: ['user-1', 'user-2'] }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('membership:memberIds');
    });

    test('should deny non-owner from reading record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other-user' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No matching permission rules');
    });

    test('should deny access to non-existent records', async () => {
      const checker = createTestChecker(createDefaultPermissionConfig());
      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'non-existent');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Record not found');
    });

    test('should deny access to soft-deleted records by default', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1', deleted: new Date() }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Record is deleted');
    });
  });

  describe('Write Permissions', () => {
    test('should allow owner to write their record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const result = await checker.checkWritePermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
    });

    test('should deny member from writing by default', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'owner', memberIds: ['user-1'] }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const result = await checker.checkWritePermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(false);
    });

    test('should allow create operation for authenticated users', async () => {
      const checker = createTestChecker(createDefaultPermissionConfig());
      const result = await checker.checkWritePermission('user-1', 'user', 'tasks', '', 'create');

      expect(result.allowed).toBe(true);
      expect(result.matchedRule).toBe('authenticated-create');
    });
  });

  describe('Delete Permissions', () => {
    test('should allow owner to delete their record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const result = await checker.checkWritePermission(
        'user-1',
        'user',
        'tasks',
        'task-1',
        'delete',
      );

      expect(result.allowed).toBe(true);
    });

    test('should allow admin to delete any record', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other-user' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const result = await checker.checkWritePermission(
        'admin-user',
        'admin',
        'tasks',
        'task-1',
        'delete',
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('Admin Permissions', () => {
    test('should allow admin role for admin permission check', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other-user' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const result = await checker.checkAdminPermission('admin-user', 'admin', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
    });

    test('should deny non-admin for admin permission check', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const result = await checker.checkAdminPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(false);
    });
  });

  describe('Custom Rules', () => {
    test('should support custom permission rules', async () => {
      const records = new Map<string, PermissionRecord>([
        ['posts:post-1', { id: 'post-1', ownerId: 'other', status: 'public' }],
        ['posts:post-2', { id: 'post-2', ownerId: 'other', status: 'private' }],
      ]);

      const config: PermissionConfig = {
        globalRules: [
          createAdminRule(),
          // Public posts are readable by anyone
          createCustomRule(
            (_userId, _role, record) => record.status === 'public',
            ['read'],
            ['posts'],
            75,
          ),
          createOwnerRule(),
        ],
        defaultDeny: true,
      };

      const checker = createTestChecker(config, records);

      // Public post should be readable
      const publicResult = await checker.checkReadPermission('user-1', 'user', 'posts', 'post-1');
      expect(publicResult.allowed).toBe(true);
      expect(publicResult.matchedRule).toBe('custom');

      // Private post should not be readable
      const privateResult = await checker.checkReadPermission('user-1', 'user', 'posts', 'post-2');
      expect(privateResult.allowed).toBe(false);
    });

    test('should handle async custom rules', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other' }],
      ]);

      const config: PermissionConfig = {
        globalRules: [
          createCustomRule(async () => {
            // Simulate async check (e.g., external API call)
            await new Promise((resolve) => setTimeout(resolve, 10));
            return true;
          }, ['read']),
        ],
        defaultDeny: true,
      };

      const checker = createTestChecker(config, records);
      const result = await checker.checkReadPermission('user-1', 'user', 'tasks', 'task-1');

      expect(result.allowed).toBe(true);
    });
  });

  describe('Batch Permission Checks', () => {
    test('should check multiple permissions at once', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
        ['tasks:task-2', { id: 'task-2', ownerId: 'other' }],
        ['notes:note-1', { id: 'note-1', ownerId: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const results = await checker.batchCheckPermissions('user-1', 'user', [
        { table: 'tasks', recordId: 'task-1', permission: 'read' },
        { table: 'tasks', recordId: 'task-2', permission: 'read' },
        { table: 'notes', recordId: 'note-1', permission: 'write' },
      ]);

      expect(results.get('tasks:task-1')?.allowed).toBe(true);
      expect(results.get('tasks:task-2')?.allowed).toBe(false);
      expect(results.get('notes:note-1')?.allowed).toBe(true);
    });
  });

  describe('Record Filtering', () => {
    test('should filter to only readable records', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
        ['tasks:task-2', { id: 'task-2', ownerId: 'other' }],
        ['tasks:task-3', { id: 'task-3', ownerId: 'user-1' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const allRecords = [
        { id: 'task-1', ownerId: 'user-1' },
        { id: 'task-2', ownerId: 'other' },
        { id: 'task-3', ownerId: 'user-1' },
      ];

      const filtered = await checker.filterReadableRecords('user-1', 'user', 'tasks', allRecords);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((r) => r.id)).toEqual(['task-1', 'task-3']);
    });

    test('should return all records for admin', async () => {
      const records = new Map<string, PermissionRecord>([
        ['tasks:task-1', { id: 'task-1', ownerId: 'other-1' }],
        ['tasks:task-2', { id: 'task-2', ownerId: 'other-2' }],
      ]);

      const checker = createTestChecker(createDefaultPermissionConfig(), records);
      const allRecords = [
        { id: 'task-1', ownerId: 'other-1' },
        { id: 'task-2', ownerId: 'other-2' },
      ];

      const filtered = await checker.filterReadableRecords('admin', 'admin', 'tasks', allRecords);

      expect(filtered).toHaveLength(2);
    });
  });
});

// ============================================================================
// Permission Middleware Integration Tests
// ============================================================================

describe('Permission Middleware Integration', () => {
  let server: FastifyInstance;
  let records: Map<string, PermissionRecord>;
  let checker: PermissionChecker;

  beforeEach(async () => {
    records = new Map([
      ['tasks:task-1', { id: 'task-1', ownerId: 'user-1' }],
      ['tasks:task-2', { id: 'task-2', ownerId: 'other-user' }],
      ['tasks:task-3', { id: 'task-3', ownerId: 'user-1', memberIds: ['user-2'] }],
    ]);
    checker = createTestChecker(createDefaultPermissionConfig(), records);

    server = Fastify({ logger: false });

    // Simulate auth middleware that sets user on request
    server.decorateRequest('user', null as never);
    server.addHook('preHandler', async (req) => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        // Simulate token parsing
        if (token === 'admin-token') {
          req.user = { userId: 'admin-user', role: 'admin' as const };
        } else if (token === 'user-1-token') {
          req.user = { userId: 'user-1', role: 'user' as const };
        } else if (token === 'user-2-token') {
          req.user = { userId: 'user-2', role: 'user' as const };
        }
      }
    });

    const middleware = createPermissionMiddleware({ checker });

    // Read route
    server.get(
      '/tasks/:id',
      { preHandler: middleware.requireReadPermission('tasks') },
      async (req) => {
        const params = req.params as { id: string };
        return { task: { id: params.id } };
      },
    );

    // Write route
    server.put(
      '/tasks/:id',
      { preHandler: middleware.requireWritePermission('tasks') },
      async (req) => {
        const params = req.params as { id: string };
        return { updated: { id: params.id } };
      },
    );

    // Delete route
    server.delete(
      '/tasks/:id',
      { preHandler: middleware.requireDeletePermission('tasks') },
      async (req) => {
        const params = req.params as { id: string };
        return { deleted: params.id };
      },
    );

    // Admin route
    server.post(
      '/tasks/:id/admin-action',
      { preHandler: middleware.requireAdminPermission('tasks') },
      async () => {
        return { adminAction: 'completed' };
      },
    );

    // Create route
    server.post(
      '/tasks',
      { preHandler: middleware.requireWritePermission('tasks', undefined, 'create') },
      async () => {
        return { created: { id: 'new-task' } };
      },
    );

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('Read Permission Middleware', () => {
    test('should allow owner to read their task', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/tasks/task-1',
        headers: {
          authorization: 'Bearer user-1-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ task: { id: string } }>(response);
      expect(body.task.id).toBe('task-1');
    });

    test('should deny non-owner from reading task', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/tasks/task-2',
        headers: {
          authorization: 'Bearer user-1-token',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    test('should allow admin to read any task', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/tasks/task-2',
        headers: {
          authorization: 'Bearer admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    test('should allow member to read shared task', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/tasks/task-3',
        headers: {
          authorization: 'Bearer user-2-token',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    test('should reject unauthenticated request', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/tasks/task-1',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Write Permission Middleware', () => {
    test('should allow owner to update their task', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/tasks/task-1',
        headers: {
          authorization: 'Bearer user-1-token',
        },
        payload: { title: 'Updated' },
      });

      expect(response.statusCode).toBe(200);
    });

    test('should deny non-owner from updating task', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/tasks/task-2',
        headers: {
          authorization: 'Bearer user-1-token',
        },
        payload: { title: 'Updated' },
      });

      expect(response.statusCode).toBe(403);
    });

    test('should allow authenticated user to create task', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/tasks',
        headers: {
          authorization: 'Bearer user-1-token',
        },
        payload: { title: 'New Task' },
      });

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ created: { id: string } }>(response);
      expect(body.created.id).toBe('new-task');
    });
  });

  describe('Delete Permission Middleware', () => {
    test('should allow owner to delete their task', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/tasks/task-1',
        headers: {
          authorization: 'Bearer user-1-token',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    test('should deny non-owner from deleting task', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/tasks/task-2',
        headers: {
          authorization: 'Bearer user-1-token',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    test('should allow admin to delete any task', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/tasks/task-2',
        headers: {
          authorization: 'Bearer admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Admin Permission Middleware', () => {
    test('should allow admin for admin actions', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/tasks/task-1/admin-action',
        headers: {
          authorization: 'Bearer admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    test('should deny non-admin for admin actions', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/tasks/task-1/admin-action',
        headers: {
          authorization: 'Bearer user-1-token',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

// ============================================================================
// Standalone Permission Guard Tests
// ============================================================================

describe('Standalone Permission Guard', () => {
  let server: FastifyInstance;
  let records: Map<string, PermissionRecord>;
  let checker: PermissionChecker;

  beforeEach(async () => {
    records = new Map([['documents:doc-1', { id: 'doc-1', ownerId: 'user-1' }]]);
    checker = createTestChecker(createDefaultPermissionConfig(), records);

    server = Fastify({ logger: false });

    // Simulate auth middleware
    server.decorateRequest('user', null as never);
    server.addHook('preHandler', async (req) => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer user-1')) {
        req.user = { userId: 'user-1', role: 'user' as const };
      }
    });

    // Create standalone guard
    const guard = createStandalonePermissionGuard(checker, {
      permission: 'read',
      table: 'documents',
      getRecordId: (req) => (req.params as { documentId?: string })?.documentId ?? null,
    });

    server.get('/documents/:documentId', { preHandler: guard }, async (req) => {
      const params = req.params as { documentId: string };
      return { document: { id: params.documentId } };
    });

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should allow access with valid permission', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/documents/doc-1',
      headers: {
        authorization: 'Bearer user-1-token',
      },
    });

    expect(response.statusCode).toBe(200);
  });

  test('should reject unauthenticated request', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/documents/doc-1',
    });

    expect(response.statusCode).toBe(401);
  });

  test('should reject when record ID cannot be extracted', async () => {
    // Need a fresh server since we can't add routes after server.ready()
    const badRouteServer = Fastify({ logger: false });

    badRouteServer.decorateRequest('user', null as never);
    badRouteServer.addHook('preHandler', async (req) => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer user-1')) {
        req.user = { userId: 'user-1', role: 'user' as const };
      }
    });

    badRouteServer.get(
      '/bad-route',
      {
        preHandler: createStandalonePermissionGuard(checker, {
          permission: 'read',
          table: 'documents',
          getRecordId: () => null, // Always returns null
        }),
      },
      () => ({ data: 'test' }),
    );

    await badRouteServer.ready();

    try {
      const response = await badRouteServer.inject({
        method: 'GET',
        url: '/bad-route',
        headers: {
          authorization: 'Bearer user-1-token',
        },
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await badRouteServer.close();
    }
  });
});

// ============================================================================
// Permission Middleware with Custom Error Handler
// ============================================================================

describe('Permission Middleware with Custom Error Handler', () => {
  let server: FastifyInstance;
  let records: Map<string, PermissionRecord>;
  let checker: PermissionChecker;
  const customOnDenied = vi.fn();

  beforeEach(async () => {
    customOnDenied.mockReset();
    records = new Map([['items:item-1', { id: 'item-1', ownerId: 'other-user' }]]);
    checker = createTestChecker(createDefaultPermissionConfig(), records);

    server = Fastify({ logger: false });

    server.decorateRequest('user', null as never);
    server.addHook('preHandler', async (req) => {
      req.user = { userId: 'user-1', role: 'user' as const };
    });

    const middleware = createPermissionMiddleware({
      checker,
      onDenied: (_req, reply, reason) => {
        customOnDenied(reason);
        reply.status(403).send({
          error: 'Access Denied',
          customReason: reason,
        });
      },
    });

    server.get(
      '/items/:id',
      { preHandler: middleware.requireReadPermission('items') },
      async () => {
        return { item: 'data' };
      },
    );

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('should use custom error handler on denial', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/items/item-1',
    });

    expect(response.statusCode).toBe(403);
    const body = parseJsonResponse<{ error: string; customReason: string }>(response);
    expect(body.error).toBe('Access Denied');
    expect(body.customReason).toContain('No matching permission rules');
    expect(customOnDenied).toHaveBeenCalled();
  });
});

// ============================================================================
// Table-Specific Permission Configuration Tests
// ============================================================================

describe('Table-Specific Permission Configuration', () => {
  test('should apply table-specific rules', async () => {
    const records = new Map<string, PermissionRecord>([
      ['public_posts:post-1', { id: 'post-1', ownerId: 'other' }],
      ['private_notes:note-1', { id: 'note-1', ownerId: 'other' }],
    ]);

    const config: PermissionConfig = {
      globalRules: [createAdminRule(), createOwnerRule()],
      tableConfigs: [
        {
          table: 'public_posts',
          rules: [
            {
              type: 'role',
              roles: ['user', 'admin'],
              grants: ['read'],
              priority: 100,
            },
          ],
        },
      ],
      defaultDeny: true,
    };

    const checker = createTestChecker(config, records);

    // Public posts are readable by any authenticated user
    const postResult = await checker.checkReadPermission(
      'user-1',
      'user',
      'public_posts',
      'post-1',
    );
    expect(postResult.allowed).toBe(true);

    // Private notes are not readable (no table-specific rule)
    const noteResult = await checker.checkReadPermission(
      'user-1',
      'user',
      'private_notes',
      'note-1',
    );
    expect(noteResult.allowed).toBe(false);
  });

  test('should allow deleted records when configured', async () => {
    const records = new Map<string, PermissionRecord>([
      ['archive:item-1', { id: 'item-1', ownerId: 'user-1', deleted: new Date() }],
    ]);

    const config: PermissionConfig = {
      globalRules: [createOwnerRule()],
      tableConfigs: [
        {
          table: 'archive',
          rules: [],
          allowDeletedRecords: true,
        },
      ],
      defaultDeny: true,
    };

    const checker = createTestChecker(config, records);
    const result = await checker.checkReadPermission('user-1', 'user', 'archive', 'item-1');

    expect(result.allowed).toBe(true);
  });
});
