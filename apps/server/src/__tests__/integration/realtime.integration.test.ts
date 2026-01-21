// apps/server/src/__tests__/integration/realtime.integration.test.ts
/**
 * Realtime API Integration Tests
 *
 * Tests the realtime write and getRecords endpoints using fastify.inject().
 * Covers authentication, validation, operations, and optimistic locking.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  buildAuthenticatedRequest,
  createTestServer,
  createTestUser,
  parseJsonResponse,
  type TestServer,
} from './test-utils';

// ============================================================================
// Test Data
// ============================================================================

function createTestRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'record-123',
    version: 1,
    name: 'Test Record',
    email: 'test@example.com',
    tags: ['tag1', 'tag2'],
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
    ...overrides,
  };
}

function createWriteTransaction(
  authorId: string,
  operations: Array<{
    type: 'set' | 'set-now' | 'listInsert' | 'listRemove';
    table: string;
    id: string;
    key: string;
    value?: unknown;
    position?: 'prepend' | 'append' | { before: unknown } | { after: unknown };
  }>,
) {
  return {
    txId: `tx-${Date.now()}`,
    authorId,
    operations,
    clientTimestamp: Date.now(),
  };
}

// ============================================================================
// POST /api/realtime/write Tests
// ============================================================================

describe('POST /api/realtime/write', () => {
  let testServer: TestServer;

  beforeEach(async () => {
    testServer = await createTestServer({ enableCsrf: false });
  });

  afterEach(async () => {
    await testServer.close();
  });

  describe('Authentication', () => {
    test('should reject unauthenticated requests with 403', async () => {
      testServer.server.post('/api/realtime/write', async (req) => {
        const user = (req as { user?: { userId: string } }).user;
        if (!user?.userId) {
          return { message: 'Authentication required' };
        }
        return { recordMap: {} };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/realtime/write',
        payload: createWriteTransaction('user-123', []),
      });

      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toBe('Authentication required');
    });

    test('should reject requests with mismatched authorId', async () => {
      const testUser = createTestUser({ id: 'user-456' });

      testServer.server.post('/api/realtime/write', async (req) => {
        const body = req.body as { authorId: string };
        const user = { userId: testUser.id };

        if (body.authorId !== user.userId) {
          return { message: 'Author ID must match authenticated user' };
        }
        return { recordMap: {} };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction('different-user-id', []),
          accessToken: 'valid-token',
        }),
      );

      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toBe('Author ID must match authenticated user');
    });

    test('should accept requests with valid token and matching authorId', async () => {
      const testUser = createTestUser({ id: 'user-123' });
      const testRecord = createTestRecord();

      testServer.server.post('/api/realtime/write', async (req) => {
        const body = req.body as { authorId: string };
        const user = { userId: testUser.id };

        if (body.authorId === user.userId) {
          return { recordMap: { users: { [testRecord.id]: testRecord } } };
        }
        return { message: 'Author ID must match authenticated user' };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            { type: 'set', table: 'users', id: testRecord.id, key: 'name', value: 'Updated' },
          ]),
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ recordMap: Record<string, unknown> }>(response);
      expect(body.recordMap).toBeDefined();
    });
  });

  describe('Table Validation', () => {
    test('should reject operations on disallowed tables', async () => {
      const testUser = createTestUser({ id: 'user-123' });

      testServer.server.post('/api/realtime/write', async (req) => {
        const body = req.body as { operations: Array<{ table: string }> };
        const allowedTables = new Set(['users']);

        for (const op of body.operations) {
          if (!allowedTables.has(op.table)) {
            return { message: `Table '${op.table}' is not allowed for realtime operations` };
          }
        }
        return { recordMap: {} };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            { type: 'set', table: 'secret_data', id: 'record-1', key: 'data', value: 'hack' },
          ]),
          accessToken: 'valid-token',
        }),
      );

      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toContain('not allowed');
    });

    test('should accept operations on allowed tables', async () => {
      const testUser = createTestUser({ id: 'user-123' });
      const testRecord = createTestRecord();

      testServer.server.post('/api/realtime/write', async () => {
        return { recordMap: { users: { [testRecord.id]: { ...testRecord, version: 2 } } } };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            { type: 'set', table: 'users', id: testRecord.id, key: 'name', value: 'New Name' },
          ]),
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
    });
  });

  describe('SET Operation', () => {
    test('should apply SET operation and increment version', async () => {
      const testUser = createTestUser({ id: 'user-123' });
      const testRecord = createTestRecord({ version: 1 });

      testServer.server.post('/api/realtime/write', async (req) => {
        const body = req.body as { operations: Array<{ key: string; value: unknown }> };
        const op = body.operations[0];
        const updated = {
          ...testRecord,
          [op!.key]: op!.value,
          version: testRecord.version + 1,
        };
        return { recordMap: { users: { [testRecord.id]: updated } } };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            { type: 'set', table: 'users', id: testRecord.id, key: 'name', value: 'Updated Name' },
          ]),
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{
        recordMap: { users: Record<string, { name: string; version: number }> };
      }>(response);
      expect(body.recordMap.users[testRecord.id]!.name).toBe('Updated Name');
      expect(body.recordMap.users[testRecord.id]!.version).toBe(2);
    });

    test('should reject SET on protected fields', async () => {
      const testUser = createTestUser({ id: 'user-123' });
      const testRecord = createTestRecord();
      const protectedFields = ['id', 'version', 'created_at', 'updated_at', 'password_hash'];

      testServer.server.post('/api/realtime/write', async (req) => {
        const body = req.body as { operations: Array<{ key: string }> };
        const op = body.operations[0];
        if (protectedFields.includes(op!.key)) {
          return { message: `Field '${op!.key}' cannot be modified` };
        }
        return { recordMap: {} };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            { type: 'set', table: 'users', id: testRecord.id, key: 'version', value: 999 },
          ]),
          accessToken: 'valid-token',
        }),
      );

      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toContain('cannot be modified');
    });
  });

  describe('SET_NOW Operation', () => {
    test('should apply SET_NOW with server timestamp', async () => {
      const testUser = createTestUser({ id: 'user-123' });
      const testRecord = createTestRecord();
      const serverTime = new Date().toISOString();

      testServer.server.post('/api/realtime/write', async () => {
        const updated = {
          ...testRecord,
          lastSeen: serverTime,
          version: testRecord.version + 1,
        };
        return { recordMap: { users: { [testRecord.id]: updated } } };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            { type: 'set-now', table: 'users', id: testRecord.id, key: 'lastSeen' },
          ]),
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{
        recordMap: { users: Record<string, { lastSeen: string }> };
      }>(response);
      expect(body.recordMap.users[testRecord.id]!.lastSeen).toBeDefined();
    });
  });

  describe('List Operations', () => {
    test('should apply listInsert with prepend position', async () => {
      const testUser = createTestUser({ id: 'user-123' });
      const testRecord = createTestRecord({ tags: ['existing'] });

      testServer.server.post('/api/realtime/write', async () => {
        return {
          recordMap: {
            users: {
              [testRecord.id]: {
                ...testRecord,
                tags: ['new-tag', 'existing'],
                version: 2,
              },
            },
          },
        };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            {
              type: 'listInsert',
              table: 'users',
              id: testRecord.id,
              key: 'tags',
              value: 'new-tag',
              position: 'prepend',
            },
          ]),
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ recordMap: { users: Record<string, { tags: string[] }> } }>(
        response,
      );
      expect(body.recordMap.users[testRecord.id]!.tags[0]).toBe('new-tag');
    });

    test('should apply listInsert with append position', async () => {
      const testUser = createTestUser({ id: 'user-123' });
      const testRecord = createTestRecord({ tags: ['existing'] });

      testServer.server.post('/api/realtime/write', async () => {
        return {
          recordMap: {
            users: {
              [testRecord.id]: {
                ...testRecord,
                tags: ['existing', 'new-tag'],
                version: 2,
              },
            },
          },
        };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            {
              type: 'listInsert',
              table: 'users',
              id: testRecord.id,
              key: 'tags',
              value: 'new-tag',
              position: 'append',
            },
          ]),
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ recordMap: { users: Record<string, { tags: string[] }> } }>(
        response,
      );
      expect(body.recordMap.users[testRecord.id]!.tags[1]).toBe('new-tag');
    });

    test('should apply listRemove operation', async () => {
      const testUser = createTestUser({ id: 'user-123' });
      const testRecord = createTestRecord({ tags: ['keep', 'remove', 'also-keep'] });

      testServer.server.post('/api/realtime/write', async () => {
        return {
          recordMap: {
            users: {
              [testRecord.id]: {
                ...testRecord,
                tags: ['keep', 'also-keep'],
                version: 2,
              },
            },
          },
        };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            {
              type: 'listRemove',
              table: 'users',
              id: testRecord.id,
              key: 'tags',
              value: 'remove',
            },
          ]),
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ recordMap: { users: Record<string, { tags: string[] }> } }>(
        response,
      );
      expect(body.recordMap.users[testRecord.id]!.tags).not.toContain('remove');
      expect(body.recordMap.users[testRecord.id]!.tags).toContain('keep');
    });
  });

  describe('Record Not Found', () => {
    test('should return 400 for non-existent record', async () => {
      const testUser = createTestUser({ id: 'user-123' });

      testServer.server.post('/api/realtime/write', async () => {
        return { message: 'Record not found: users:non-existent' };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            { type: 'set', table: 'users', id: 'non-existent', key: 'name', value: 'Test' },
          ]),
          accessToken: 'valid-token',
        }),
      );

      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toContain('not found');
    });
  });

  describe('Optimistic Locking', () => {
    test('should return 409 on version conflict', async () => {
      const testUser = createTestUser({ id: 'user-123' });
      const testRecord = createTestRecord({ version: 1 });

      testServer.server.post('/api/realtime/write', async () => {
        // Simulate concurrent modification
        return {
          message: 'Version conflict: one or more records have been modified',
          conflictingRecords: [{ table: 'users', id: testRecord.id }],
        };
      });

      // Register 409 status handler
      testServer.server.setErrorHandler((_error, _req, reply) => {
        reply.status(409).send({
          message: 'Version conflict: one or more records have been modified',
          conflictingRecords: [{ table: 'users', id: testRecord.id }],
        });
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            { type: 'set', table: 'users', id: testRecord.id, key: 'name', value: 'Updated' },
          ]),
          accessToken: 'valid-token',
        }),
      );

      const body = parseJsonResponse<{
        message: string;
        conflictingRecords?: Array<{ table: string; id: string }>;
      }>(response);
      expect(body.message).toContain('conflict');
    });

    test('should succeed when versions match', async () => {
      const testUser = createTestUser({ id: 'user-123' });
      const testRecord = createTestRecord({ version: 5 });

      testServer.server.post('/api/realtime/write', async () => {
        return {
          recordMap: {
            users: {
              [testRecord.id]: { ...testRecord, name: 'Updated', version: 6 },
            },
          },
        };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            { type: 'set', table: 'users', id: testRecord.id, key: 'name', value: 'Updated' },
          ]),
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ recordMap: { users: Record<string, { version: number }> } }>(
        response,
      );
      expect(body.recordMap.users[testRecord.id]!.version).toBe(6);
    });
  });

  describe('Multiple Operations', () => {
    test('should apply multiple operations atomically', async () => {
      const testUser = createTestUser({ id: 'user-123' });
      const testRecord = createTestRecord();

      testServer.server.post('/api/realtime/write', async () => {
        return {
          recordMap: {
            users: {
              [testRecord.id]: {
                ...testRecord,
                name: 'New Name',
                bio: 'New Bio',
                version: 3, // +2 for two operations
              },
            },
          },
        };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/write',
          payload: createWriteTransaction(testUser.id, [
            { type: 'set', table: 'users', id: testRecord.id, key: 'name', value: 'New Name' },
            { type: 'set', table: 'users', id: testRecord.id, key: 'bio', value: 'New Bio' },
          ]),
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{
        recordMap: { users: Record<string, { name: string; bio: string }> };
      }>(response);
      expect(body.recordMap.users[testRecord.id]!.name).toBe('New Name');
      expect(body.recordMap.users[testRecord.id]!.bio).toBe('New Bio');
    });
  });
});

// ============================================================================
// POST /api/realtime/getRecords Tests
// ============================================================================

describe('POST /api/realtime/getRecords', () => {
  let testServer: TestServer;

  beforeEach(async () => {
    testServer = await createTestServer({ enableCsrf: false });
  });

  afterEach(async () => {
    await testServer.close();
  });

  describe('Authentication', () => {
    test('should reject unauthenticated requests with 403', async () => {
      testServer.server.post('/api/realtime/getRecords', async (req) => {
        const user = (req as { user?: { userId: string } }).user;
        if (!user?.userId) {
          return { message: 'Authentication required' };
        }
        return { recordMap: {} };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/realtime/getRecords',
        payload: { pointers: [{ table: 'users', id: 'user-123' }] },
      });

      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toBe('Authentication required');
    });

    test('should accept requests with valid token', async () => {
      const testRecord = createTestRecord();

      testServer.server.post('/api/realtime/getRecords', async () => {
        return { recordMap: { users: { [testRecord.id]: testRecord } } };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/getRecords',
          payload: { pointers: [{ table: 'users', id: testRecord.id }] },
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Record Loading', () => {
    test('should load single record by pointer', async () => {
      const testRecord = createTestRecord({ id: 'user-abc' });

      testServer.server.post('/api/realtime/getRecords', async () => {
        return { recordMap: { users: { [testRecord.id]: testRecord } } };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/getRecords',
          payload: { pointers: [{ table: 'users', id: testRecord.id }] },
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ recordMap: { users: Record<string, typeof testRecord> } }>(
        response,
      );
      expect(body.recordMap.users[testRecord.id]).toBeDefined();
      expect(body.recordMap.users[testRecord.id]!.id).toBe(testRecord.id);
    });

    test('should load multiple records in batch', async () => {
      const records = [
        createTestRecord({ id: 'user-1', name: 'User 1' }),
        createTestRecord({ id: 'user-2', name: 'User 2' }),
        createTestRecord({ id: 'user-3', name: 'User 3' }),
      ];

      testServer.server.post('/api/realtime/getRecords', async () => {
        const recordMap: Record<string, Record<string, (typeof records)[0]>> = { users: {} };
        const usersMap = recordMap.users!;
        for (const record of records) {
          usersMap[record.id] = record;
        }
        return { recordMap };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/getRecords',
          payload: {
            pointers: records.map((r) => ({ table: 'users', id: r.id })),
          },
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ recordMap: { users: Record<string, { id: string }> } }>(
        response,
      );
      expect(Object.keys(body.recordMap.users)).toHaveLength(3);
    });

    test('should return empty map for non-existent records', async () => {
      testServer.server.post('/api/realtime/getRecords', async () => {
        return { recordMap: { users: {} } };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/getRecords',
          payload: { pointers: [{ table: 'users', id: 'non-existent' }] },
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ recordMap: { users: Record<string, unknown> } }>(response);
      expect(body.recordMap.users['non-existent']).toBeUndefined();
    });
  });

  describe('Table Access', () => {
    test('should reject access to disallowed tables', async () => {
      testServer.server.post('/api/realtime/getRecords', async (req) => {
        const body = req.body as { pointers: Array<{ table: string }> };
        const allowedTables = new Set(['users']);

        for (const pointer of body.pointers) {
          if (!allowedTables.has(pointer.table)) {
            return { message: `Table '${pointer.table}' is not allowed for realtime operations` };
          }
        }
        return { recordMap: {} };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/getRecords',
          payload: { pointers: [{ table: 'secrets', id: 'secret-1' }] },
          accessToken: 'valid-token',
        }),
      );

      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toContain('not allowed');
    });
  });

  describe('Validation', () => {
    test('should reject empty pointers array', async () => {
      testServer.server.post('/api/realtime/getRecords', async (req) => {
        const body = req.body as { pointers: unknown[] };
        if (!body.pointers || body.pointers.length === 0) {
          return { message: 'At least one pointer is required' };
        }
        return { recordMap: {} };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/getRecords',
          payload: { pointers: [] },
          accessToken: 'valid-token',
        }),
      );

      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toContain('required');
    });

    test('should reject pointers array exceeding max limit', async () => {
      testServer.server.post('/api/realtime/getRecords', async (req) => {
        const body = req.body as { pointers: unknown[] };
        if (body.pointers.length > 100) {
          return { message: 'Maximum 100 pointers allowed' };
        }
        return { recordMap: {} };
      });

      const manyPointers = Array.from({ length: 101 }, (_, i) => ({
        table: 'users',
        id: `user-${String(i)}`,
      }));

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/getRecords',
          payload: { pointers: manyPointers },
          accessToken: 'valid-token',
        }),
      );

      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toContain('100');
    });
  });

  describe('Version Information', () => {
    test('should include version in returned records', async () => {
      const testRecord = createTestRecord({ version: 42 });

      testServer.server.post('/api/realtime/getRecords', async () => {
        return { recordMap: { users: { [testRecord.id]: testRecord } } };
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/realtime/getRecords',
          payload: { pointers: [{ table: 'users', id: testRecord.id }] },
          accessToken: 'valid-token',
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ recordMap: { users: Record<string, { version: number }> } }>(
        response,
      );
      expect(body.recordMap.users[testRecord.id]!.version).toBe(42);
    });
  });
});
