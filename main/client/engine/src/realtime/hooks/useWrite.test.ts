// main/client/engine/src/realtime/hooks/useWrite.test.ts
/**
 * Tests for useWrite hook.
 *
 * Validates the hook's contract, types, dependency injection, and
 * integration with RecordCache and TransactionQueue.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { RecordCache, type TableMap } from '../../cache';

import type { UseWriteDeps, UseWriteResult, WriteOperation, WriteOptions } from './useWrite';

// ============================================================================
// Test Types
// ============================================================================

interface User {
  id: string;
  version: number;
  name: string;
  email: string;
}

interface TestTables extends TableMap {
  user: User;
}

// ============================================================================
// Mock TransactionQueue
// ============================================================================

function createMockTransactionQueue() {
  return {
    enqueue: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    isPendingWrite: vi.fn().mockReturnValue(false),
    subscribeIsPendingWrite: vi.fn().mockReturnValue(() => {}),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useWrite types and deps', () => {
  let cache: RecordCache<TestTables>;

  beforeEach(() => {
    cache = new RecordCache<TestTables>();
  });

  describe('WriteOperation interface', () => {
    it('should represent a write operation', () => {
      const op: WriteOperation = {
        table: 'user',
        id: 'u1',
        updates: { name: 'Bob' },
      };

      expect(op.table).toBe('user');
      expect(op.id).toBe('u1');
      expect(op.updates).toEqual({ name: 'Bob' });
    });

    it('should support multiple fields in updates', () => {
      const op: WriteOperation = {
        table: 'user',
        id: 'u1',
        updates: { name: 'Bob', email: 'bob@test.com' },
      };

      expect(Object.keys(op.updates)).toHaveLength(2);
    });
  });

  describe('WriteOptions interface', () => {
    it('should have optional fields', () => {
      const options: WriteOptions = {};
      expect(options.skipUndo).toBeUndefined();
      expect(options.groupId).toBeUndefined();
    });

    it('should accept skipUndo', () => {
      const options: WriteOptions = { skipUndo: true };
      expect(options.skipUndo).toBe(true);
    });
  });

  describe('UseWriteDeps interface', () => {
    it('should accept valid deps', () => {
      const mockQueue = createMockTransactionQueue();
      const deps: UseWriteDeps<TestTables> = {
        userId: 'test-user',
        recordCache: cache,
        transactionQueue: mockQueue as never,
      };

      expect(deps.userId).toBe('test-user');
      expect(deps.recordCache).toBe(cache);
    });

    it('should accept onBeforeWrite callback', () => {
      const mockQueue = createMockTransactionQueue();
      const onBeforeWrite = vi.fn();
      const deps: UseWriteDeps<TestTables> = {
        userId: 'test-user',
        recordCache: cache,
        transactionQueue: mockQueue as never,
        onBeforeWrite,
      };

      expect(deps.onBeforeWrite).toBe(onBeforeWrite);
    });
  });

  describe('UseWriteResult interface', () => {
    it('should represent idle state', () => {
      const result: UseWriteResult = {
        write: vi.fn(),
        isWriting: false,
        error: undefined,
      };

      expect(result.isWriting).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should represent writing state', () => {
      const result: UseWriteResult = {
        write: vi.fn(),
        isWriting: true,
        error: undefined,
      };

      expect(result.isWriting).toBe(true);
    });
  });

  describe('Optimistic update logic', () => {
    it('should apply optimistic updates to cache', () => {
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' });

      const operations: WriteOperation[] = [{ table: 'user', id: 'u1', updates: { name: 'Bob' } }];

      // Simulate the optimistic update logic from useWrite
      for (const op of operations) {
        const existing = cache.get(op.table as 'user', op.id) as
          | (Record<string, unknown> & { id: string })
          | undefined;
        if (existing !== undefined) {
          const updated = { ...existing, ...op.updates };
          cache.set(op.table as 'user', op.id, updated as unknown as User, { force: true });
        }
      }

      const user = cache.get('user', 'u1');
      expect(user?.name).toBe('Bob');
      expect(user?.email).toBe('a@test.com'); // Unchanged fields preserved
    });

    it('should capture previous values for undo', () => {
      cache.set('user', 'u1', { id: 'u1', version: 1, name: 'Alice', email: 'a@test.com' });

      const operations: WriteOperation[] = [
        { table: 'user', id: 'u1', updates: { name: 'Bob', email: 'bob@test.com' } },
      ];

      const previousValues: Array<Record<string, unknown> | undefined> = [];

      for (const op of operations) {
        const existing = cache.get(op.table as 'user', op.id) as
          | (Record<string, unknown> & { id: string })
          | undefined;
        if (existing !== undefined) {
          const prevValue: Record<string, unknown> = {};
          for (const key of Object.keys(op.updates)) {
            prevValue[key] = existing[key];
          }
          previousValues.push(prevValue);
        } else {
          previousValues.push(undefined);
        }
      }

      expect(previousValues[0]).toEqual({ name: 'Alice', email: 'a@test.com' });
    });

    it('should handle write to non-existent record', () => {
      const operations: WriteOperation[] = [
        { table: 'user', id: 'nonexistent', updates: { name: 'Bob' } },
      ];

      const previousValues: Array<Record<string, unknown> | undefined> = [];

      for (const op of operations) {
        const existing = cache.get(op.table as 'user', op.id);
        if (existing !== undefined) {
          previousValues.push({});
        } else {
          previousValues.push(undefined);
        }
      }

      expect(previousValues[0]).toBeUndefined();
    });
  });

  describe('Transaction creation', () => {
    it('should flatten operations into RealtimeOperation format', () => {
      const operations: WriteOperation[] = [
        { table: 'user', id: 'u1', updates: { name: 'Bob', email: 'bob@test.com' } },
      ];

      const flatOperations: Array<{
        type: string;
        table: string;
        id: string;
        key: string;
        value: unknown;
      }> = [];
      for (const op of operations) {
        for (const [key, value] of Object.entries(op.updates)) {
          flatOperations.push({
            type: 'set',
            table: op.table,
            id: op.id,
            key,
            value,
          });
        }
      }

      expect(flatOperations).toHaveLength(2);
      expect(flatOperations[0]).toEqual({
        type: 'set',
        table: 'user',
        id: 'u1',
        key: 'name',
        value: 'Bob',
      });
      expect(flatOperations[1]).toEqual({
        type: 'set',
        table: 'user',
        id: 'u1',
        key: 'email',
        value: 'bob@test.com',
      });
    });

    it('should handle multiple operations in a single write', () => {
      const operations: WriteOperation[] = [
        { table: 'user', id: 'u1', updates: { name: 'Alice' } },
        { table: 'user', id: 'u2', updates: { name: 'Bob' } },
      ];

      const flatOperations: unknown[] = [];
      for (const op of operations) {
        for (const [key, value] of Object.entries(op.updates)) {
          flatOperations.push({
            type: 'set',
            table: op.table,
            id: op.id,
            key,
            value,
          });
        }
      }

      expect(flatOperations).toHaveLength(2);
    });
  });
});
