// modules/realtime/src/routes.test.ts
/**
 * Realtime Routes Unit Tests
 *
 * Tests for route definitions including:
 * - Route structure and configuration
 * - Schema validation
 * - Handler mapping
 * - Authentication requirements
 */

import { recordPointerSchema, transactionSchema } from '@abe-stack/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('./handlers', () => ({
  handleWrite: vi.fn(),
  handleGetRecords: vi.fn(),
  RecordNotFoundError: class RecordNotFoundError extends Error {
    constructor(
      public readonly table: string,
      public readonly id: string,
    ) {
      super(`Record not found: ${table}:${id}`);
      this.name = 'RecordNotFoundError';
    }
  },
  VersionConflictError: class VersionConflictError extends Error {
    constructor(public readonly conflictingRecords: Array<{ table: string; id: string }>) {
      super('Version conflict detected');
      this.name = 'VersionConflictError';
    }
  },
}));

import { realtimeRoutes } from './routes';

import type { FastifyReply } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): Record<string, unknown> {
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
    config: {
      env: 'test',
      auth: {
        cookie: { secret: 'test-secret' },
        jwt: { secret: 'test-jwt-secret' },
      },
    },
  };
}

function createMockRequest(user?: {
  userId: string;
  email: string;
  role: string;
}): Record<string, unknown> {
  return {
    user,
    headers: {},
    cookies: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
  };
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
    const writeRoute = realtimeRoutes['realtime/write'];

    test('should use POST method', () => {
      expect(writeRoute?.method).toBe('POST');
    });

    test('should require user authentication', () => {
      expect(writeRoute?.auth).toBe('user');
    });

    test('should have transactionSchema for validation', () => {
      expect(writeRoute?.schema).toBeDefined();
      expect(writeRoute?.schema?.safeParse).toBeDefined();
    });

    test('should have a handler function', () => {
      expect(typeof writeRoute?.handler).toBe('function');
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

        await writeRoute?.handler(ctx, body, req as never, reply);

        expect(handleWrite).toHaveBeenCalledWith(expect.anything(), body, expect.anything());
      });
    });
  });

  describe('realtime/getRecords Route', () => {
    const getRecordsRoute = realtimeRoutes['realtime/getRecords'];

    test('should use POST method', () => {
      expect(getRecordsRoute?.method).toBe('POST');
    });

    test('should require user authentication', () => {
      expect(getRecordsRoute?.auth).toBe('user');
    });

    test('should have a schema for validation', () => {
      expect(getRecordsRoute?.schema).toBeDefined();
    });

    test('should have a handler function', () => {
      expect(typeof getRecordsRoute?.handler).toBe('function');
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

        await getRecordsRoute?.handler(ctx, body, req as never, reply);

        expect(handleGetRecords).toHaveBeenCalledWith(expect.anything(), body, expect.anything());
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

    test('should reject transaction with empty operations', () => {
      const invalidTransaction = {
        txId: '550e8400-e29b-41d4-a716-446655440000',
        authorId: '550e8400-e29b-41d4-a716-446655440001',
        clientTimestamp: Date.now(),
        operations: [],
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
  });
});
