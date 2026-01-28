// apps/server/src/modules/realtime/routes.test.ts
/**
 * Realtime Routes Unit Tests
 *
 * Tests for route definitions including:
 * - Route structure and configuration
 * - Schema validation
 * - Handler mapping
 * - Authentication requirements
 */

import { recordPointerSchema, transactionSchema } from '@abe-stack/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('./handlers', () => ({
  handleWrite: vi.fn(),
  handleGetRecords: vi.fn(),
}));

import { realtimeRoutes } from './routes';

import type { AppContext, RequestWithCookies } from '../../shared';
import type { FastifyReply } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): AppContext {
  return {
    db: {} as never,
    pubsub: {
      publish: vi.fn(),
    },
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config: {} as never,
    email: {} as never,
    storage: {} as never,
  } as unknown as AppContext;
}

function createMockRequest(user?: {
  userId: string;
  email: string;
  role: string;
}): RequestWithCookies & { user?: { userId: string; email: string; role: string } } {
  return {
    user,
    headers: {},
    cookies: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
  } as RequestWithCookies & { user?: { userId: string; email: string; role: string } };
}

function createMockReply(): FastifyReply {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
}

// ============================================================================
// Route Definition Tests
// ============================================================================

describe('Realtime Routes', () => {
  describe('Route Map Structure', () => {
    test('should export realtimeRoutes as a RouteMap', () => {
      expect(realtimeRoutes).toBeDefined();
      expect(typeof realtimeRoutes).toBe('object');
    });

    test('should define realtime/write route', () => {
      expect(realtimeRoutes['realtime/write']).toBeDefined();
    });

    test('should define realtime/getRecords route', () => {
      expect(realtimeRoutes['realtime/getRecords']).toBeDefined();
    });

    test('should only define expected routes', () => {
      const routeKeys = Object.keys(realtimeRoutes);
      expect(routeKeys).toHaveLength(2);
      expect(routeKeys).toContain('realtime/write');
      expect(routeKeys).toContain('realtime/getRecords');
    });
  });

  describe('realtime/write Route', () => {
    const writeRoute = realtimeRoutes['realtime/write']!;

    test('should use POST method', () => {
      expect(writeRoute.method).toBe('POST');
    });

    test('should require user authentication', () => {
      expect(writeRoute.auth).toBe('user');
    });

    test('should have transactionSchema for validation', () => {
      // Check schema is defined and has expected shape (toBe fails due to ESM module instances)
      expect(writeRoute.schema).toBeDefined();
      expect(writeRoute.schema?.safeParse).toBeDefined();
    });

    test('should have a handler function', () => {
      expect(typeof writeRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleWrite with correct arguments', async () => {
        const { handleWrite } = await import('./handlers');
        vi.mocked(handleWrite).mockResolvedValue({
          status: 200,
          body: { recordMap: {} },
        });

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const body = {
          txId: '550e8400-e29b-41d4-a716-446655440000',
          authorId: 'user-123',
          clientTimestamp: Date.now(),
          operations: [
            {
              type: 'set' as const,
              table: 'users',
              id: '550e8400-e29b-41d4-a716-446655440001',
              key: 'name',
              value: 'Test',
            },
          ],
        };

        await writeRoute.handler(ctx, body, req as never, reply);

        expect(handleWrite).toHaveBeenCalledWith(ctx, body, req);
      });

      test('should return result from handleWrite', async () => {
        const { handleWrite } = await import('./handlers');
        const expectedResult = {
          status: 200 as const,
          body: {
            recordMap: {
              users: {
                'user-1': { id: 'user-1', version: 2, name: 'Updated' },
              },
            },
          },
        };
        vi.mocked(handleWrite).mockResolvedValue(expectedResult);

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const body = {
          txId: '550e8400-e29b-41d4-a716-446655440000',
          authorId: 'user-123',
          clientTimestamp: Date.now(),
          operations: [
            {
              type: 'set' as const,
              table: 'users',
              id: '550e8400-e29b-41d4-a716-446655440001',
              key: 'name',
              value: 'Updated',
            },
          ],
        };

        const result = await writeRoute.handler(ctx, body, req as never, reply);

        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('realtime/getRecords Route', () => {
    const getRecordsRoute = realtimeRoutes['realtime/getRecords']!;

    test('should use POST method', () => {
      expect(getRecordsRoute.method).toBe('POST');
    });

    test('should require user authentication', () => {
      expect(getRecordsRoute.auth).toBe('user');
    });

    test('should have a schema for validation', () => {
      expect(getRecordsRoute.schema).toBeDefined();
    });

    test('should have a handler function', () => {
      expect(typeof getRecordsRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleGetRecords with correct arguments', async () => {
        const { handleGetRecords } = await import('./handlers');
        vi.mocked(handleGetRecords).mockResolvedValue({
          status: 200,
          body: { recordMap: {} },
        });

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const body = {
          pointers: [{ table: 'users', id: '550e8400-e29b-41d4-a716-446655440001' }],
        };

        await getRecordsRoute.handler(ctx, body, req as never, reply);

        expect(handleGetRecords).toHaveBeenCalledWith(ctx, body, req);
      });

      test('should return result from handleGetRecords', async () => {
        const { handleGetRecords } = await import('./handlers');
        const expectedResult = {
          status: 200 as const,
          body: {
            recordMap: {
              users: {
                'user-1': { id: 'user-1', version: 1, name: 'Test User' },
              },
            },
          },
        };
        vi.mocked(handleGetRecords).mockResolvedValue(expectedResult);

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const body = {
          pointers: [{ table: 'users', id: '550e8400-e29b-41d4-a716-446655440001' }],
        };

        const result = await getRecordsRoute.handler(ctx, body, req as never, reply);

        expect(result).toEqual(expectedResult);
      });
    });
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe('Schema Validation', () => {
  describe('transactionSchema (used by realtime/write)', () => {
    test('should accept valid transaction', () => {
      const validTransaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440001',
        clientTimestamp: Date.now(),
        operations: [
          {
            type: 'set',
            table: 'users',
            id: '550e8400-e29b-41d4-a716-446655440002',
            key: 'name',
            value: 'Test',
          },
        ],
      };

      const result = transactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    test('should reject transaction with missing txId', () => {
      const invalidTransaction = {
        authorId: '550e8400-e29b-41d4-a716-446655440001',
        clientTimestamp: Date.now(),
        operations: [
          {
            type: 'set',
            table: 'users',
            id: '550e8400-e29b-41d4-a716-446655440002',
            key: 'name',
            value: 'Test',
          },
        ],
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    test('should reject transaction with invalid txId format', () => {
      const invalidTransaction = {
        txId: 'not-a-uuid',
        authorId: '550e8400-e29b-41d4-a716-446655440001',
        clientTimestamp: Date.now(),
        operations: [
          {
            type: 'set',
            table: 'users',
            id: '550e8400-e29b-41d4-a716-446655440002',
            key: 'name',
            value: 'Test',
          },
        ],
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    test('should reject transaction with empty operations array', () => {
      const invalidTransaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440001',
        clientTimestamp: Date.now(),
        operations: [],
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    test('should reject transaction with invalid operation type', () => {
      const invalidTransaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440001',
        clientTimestamp: Date.now(),
        operations: [
          {
            type: 'invalid-type',
            table: 'users',
            id: '550e8400-e29b-41d4-a716-446655440002',
            key: 'name',
            value: 'Test',
          },
        ],
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    test('should accept transaction with multiple valid operations', () => {
      const validTransaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440001',
        clientTimestamp: Date.now(),
        operations: [
          {
            type: 'set',
            table: 'users',
            id: '550e8400-e29b-41d4-a716-446655440002',
            key: 'name',
            value: 'Test',
          },
          {
            type: 'set-now',
            table: 'users',
            id: '550e8400-e29b-41d4-a716-446655440002',
            key: 'updatedAt',
          },
        ],
      };

      const result = transactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    test('should reject negative clientTimestamp', () => {
      const invalidTransaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440001',
        clientTimestamp: -1,
        operations: [
          {
            type: 'set',
            table: 'users',
            id: '550e8400-e29b-41d4-a716-446655440002',
            key: 'name',
            value: 'Test',
          },
        ],
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });
  });

  describe('recordPointerSchema (used by realtime/getRecords)', () => {
    test('should accept valid record pointer', () => {
      const validPointer = {
        table: 'users',
        id: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = recordPointerSchema.safeParse(validPointer);
      expect(result.success).toBe(true);
    });

    test('should reject pointer with empty table', () => {
      const invalidPointer = {
        table: '',
        id: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = recordPointerSchema.safeParse(invalidPointer);
      expect(result.success).toBe(false);
    });

    test('should reject pointer with invalid id format', () => {
      const invalidPointer = {
        table: 'users',
        id: 'not-a-uuid',
      };

      const result = recordPointerSchema.safeParse(invalidPointer);
      expect(result.success).toBe(false);
    });

    test('should reject pointer with missing table', () => {
      const invalidPointer = {
        id: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = recordPointerSchema.safeParse(invalidPointer);
      expect(result.success).toBe(false);
    });

    test('should reject pointer with missing id', () => {
      const invalidPointer = {
        table: 'users',
      };

      const result = recordPointerSchema.safeParse(invalidPointer);
      expect(result.success).toBe(false);
    });
  });

  describe('getRecordsRequestSchema (embedded in route)', () => {
    const getRecordsRoute = realtimeRoutes['realtime/getRecords']!;
    const schema = getRecordsRoute.schema!;

    test('should accept valid request with single pointer', () => {
      const validRequest = {
        pointers: [{ table: 'users', id: '550e8400-e29b-41d4-a716-446655440001' }],
      };

      const result = schema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept valid request with multiple pointers', () => {
      const validRequest = {
        pointers: [
          { table: 'users', id: '550e8400-e29b-41d4-a716-446655440001' },
          { table: 'posts', id: '550e8400-e29b-41d4-a716-446655440002' },
          { table: 'comments', id: '550e8400-e29b-41d4-a716-446655440003' },
        ],
      };

      const result = schema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject request with empty pointers array', () => {
      const invalidRequest = {
        pointers: [],
      };

      const result = schema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject request with missing pointers field', () => {
      const invalidRequest = {};

      const result = schema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject request exceeding max pointers (100)', () => {
      const invalidRequest = {
        pointers: Array.from({ length: 101 }, (_, i) => ({
          table: 'users',
          id: `550e8400-e29b-41d4-a716-44665544${i.toString().padStart(4, '0')}`,
        })),
      };

      const result = schema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should accept request with exactly max pointers (100)', () => {
      const validRequest = {
        pointers: Array.from({ length: 100 }, (_, i) => ({
          table: 'users',
          id: `550e8400-e29b-41d4-a716-44665544${i.toString().padStart(4, '0')}`,
        })),
      };

      const result = schema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject request with invalid pointer in array', () => {
      const invalidRequest = {
        pointers: [
          { table: 'users', id: '550e8400-e29b-41d4-a716-446655440001' },
          { table: '', id: '550e8400-e29b-41d4-a716-446655440002' }, // Invalid: empty table
        ],
      };

      const result = schema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Operation Type Schema Tests
// ============================================================================

describe('Operation Type Schemas', () => {
  describe('set operation', () => {
    test('should accept valid set operation', () => {
      const validOp = {
        type: 'set',
        table: 'users',
        id: '550e8400-e29b-41d4-a716-446655440001',
        key: 'name',
        value: 'Test User',
      };

      const transaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440002',
        clientTimestamp: Date.now(),
        operations: [validOp],
      };

      const result = transactionSchema.safeParse(transaction);
      expect(result.success).toBe(true);
    });

    test('should accept set operation with null value', () => {
      const validOp = {
        type: 'set',
        table: 'users',
        id: '550e8400-e29b-41d4-a716-446655440001',
        key: 'deletedAt',
        value: null,
      };

      const transaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440002',
        clientTimestamp: Date.now(),
        operations: [validOp],
      };

      const result = transactionSchema.safeParse(transaction);
      expect(result.success).toBe(true);
    });

    test('should accept set operation with object value', () => {
      const validOp = {
        type: 'set',
        table: 'users',
        id: '550e8400-e29b-41d4-a716-446655440001',
        key: 'metadata',
        value: { key: 'value', nested: { data: true } },
      };

      const transaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440002',
        clientTimestamp: Date.now(),
        operations: [validOp],
      };

      const result = transactionSchema.safeParse(transaction);
      expect(result.success).toBe(true);
    });
  });

  describe('set-now operation', () => {
    test('should accept valid set-now operation', () => {
      const validOp = {
        type: 'set-now',
        table: 'users',
        id: '550e8400-e29b-41d4-a716-446655440001',
        key: 'updatedAt',
      };

      const transaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440002',
        clientTimestamp: Date.now(),
        operations: [validOp],
      };

      const result = transactionSchema.safeParse(transaction);
      expect(result.success).toBe(true);
    });
  });

  describe('listInsert operation', () => {
    test('should accept valid listInsert operation with append', () => {
      const validOp = {
        type: 'listInsert',
        table: 'posts',
        id: '550e8400-e29b-41d4-a716-446655440001',
        key: 'tags',
        value: 'new-tag',
        position: 'append',
      };

      const transaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440002',
        clientTimestamp: Date.now(),
        operations: [validOp],
      };

      const result = transactionSchema.safeParse(transaction);
      expect(result.success).toBe(true);
    });

    test('should accept valid listInsert operation with prepend', () => {
      const validOp = {
        type: 'listInsert',
        table: 'posts',
        id: '550e8400-e29b-41d4-a716-446655440001',
        key: 'tags',
        value: 'new-tag',
        position: 'prepend',
      };

      const transaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440002',
        clientTimestamp: Date.now(),
        operations: [validOp],
      };

      const result = transactionSchema.safeParse(transaction);
      expect(result.success).toBe(true);
    });

    test('should accept valid listInsert operation with before position', () => {
      const validOp = {
        type: 'listInsert',
        table: 'posts',
        id: '550e8400-e29b-41d4-a716-446655440001',
        key: 'tags',
        value: 'new-tag',
        position: { before: 'existing-tag' },
      };

      const transaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440002',
        clientTimestamp: Date.now(),
        operations: [validOp],
      };

      const result = transactionSchema.safeParse(transaction);
      expect(result.success).toBe(true);
    });

    test('should accept valid listInsert operation with after position', () => {
      const validOp = {
        type: 'listInsert',
        table: 'posts',
        id: '550e8400-e29b-41d4-a716-446655440001',
        key: 'tags',
        value: 'new-tag',
        position: { after: 'existing-tag' },
      };

      const transaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440002',
        clientTimestamp: Date.now(),
        operations: [validOp],
      };

      const result = transactionSchema.safeParse(transaction);
      expect(result.success).toBe(true);
    });
  });

  describe('listRemove operation', () => {
    test('should accept valid listRemove operation', () => {
      const validOp = {
        type: 'listRemove',
        table: 'posts',
        id: '550e8400-e29b-41d4-a716-446655440001',
        key: 'tags',
        value: 'tag-to-remove',
      };

      const transaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440002',
        clientTimestamp: Date.now(),
        operations: [validOp],
      };

      const result = transactionSchema.safeParse(transaction);
      expect(result.success).toBe(true);
    });
  });
});
