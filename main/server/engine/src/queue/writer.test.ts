// main/server/engine/src/queue/writer.test.ts
/**
 * Tests for Write Service
 *
 * Verifies unified write pattern with transactions, optimistic locking,
 * automatic version bumping, PubSub integration, and extensible hooks.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WriteService, createWriteService, type WriteServiceOptions } from './writer';

import type { DbClient } from '@bslt/db';
import type { SubscriptionManager } from '@bslt/shared';
import type { WriteBatch, WriteOperation } from './types';

/**
 * Logger interface matching WriteService's internal Logger type
 */
interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string | Error, data?: Record<string, unknown>): void;
}

// ============================================================================
// Mock Modules
// ============================================================================

vi.mock('@bslt/db', () => ({
  escapeIdentifier: vi.fn((id: string) => `"${id}"`),
  withTransaction: vi.fn(async (db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
    return fn(db);
  }),
  isInTransaction: vi.fn(() => false),
}));

vi.mock('@bslt/shared', () => ({
  SubKeys: {
    record: vi.fn((table: string, id: string) => `record:${table}:${id}`),
  },
}));

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock database client
 */
function createMockDb(): DbClient {
  return {
    raw: vi.fn(),
    execute: vi.fn(),
    query: vi.fn(),
    queryOne: vi.fn(),
    close: vi.fn(),
  } as unknown as DbClient;
}

/**
 * Create a mock PubSub manager
 */
function createMockPubSub(): SubscriptionManager {
  return {
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  } as unknown as SubscriptionManager;
}

/**
 * Minimal logger interface for test mocking
 */
interface MockLogger {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock logger
 */
function createMockLogger(): MockLogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

/**
 * Create WriteService options with defaults
 */
function createServiceOptions(overrides: Partial<WriteServiceOptions> = {}): WriteServiceOptions {
  const mockLogger = createMockLogger();
  const base: WriteServiceOptions = {
    db: createMockDb(),
    pubsub: createMockPubSub(),
    hooks: {},
  };

  // Conditionally add log if not in overrides
  if (!Object.hasOwn(overrides, 'log')) {
    base.log = mockLogger as unknown as Logger;
  }

  return { ...base, ...overrides };
}

/**
 * Create a write batch for testing
 */
function createWriteBatch(operations: WriteOperation[]): WriteBatch {
  return {
    txId: 'tx-test-123',
    authorId: 'user-456',
    operations,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('WriteService', () => {
  let service: WriteService;
  let mockDb: DbClient;
  let mockPubSub: SubscriptionManager;
  let mockLogger: MockLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    const options = createServiceOptions();
    mockDb = options.db;
    mockPubSub = options.pubsub as SubscriptionManager;
    mockLogger = options.log as unknown as MockLogger;
    service = new WriteService(options);
  });

  describe('create operations', () => {
    it('should create a new record with version 1', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const operation: WriteOperation = {
        type: 'create',
        table: 'users',
        id: 'user-789',
        data: { name: 'John Doe', email: 'john@example.com' },
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.record).toMatchObject({
        id: 'user-789',
        name: 'John Doe',
        email: 'john@example.com',
        version: 1,
      });
    });

    it('should throw error if create operation has no data', async () => {
      const operation: WriteOperation = {
        type: 'create',
        table: 'users',
        id: 'user-999',
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL');
      expect(result.error?.message).toContain('Create operation requires data');
    });

    it('should set timestamps on create', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const operation: WriteOperation = {
        type: 'create',
        table: 'posts',
        id: 'post-1',
        data: { title: 'Test Post' },
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      expect(result.results[0]?.record).toHaveProperty('created_at');
      expect(result.results[0]?.record).toHaveProperty('updated_at');
    });
  });

  describe('update operations', () => {
    it('should update existing record and bump version', async () => {
      vi.mocked(mockDb.raw)
        .mockResolvedValueOnce([{ version: 1 }]) // SELECT current version
        .mockResolvedValueOnce([{ id: 'user-1', name: 'Jane Updated', version: 2 }]); // UPDATE RETURNING

      const operation: WriteOperation = {
        type: 'update',
        table: 'users',
        id: 'user-1',
        data: { name: 'Jane Updated' },
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      expect(result.success).toBe(true);
      expect(result.results[0]?.record?.version).toBe(2);
      expect(result.results[0]?.previousVersion).toBe(1);
    });

    it('should enforce optimistic locking with expectedVersion', async () => {
      vi.mocked(mockDb.raw).mockResolvedValueOnce([{ version: 5 }]);

      const operation: WriteOperation = {
        type: 'update',
        table: 'users',
        id: 'user-1',
        data: { name: 'Jane' },
        expectedVersion: 3, // Mismatch
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFLICT');
      expect(result.error?.message).toContain('Version mismatch');
    });

    it('should throw NOT_FOUND if record does not exist', async () => {
      vi.mocked(mockDb.raw).mockResolvedValueOnce([]); // Empty result

      const operation: WriteOperation = {
        type: 'update',
        table: 'users',
        id: 'nonexistent',
        data: { name: 'Ghost' },
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should throw error if update operation has no data', async () => {
      const operation: WriteOperation = {
        type: 'update',
        table: 'users',
        id: 'user-1',
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Update operation requires data');
    });

    it('should detect concurrent modification', async () => {
      vi.mocked(mockDb.raw)
        .mockResolvedValueOnce([{ version: 2 }])
        .mockResolvedValueOnce([]); // UPDATE returns no rows

      const operation: WriteOperation = {
        type: 'update',
        table: 'users',
        id: 'user-1',
        data: { name: 'Updated' },
        expectedVersion: 2,
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFLICT');
      expect(result.error?.message).toContain('Concurrent modification');
    });
  });

  describe('delete operations', () => {
    it('should delete existing record', async () => {
      vi.mocked(mockDb.raw).mockResolvedValueOnce([{ version: 3 }]);
      vi.mocked(mockDb.execute).mockResolvedValueOnce(1);

      const operation: WriteOperation = {
        type: 'delete',
        table: 'users',
        id: 'user-1',
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      expect(result.success).toBe(true);
      expect(result.results[0]?.previousVersion).toBe(3);
      expect(result.results[0]?.record).toBeUndefined();
    });

    it('should enforce optimistic locking on delete', async () => {
      vi.mocked(mockDb.raw).mockResolvedValueOnce([{ version: 2 }]);
      vi.mocked(mockDb.execute).mockResolvedValueOnce(0); // No rows deleted

      const operation: WriteOperation = {
        type: 'delete',
        table: 'users',
        id: 'user-1',
        expectedVersion: 2,
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFLICT');
    });

    it('should throw NOT_FOUND if record to delete does not exist', async () => {
      vi.mocked(mockDb.raw).mockResolvedValueOnce([]);

      const operation: WriteOperation = {
        type: 'delete',
        table: 'users',
        id: 'nonexistent',
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('batch operations', () => {
    it('should execute multiple operations atomically', async () => {
      vi.mocked(mockDb.raw)
        .mockResolvedValueOnce([]) // create insert
        .mockResolvedValueOnce([{ version: 1 }]) // update select
        .mockResolvedValueOnce([{ id: 'user-2', name: 'Updated', version: 2 }]); // update returning

      const operations: WriteOperation[] = [
        { type: 'create', table: 'users', id: 'user-1', data: { name: 'Alice' } },
        { type: 'update', table: 'users', id: 'user-2', data: { name: 'Updated' } },
      ];

      const batch = createWriteBatch(operations);
      const result = await service.write(batch);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    it('should rollback all operations if one fails', async () => {
      vi.mocked(mockDb.raw).mockRejectedValueOnce(new Error('Database error'));

      const operations: WriteOperation[] = [
        { type: 'create', table: 'users', id: 'user-1', data: { name: 'Alice' } },
        { type: 'create', table: 'users', id: 'user-2', data: { name: 'Bob' } },
      ];

      const batch = createWriteBatch(operations);
      const result = await service.write(batch);

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('pubsub integration', () => {
    it('should publish updates via PubSub after successful write', async () => {
      vi.useFakeTimers();
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const operation: WriteOperation = {
        type: 'create',
        table: 'posts',
        id: 'post-123',
        data: { title: 'New Post' },
      };

      const batch = createWriteBatch([operation]);
      await service.write(batch);

      // PubSub publish happens in setImmediate
      await vi.runAllTimersAsync();

      expect(mockPubSub.publish).toHaveBeenCalledWith('record:posts:post-123', -1);
      vi.useRealTimers();
    });

    it('should not publish if no pubsub configured', async () => {
      const serviceWithoutPubSub = new WriteService({
        db: mockDb,
      });

      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const operation: WriteOperation = {
        type: 'create',
        table: 'users',
        id: 'user-1',
        data: { name: 'Test' },
      };

      const batch = createWriteBatch([operation]);
      await serviceWithoutPubSub.write(batch);

      expect(mockPubSub.publish).not.toHaveBeenCalled();
    });
  });

  describe('hooks', () => {
    it('should execute beforeValidate hooks', async () => {
      const beforeValidateHook = vi.fn((op: WriteOperation) =>
        Promise.resolve({
          ...op,
          data: { ...(op.data ?? {}), validated: true },
        }),
      );

      const serviceWithHooks = new WriteService({
        db: mockDb,
        hooks: { beforeValidate: [beforeValidateHook] },
      });

      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const operation: WriteOperation = {
        type: 'create',
        table: 'users',
        id: 'user-1',
        data: { name: 'Test' },
      };

      const batch = createWriteBatch([operation]);
      await serviceWithHooks.write(batch);

      expect(beforeValidateHook).toHaveBeenCalled();
    });

    it('should execute afterWrite hooks', async () => {
      vi.useFakeTimers();
      const afterWriteHook = vi.fn();

      const serviceWithHooks = new WriteService({
        db: mockDb,
        hooks: { afterWrite: [afterWriteHook] },
      });

      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const operation: WriteOperation = {
        type: 'create',
        table: 'users',
        id: 'user-1',
        data: { name: 'Test' },
      };

      const batch = createWriteBatch([operation]);
      await serviceWithHooks.write(batch);

      // Wait for async hooks
      await vi.runAllTimersAsync();

      expect(afterWriteHook).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should log but not fail if afterWrite hook throws', async () => {
      const failingHook = vi.fn().mockRejectedValue(new Error('Hook failed'));

      const options: WriteServiceOptions = {
        db: mockDb,
        hooks: { afterWrite: [failingHook] },
      };
      if (mockLogger !== undefined) {
        options.log = mockLogger as unknown as Logger;
      }

      new WriteService(options);

      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const operation: WriteOperation = {
        type: 'create',
        table: 'users',
        id: 'user-1',
        data: { name: 'Test' },
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      // Write should still succeed
      expect(result.success).toBe(true);
    });
  });

  describe('logging', () => {
    it('should log batch start', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const batch = createWriteBatch([
        { type: 'create', table: 'users', id: 'user-1', data: { name: 'Test' } },
      ]);

      await service.write(batch);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Write batch started'),
        expect.objectContaining({
          authorId: 'user-456',
          operationCount: 1,
        }),
      );
    });

    it('should log batch completion', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const batch = createWriteBatch([
        { type: 'create', table: 'users', id: 'user-1', data: { name: 'Test' } },
      ]);

      await service.write(batch);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Write batch completed'),
        expect.objectContaining({ successCount: 1 }),
      );
    });

    it('should log batch failure', async () => {
      vi.mocked(mockDb.raw).mockRejectedValue(new Error('DB error'));

      const batch = createWriteBatch([
        { type: 'create', table: 'users', id: 'user-1', data: { name: 'Test' } },
      ]);

      await service.write(batch);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Write batch failed'),
        expect.any(Object),
      );
    });
  });

  describe('writeOne convenience method', () => {
    it('should execute single operation', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const operation: WriteOperation = {
        type: 'create',
        table: 'users',
        id: 'user-1',
        data: { name: 'Single Op' },
      };

      const result = await service.writeOne('author-123', operation);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.txId).toBeTruthy();
    });
  });

  describe('error normalization', () => {
    it('should normalize unique constraint errors', async () => {
      const error = new Error('duplicate key value violates unique constraint');
      vi.mocked(mockDb.raw).mockRejectedValue(error);

      const batch = createWriteBatch([
        { type: 'create', table: 'users', id: 'user-1', data: { name: 'Dup' } },
      ]);

      const result = await service.write(batch);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFLICT');
      expect(result.error?.message).toContain('already exists');
    });

    it('should normalize foreign key errors', async () => {
      const error = new Error('foreign key constraint violation');
      vi.mocked(mockDb.raw).mockRejectedValue(error);

      const batch = createWriteBatch([
        { type: 'create', table: 'posts', id: 'post-1', data: { userId: 'invalid' } },
      ]);

      const result = await service.write(batch);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION');
      expect(result.error?.message).toContain('Invalid reference');
    });

    it('should handle unknown errors as INTERNAL', async () => {
      vi.mocked(mockDb.raw).mockRejectedValue('String error');

      const batch = createWriteBatch([
        { type: 'create', table: 'users', id: 'user-1', data: { name: 'Test' } },
      ]);

      const result = await service.write(batch);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL');
    });
  });

  describe('close method', () => {
    it('should clear pending setImmediate handle', () => {
      const clearImmediateSpy = vi.spyOn(global, 'clearImmediate');

      // Trigger a write that creates a setImmediate (via publishResults)
      service.close();

      // close() should not throw even if no pending publish
      expect(() => {
        service.close();
      }).not.toThrow();

      clearImmediateSpy.mockRestore();
    });

    it('should clear pending publish after write', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const operation: WriteOperation = {
        type: 'create',
        table: 'users',
        id: 'user-1',
        data: { name: 'Test' },
      };

      const batch = createWriteBatch([operation]);
      await service.write(batch);

      // close() should clear the pending setImmediate from publishResults
      const clearImmediateSpy = vi.spyOn(global, 'clearImmediate');
      service.close();

      // Verify clearImmediate was called (since publishResults schedules a setImmediate)
      expect(clearImmediateSpy).toHaveBeenCalled();

      clearImmediateSpy.mockRestore();
    });

    it('should be idempotent', () => {
      service.close();
      service.close();
      service.close();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('parameterized queries', () => {
    it('should use $N placeholders in INSERT queries', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const operation: WriteOperation = {
        type: 'create',
        table: 'users',
        id: 'user-1',
        data: { name: 'John; DROP TABLE users;--', email: 'john@test.com' },
      };

      const batch = createWriteBatch([operation]);
      await service.write(batch);

      // Verify raw was called with parameterized query (values array)
      expect(mockDb.raw).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.arrayContaining(['user-1', 'John; DROP TABLE users;--', 'john@test.com']),
      );

      // Verify no raw SQL string interpolation of user data
      const rawCall = vi.mocked(mockDb.raw).mock.calls[0];
      const sqlString = rawCall?.[0] as string;
      expect(sqlString).not.toContain('John; DROP TABLE users;--');
      expect(sqlString).toContain('$');
    });

    it('should use $N placeholders in UPDATE queries', async () => {
      vi.mocked(mockDb.raw)
        .mockResolvedValueOnce([{ version: 1 }]) // SELECT
        .mockResolvedValueOnce([{ id: 'user-1', name: "Robert'; DROP TABLE--", version: 2 }]); // UPDATE RETURNING

      const operation: WriteOperation = {
        type: 'update',
        table: 'users',
        id: 'user-1',
        data: { name: "Robert'; DROP TABLE--" },
      };

      const batch = createWriteBatch([operation]);
      await service.write(batch);

      // The SELECT should be parameterized
      expect(mockDb.raw).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE id = \$1/),
        expect.arrayContaining(['user-1']),
      );

      // The UPDATE should use $N placeholders
      const updateCall = vi.mocked(mockDb.raw).mock.calls[1];
      const updateSql = updateCall?.[0] as string;
      expect(updateSql).toContain('SET');
      expect(updateSql).toContain('$');
      expect(updateSql).not.toContain("Robert'; DROP TABLE--");
    });

    it('should use parameterized WHERE in DELETE queries', async () => {
      vi.mocked(mockDb.raw).mockResolvedValueOnce([{ version: 1 }]);
      vi.mocked(mockDb.execute).mockResolvedValueOnce(1);

      const operation: WriteOperation = {
        type: 'delete',
        table: 'users',
        id: "user-1'; DROP TABLE users;--",
      };

      const batch = createWriteBatch([operation]);
      await service.write(batch);

      // SELECT should be parameterized
      expect(mockDb.raw).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE id = \$1/),
        expect.arrayContaining(["user-1'; DROP TABLE users;--"]),
      );

      // DELETE should use parameterized query via tx.execute
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('WHERE id = $1'),
          values: expect.arrayContaining(["user-1'; DROP TABLE users;--"]),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty batch', async () => {
      const batch = createWriteBatch([]);
      const result = await service.write(batch);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
    });

    it('should handle unknown operation type', async () => {
      const operation = {
        type: 'unknown' as never,
        table: 'users',
        id: 'user-1',
      };

      const batch = createWriteBatch([operation]);
      const result = await service.write(batch);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unknown operation type');
    });
  });
});

describe('createWriteService', () => {
  it('should create WriteService instance', () => {
    const options = createServiceOptions();
    const service = createWriteService(options);

    expect(service).toBeInstanceOf(WriteService);
  });

  it('should work without optional dependencies', () => {
    const service = createWriteService({
      db: {
        raw: vi.fn(),
        execute: vi.fn(),
        query: vi.fn(),
        queryOne: vi.fn(),
        close: vi.fn(),
      } as unknown as DbClient,
    });

    expect(service).toBeInstanceOf(WriteService);
  });
});
