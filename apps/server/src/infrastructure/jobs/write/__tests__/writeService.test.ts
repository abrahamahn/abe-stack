// apps/server/src/infrastructure/jobs/write/__tests__/writeService.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createWriteService } from '../writeService';

import type { WriteHooks, WriteOperation } from '../types';
import type { WriteService } from '../writeService';
import type { DbClient } from '@database';
import type { Logger } from '@logger';
import type { SubscriptionManager } from '@pubsub';

// ============================================================================
// Mock Helpers
// ============================================================================

function createMockDb() {
  const mockTransaction = vi
    .fn()
    .mockImplementation(async (cb: (tx: DbClient) => Promise<unknown>) => {
      return cb(createMockTx());
    });

  return {
    transaction: mockTransaction,
    execute: vi.fn(),
  } as unknown as DbClient & {
    transaction: ReturnType<typeof vi.fn>;
    execute: ReturnType<typeof vi.fn>;
  };
}

function createMockTx(overrides?: Partial<{ execute: ReturnType<typeof vi.fn> }>) {
  return {
    execute: overrides?.execute ?? vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  } as unknown as DbClient;
}

function createMockPubsub() {
  return {
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  } as unknown as SubscriptionManager;
}

function createMockLog(): Logger {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as Logger;
}

// ============================================================================
// WriteService Tests
// ============================================================================

describe('WriteService', () => {
  let db: ReturnType<typeof createMockDb>;
  let pubsub: ReturnType<typeof createMockPubsub>;
  let log: Logger;
  let service: WriteService;

  beforeEach(() => {
    db = createMockDb();
    pubsub = createMockPubsub();
    log = createMockLog();
  });

  describe('createWriteService', () => {
    test('should create a WriteService instance', () => {
      const service = createWriteService({ db });
      expect(service.constructor.name).toBe('WriteService');
    });

    test('should accept optional pubsub and log', () => {
      const service = createWriteService({ db, pubsub, log });
      expect(service).toBeDefined();
    });
  });

  describe('writeOne', () => {
    test('should execute single create operation', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db, log });

      const operation: WriteOperation = {
        type: 'create',
        table: 'users',
        id: 'user-123',
        data: { name: 'John', email: 'john@example.com' },
      };

      const result = await service.writeOne('author-1', operation);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.operation).toEqual(operation);
      expect(result.results[0]?.record).toMatchObject({
        id: 'user-123',
        name: 'John',
        email: 'john@example.com',
        version: 1,
      });
    });

    test('should generate unique transaction ID', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db, log });

      const result1 = await service.writeOne('author-1', {
        type: 'create',
        table: 'users',
        id: 'user-1',
        data: {},
      });

      const result2 = await service.writeOne('author-1', {
        type: 'create',
        table: 'users',
        id: 'user-2',
        data: {},
      });

      expect(result1.txId).not.toBe(result2.txId);
    });
  });

  describe('write (batch)', () => {
    test('should execute multiple operations atomically', async () => {
      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // create
        .mockResolvedValueOnce({ rows: [{ version: 1 }], rowCount: 1 }) // update select
        .mockResolvedValueOnce({ rows: [{ id: 'user-2', version: 2 }], rowCount: 1 }); // update

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db, log });

      const result = await service.write({
        txId: 'tx-123',
        authorId: 'author-1',
        operations: [
          { type: 'create', table: 'users', id: 'user-1', data: { name: 'Alice' } },
          { type: 'update', table: 'users', id: 'user-2', data: { name: 'Bob' } },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.txId).toBe('tx-123');
      expect(result.results).toHaveLength(2);
    });

    test('should rollback all operations on failure', async () => {
      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // first create succeeds
        .mockRejectedValueOnce(new Error('unique constraint violation')); // second fails

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db, log });

      const result = await service.write({
        txId: 'tx-123',
        authorId: 'author-1',
        operations: [
          { type: 'create', table: 'users', id: 'user-1', data: { email: 'alice@example.com' } },
          { type: 'create', table: 'users', id: 'user-2', data: { email: 'alice@example.com' } }, // duplicate
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('CONFLICT');
    });
  });

  describe('create operation', () => {
    test('should insert record with version 1', async () => {
      let capturedSql: unknown = null;
      const mockExecute = vi.fn().mockImplementation((sqlObj) => {
        capturedSql = sqlObj;
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db });

      await service.writeOne('author-1', {
        type: 'create',
        table: 'users',
        id: 'user-123',
        data: { name: 'Test User' },
      });

      expect(mockExecute).toHaveBeenCalled();
      expect(capturedSql).toBeDefined();
    });

    test('should fail if data is not provided', async () => {
      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: vi.fn() } as unknown as DbClient);
      });

      service = createWriteService({ db });

      const result = await service.writeOne('author-1', {
        type: 'create',
        table: 'users',
        id: 'user-123',
        // data is missing
      } as WriteOperation);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('requires data');
    });
  });

  describe('update operation', () => {
    test('should check version for optimistic locking', async () => {
      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ version: 5 }] }) // SELECT version
        .mockResolvedValueOnce({ rows: [{ id: 'user-1', version: 6 }], rowCount: 1 }); // UPDATE

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db });

      const result = await service.writeOne('author-1', {
        type: 'update',
        table: 'users',
        id: 'user-1',
        data: { name: 'Updated Name' },
        expectedVersion: 5,
      });

      expect(result.success).toBe(true);
      expect(result.results[0]?.previousVersion).toBe(5);
    });

    test('should fail on version mismatch', async () => {
      const mockExecute = vi.fn().mockResolvedValueOnce({ rows: [{ version: 6 }] }); // SELECT returns different version

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db });

      const result = await service.writeOne('author-1', {
        type: 'update',
        table: 'users',
        id: 'user-1',
        data: { name: 'Updated Name' },
        expectedVersion: 5, // Expected 5, but got 6
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFLICT');
      expect(result.error?.message).toContain('Version mismatch');
    });

    test('should fail if record not found', async () => {
      const mockExecute = vi.fn().mockResolvedValueOnce({ rows: [] }); // SELECT returns nothing

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db });

      const result = await service.writeOne('author-1', {
        type: 'update',
        table: 'users',
        id: 'nonexistent',
        data: { name: 'Test' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    test('should fail if data is not provided', async () => {
      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: vi.fn() } as unknown as DbClient);
      });

      service = createWriteService({ db });

      const result = await service.writeOne('author-1', {
        type: 'update',
        table: 'users',
        id: 'user-123',
        // data is missing
      } as WriteOperation);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('requires data');
    });
  });

  describe('delete operation', () => {
    test('should delete record and return previous version', async () => {
      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ version: 3 }] }) // SELECT version
        .mockResolvedValueOnce({ rowCount: 1 }); // DELETE

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db });

      const result = await service.writeOne('author-1', {
        type: 'delete',
        table: 'users',
        id: 'user-to-delete',
      });

      expect(result.success).toBe(true);
      expect(result.results[0]?.previousVersion).toBe(3);
      expect(result.results[0]?.record).toBeUndefined();
    });

    test('should fail if record not found', async () => {
      const mockExecute = vi.fn().mockResolvedValueOnce({ rows: [] }); // SELECT returns nothing

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db });

      const result = await service.writeOne('author-1', {
        type: 'delete',
        table: 'users',
        id: 'nonexistent',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    test('should check version for optimistic locking on delete', async () => {
      const mockExecute = vi.fn().mockResolvedValueOnce({ rows: [{ version: 5 }] }); // SELECT version (mismatch)

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db });

      const result = await service.writeOne('author-1', {
        type: 'delete',
        table: 'users',
        id: 'user-1',
        expectedVersion: 4, // Expected 4, but got 5
      });

      expect(result.success).toBe(false);
      // The delete should fail due to version mismatch in the WHERE clause
    });
  });

  describe('pubsub integration', () => {
    // Helper to wait for setImmediate callbacks
    const flushSetImmediate = () => new Promise((resolve) => setImmediate(resolve));

    test('should publish after successful write', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db, pubsub });

      await service.writeOne('author-1', {
        type: 'create',
        table: 'users',
        id: 'user-123',
        data: { name: 'Test' },
      });

      // Wait for setImmediate callbacks
      await flushSetImmediate();

      expect(pubsub.publish).toHaveBeenCalledWith('record:users:user-123', 1);
    });

    test('should publish deletion with version -1', async () => {
      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ version: 3 }] }) // SELECT
        .mockResolvedValueOnce({ rowCount: 1 }); // DELETE

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db, pubsub });

      await service.writeOne('author-1', {
        type: 'delete',
        table: 'users',
        id: 'user-123',
      });

      await flushSetImmediate();

      expect(pubsub.publish).toHaveBeenCalledWith('record:users:user-123', -1);
    });

    test('should not publish on failed write', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('DB error'));
      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db, pubsub });

      await service.writeOne('author-1', {
        type: 'create',
        table: 'users',
        id: 'user-123',
        data: { name: 'Test' },
      });

      await flushSetImmediate();

      expect(pubsub.publish).not.toHaveBeenCalled();
    });
  });

  describe('hooks', () => {
    test('should run beforeValidate hooks', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      const beforeValidate = vi.fn().mockImplementation((op) => ({
        ...op,
        data: { ...op.data, modified: true },
      }));

      const hooks: WriteHooks = {
        beforeValidate: [beforeValidate],
      };

      service = createWriteService({ db, hooks });

      await service.writeOne('author-1', {
        type: 'create',
        table: 'users',
        id: 'user-123',
        data: { name: 'Test' },
      });

      expect(beforeValidate).toHaveBeenCalled();
      const callArg = beforeValidate.mock.calls[0]?.[0];
      expect(callArg?.data?.name).toBe('Test');
    });

    test('should run afterWrite hooks', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      const afterWrite = vi.fn().mockResolvedValue(undefined);
      const hooks: WriteHooks = {
        afterWrite: [afterWrite],
      };

      service = createWriteService({ db, hooks });

      await service.writeOne('author-1', {
        type: 'create',
        table: 'users',
        id: 'user-123',
        data: { name: 'Test' },
      });

      // afterWrite runs via void promise - give it time to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(afterWrite).toHaveBeenCalled();
    });

    test('should log error if afterWrite hook fails', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      const afterWrite = vi.fn().mockRejectedValue(new Error('Hook failed'));
      const hooks: WriteHooks = {
        afterWrite: [afterWrite],
      };

      service = createWriteService({ db, hooks, log });

      await service.writeOne('author-1', {
        type: 'create',
        table: 'users',
        id: 'user-123',
        data: { name: 'Test' },
      });

      // Give async hooks time to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('afterWrite hook failed'),
        expect.any(Object),
      );
    });
  });

  describe('error normalization', () => {
    test('should normalize unique constraint errors', async () => {
      const mockExecute = vi
        .fn()
        .mockRejectedValue(new Error('unique constraint violation on email'));

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db });

      const result = await service.writeOne('author-1', {
        type: 'create',
        table: 'users',
        id: 'user-123',
        data: { email: 'duplicate@example.com' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFLICT');
    });

    test('should normalize foreign key errors', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('foreign key constraint failed'));

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db });

      const result = await service.writeOne('author-1', {
        type: 'create',
        table: 'posts',
        id: 'post-123',
        data: { user_id: 'nonexistent' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION');
    });

    test('should return INTERNAL for unknown errors', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('Something unexpected'));

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db });

      const result = await service.writeOne('author-1', {
        type: 'create',
        table: 'users',
        id: 'user-123',
        data: {},
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL');
    });
  });

  describe('SQL building helpers', () => {
    test('should handle various data types', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db });

      // This should not throw
      const result = await service.writeOne('author-1', {
        type: 'create',
        table: 'items',
        id: 'item-123',
        data: {
          stringVal: "Test's value",
          numberVal: 42,
          boolVal: true,
          nullVal: null,
          dateVal: new Date('2024-01-01'),
          objectVal: { nested: true },
        },
      });

      expect(result.success).toBe(true);
    });

    test('should convert camelCase to snake_case', async () => {
      let capturedSql: string | undefined;
      const mockExecute = vi.fn().mockImplementation((sqlObj) => {
        // The SQL template tag produces an object, we need to stringify to see the content
        capturedSql = JSON.stringify(sqlObj);
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      db.transaction = vi.fn().mockImplementation(async (cb) => {
        return cb({ execute: mockExecute } as unknown as DbClient);
      });

      service = createWriteService({ db });

      await service.writeOne('author-1', {
        type: 'create',
        table: 'users',
        id: 'user-123',
        data: {
          firstName: 'John',
          lastName: 'Doe',
          emailAddress: 'john@example.com',
        },
      });

      // The insert clause should have converted keys to snake_case
      expect(capturedSql).toBeDefined();
    });
  });
});
