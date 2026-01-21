// apps/server/src/infrastructure/data/database/utils/__tests__/transaction.test.ts
import { describe, expect, test, vi } from 'vitest';

import { isInTransaction, withTransaction } from '../transaction';

import type { DbClient } from '../../client';

type TransactionCallback<T> = (tx: DbClient) => Promise<T>;

describe('withTransaction', () => {
  test('should execute callback within transaction and return result', async () => {
    const expectedResult = { id: 'user-123', name: 'Test User' };
    const callback = vi.fn().mockResolvedValue(expectedResult);

    const mockTx = { query: vi.fn() };
    const mockTransaction = vi.fn().mockImplementation(async (cb: TransactionCallback<unknown>) => {
      return cb(mockTx as unknown as DbClient);
    });
    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    const result = await withTransaction(mockDb, callback);

    expect(result).toEqual(expectedResult);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(mockTx);
  });

  test('should propagate errors from callback', async () => {
    const error = new Error('Database operation failed');
    const callback = vi.fn().mockRejectedValue(error);

    const mockTransaction = vi.fn().mockImplementation(async (cb: TransactionCallback<unknown>) => {
      return cb({} as unknown as DbClient);
    });
    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    await expect(withTransaction(mockDb, callback)).rejects.toThrow('Database operation failed');
  });

  test('should handle synchronous exceptions in callback', async () => {
    const callback = vi.fn().mockImplementation(() => {
      throw new Error('Sync error');
    });

    const mockTransaction = vi.fn().mockImplementation(async (cb: TransactionCallback<unknown>) => {
      return cb({} as unknown as DbClient);
    });
    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    await expect(withTransaction(mockDb, callback)).rejects.toThrow('Sync error');
  });

  test('should pass transaction client to callback', async () => {
    const mockTx = {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      select: vi.fn(),
    };
    const callback = vi.fn().mockImplementation((tx: unknown) => {
      expect(tx).toBe(mockTx);
      return Promise.resolve('success');
    });

    const mockTransaction = vi.fn().mockImplementation(async (cb: TransactionCallback<unknown>) => {
      return cb(mockTx as unknown as DbClient);
    });
    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    await withTransaction(mockDb, callback);

    expect(callback).toHaveBeenCalledWith(mockTx);
  });

  test('should handle null return from callback', async () => {
    const callback = vi.fn().mockResolvedValue(null);

    const mockTransaction = vi.fn().mockImplementation(async (cb: TransactionCallback<unknown>) => {
      return cb({} as unknown as DbClient);
    });
    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    const result = await withTransaction(mockDb, callback);

    expect(result).toBeNull();
  });

  test('should handle undefined return from callback', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    const mockTransaction = vi.fn().mockImplementation(async (cb: TransactionCallback<unknown>) => {
      return cb({} as unknown as DbClient);
    });
    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    const result = await withTransaction(mockDb, callback);

    expect(result).toBeUndefined();
  });

  test('should handle complex return types', async () => {
    const complexResult = {
      users: [{ id: '1' }, { id: '2' }],
      metadata: { total: 2, page: 1 },
      nested: { deep: { value: true } },
    };
    const callback = vi.fn().mockResolvedValue(complexResult);

    const mockTransaction = vi.fn().mockImplementation(async (cb: TransactionCallback<unknown>) => {
      return cb({} as unknown as DbClient);
    });
    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    const result = await withTransaction(mockDb, callback);

    expect(result).toEqual(complexResult);
  });
});

describe('transaction rollback behavior', () => {
  test('should rollback when callback throws after performing operations', async () => {
    // Track whether rollback was triggered (Drizzle rolls back automatically on throw)
    const operationsPerformed: string[] = [];
    let transactionRolledBack = false;

    const mockTx = {
      insert: vi.fn().mockImplementation(() => {
        operationsPerformed.push('insert');
        return { values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([]) };
      }),
      update: vi.fn().mockImplementation(() => {
        operationsPerformed.push('update');
        return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) };
      }),
    };

    // Simulate Drizzle's transaction behavior: rollback on error
    const mockTransaction = vi.fn().mockImplementation(async (cb: TransactionCallback<unknown>) => {
      try {
        return await cb(mockTx as unknown as DbClient);
      } catch (error) {
        // In real Drizzle, this is where rollback happens automatically
        transactionRolledBack = true;
        throw error;
      }
    });

    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    // Callback that performs operations then throws
    const callback = vi
      .fn()
      .mockImplementation(async (tx: { insert: () => void; update: () => void }) => {
        tx.insert(); // First operation succeeds
        tx.update(); // Second operation succeeds
        throw new Error('Business logic validation failed');
      });

    await expect(withTransaction(mockDb, callback)).rejects.toThrow(
      'Business logic validation failed',
    );

    // Verify operations were attempted
    expect(operationsPerformed).toEqual(['insert', 'update']);
    // Verify rollback was triggered
    expect(transactionRolledBack).toBe(true);
  });

  test('should not commit when error occurs mid-transaction', async () => {
    let commitCalled = false;

    const mockTransaction = vi.fn().mockImplementation(async (cb: TransactionCallback<unknown>) => {
      const result = await cb({} as unknown as DbClient);
      // Only reach commit if no error (if cb throws, we never get here)
      commitCalled = true;
      return result;
    });

    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    const callback = vi.fn().mockRejectedValue(new Error('Failed'));

    await expect(withTransaction(mockDb, callback)).rejects.toThrow('Failed');

    // Verify commit was never reached
    expect(commitCalled).toBe(false);
  });

  test('should propagate original error after rollback', async () => {
    class CustomDatabaseError extends Error {
      constructor(
        message: string,
        public code: string,
      ) {
        super(message);
        this.name = 'CustomDatabaseError';
      }
    }

    const originalError = new CustomDatabaseError(
      'Unique constraint violation',
      'UNIQUE_VIOLATION',
    );

    const mockTransaction = vi.fn().mockImplementation(async (cb: TransactionCallback<unknown>) => {
      // Transaction will propagate any error from the callback
      return await cb({} as unknown as DbClient);
    });

    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    const callback = vi.fn().mockRejectedValue(originalError);

    try {
      await withTransaction(mockDb, callback);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBe(originalError);
      expect((error as CustomDatabaseError).code).toBe('UNIQUE_VIOLATION');
    }
  });

  test('should handle error thrown after multiple successful operations', async () => {
    const operationResults: string[] = [];

    const mockTx = {
      query: vi.fn().mockImplementation(async (queryStr: string) => {
        operationResults.push(`query:${queryStr}`);
        return [];
      }),
    };

    const mockTransaction = vi.fn().mockImplementation(async (cb: TransactionCallback<unknown>) => {
      return await cb(mockTx as unknown as DbClient);
    });

    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    const callback = vi
      .fn()
      .mockImplementation(async (tx: { query: (q: string) => Promise<unknown[]> }) => {
        await tx.query('INSERT INTO users');
        await tx.query('INSERT INTO tokens');
        await tx.query('UPDATE counters');
        // Error after 3 successful operations
        throw new Error('Final validation failed');
      });

    await expect(withTransaction(mockDb, callback)).rejects.toThrow('Final validation failed');

    // All operations were attempted before error
    expect(operationResults).toHaveLength(3);
  });
});

describe('isInTransaction', () => {
  test('should always return true', () => {
    const mockDb = {} as Parameters<typeof isInTransaction>[0];

    const result = isInTransaction(mockDb);

    expect(result).toBe(true);
  });

  test('should return true regardless of db client state', () => {
    // Test with various mock shapes to ensure it always returns true
    const mocks = [
      {},
      { query: vi.fn() },
      { transaction: vi.fn() },
      { _isTransaction: true },
      { _isTransaction: false },
    ];

    mocks.forEach((mockDb) => {
      const result = isInTransaction(mockDb as unknown as Parameters<typeof isInTransaction>[0]);
      expect(result).toBe(true);
    });
  });
});
