// apps/server/src/infra/database/__tests__/transaction.test.ts
import { describe, expect, test, vi } from 'vitest';

import { isInTransaction, withTransaction } from '@database/transaction';

describe('withTransaction', () => {
  test('should execute callback within transaction and return result', async () => {
    const expectedResult = { id: 'user-123', name: 'Test User' };
    const callback = vi.fn().mockResolvedValue(expectedResult);

    const mockTx = { query: vi.fn() };
    const mockTransaction = vi.fn().mockImplementation(async (cb) => {
      return await cb(mockTx);
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

    const mockTransaction = vi.fn().mockImplementation(async (cb) => {
      return await cb({});
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

    const mockTransaction = vi.fn().mockImplementation(async (cb) => {
      return await cb({});
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
    const callback = vi.fn().mockImplementation(async (tx) => {
      expect(tx).toBe(mockTx);
      return 'success';
    });

    const mockTransaction = vi.fn().mockImplementation(async (cb) => {
      return await cb(mockTx);
    });
    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    await withTransaction(mockDb, callback);

    expect(callback).toHaveBeenCalledWith(mockTx);
  });

  test('should handle null return from callback', async () => {
    const callback = vi.fn().mockResolvedValue(null);

    const mockTransaction = vi.fn().mockImplementation(async (cb) => {
      return await cb({});
    });
    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    const result = await withTransaction(mockDb, callback);

    expect(result).toBeNull();
  });

  test('should handle undefined return from callback', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    const mockTransaction = vi.fn().mockImplementation(async (cb) => {
      return await cb({});
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

    const mockTransaction = vi.fn().mockImplementation(async (cb) => {
      return await cb({});
    });
    const mockDb = {
      transaction: mockTransaction,
    } as unknown as Parameters<typeof withTransaction>[0];

    const result = await withTransaction(mockDb, callback);

    expect(result).toEqual(complexResult);
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
      const result = isInTransaction(mockDb as Parameters<typeof isInTransaction>[0]);
      expect(result).toBe(true);
    });
  });
});
