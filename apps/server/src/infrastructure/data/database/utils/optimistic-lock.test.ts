// apps/server/src/infrastructure/data/database/utils/optimistic-lock.test.ts
import { describe, expect, test, vi } from 'vitest';

import {
  isOptimisticLockError,
  OptimisticLockError,
  updateUserWithVersion,
} from './optimistic-lock';

import type { RawDb } from '@abe-stack/db';

// Create mock db matching RawDb interface
function createMockDb() {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
  };
}

type MockDb = ReturnType<typeof createMockDb>;

function asMockDb(mock: MockDb): RawDb {
  return mock as unknown as RawDb;
}

describe('OptimisticLockError', () => {
  test('should create an error with default message', () => {
    const error = new OptimisticLockError(5);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OptimisticLockError);
    expect(error.message).toBe('Record was modified by another request');
    expect(error.name).toBe('OptimisticLockError');
    expect(error.statusCode).toBe(409);
    expect(error.currentVersion).toBe(5);
  });

  test('should create an error with custom message', () => {
    const error = new OptimisticLockError(3, 'Custom conflict message');

    expect(error.message).toBe('Custom conflict message');
    expect(error.currentVersion).toBe(3);
    expect(error.statusCode).toBe(409);
  });

  test('should preserve version 0', () => {
    const error = new OptimisticLockError(0);

    expect(error.currentVersion).toBe(0);
  });

  test('should have correct stack trace', () => {
    const error = new OptimisticLockError(1);

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('OptimisticLockError');
  });
});

describe('isOptimisticLockError', () => {
  test('should return true for OptimisticLockError instances', () => {
    const error = new OptimisticLockError(1);

    expect(isOptimisticLockError(error)).toBe(true);
  });

  test('should return false for regular Error', () => {
    const error = new Error('Some error');

    expect(isOptimisticLockError(error)).toBe(false);
  });

  test('should return false for null', () => {
    expect(isOptimisticLockError(null)).toBe(false);
  });

  test('should return false for undefined', () => {
    expect(isOptimisticLockError(undefined)).toBe(false);
  });

  test('should return false for string', () => {
    expect(isOptimisticLockError('error')).toBe(false);
  });

  test('should return false for object with similar shape', () => {
    const fakeError = {
      name: 'OptimisticLockError',
      statusCode: 409,
      currentVersion: 1,
      message: 'fake',
    };

    expect(isOptimisticLockError(fakeError)).toBe(false);
  });

  test('should return false for other Error subclasses', () => {
    class CustomError extends Error {
      statusCode = 409;
      currentVersion = 1;
    }
    const error = new CustomError('custom');

    expect(isOptimisticLockError(error)).toBe(false);
  });
});

describe('updateUserWithVersion', () => {
  const mockUserRow = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    version: 2,
    created_at: new Date(),
    updated_at: new Date(),
    role: 'user',
    password_hash: 'hash',
    email_verified: true,
    email_verified_at: new Date(),
  };

  test('should return updated user when version matches', async () => {
    const mockDb = createMockDb();
    // First queryOne returns the updated row
    mockDb.queryOne.mockResolvedValueOnce(mockUserRow);

    const result = await updateUserWithVersion(
      asMockDb(mockDb),
      'user-123',
      { name: 'Updated Name' },
      1,
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('user-123');
    expect(mockDb.queryOne).toHaveBeenCalledTimes(1);
  });

  test('should throw OptimisticLockError when version mismatch', async () => {
    const mockDb = createMockDb();
    // First queryOne returns null (version mismatch, no rows updated)
    mockDb.queryOne
      .mockResolvedValueOnce(null)
      // Second queryOne returns current version
      .mockResolvedValueOnce({ version: 5 });

    await expect(
      updateUserWithVersion(asMockDb(mockDb), 'user-123', { name: 'Updated Name' }, 1),
    ).rejects.toThrow(OptimisticLockError);

    // Reset mock to test again with error details
    mockDb.queryOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ version: 5 });

    try {
      await updateUserWithVersion(asMockDb(mockDb), 'user-123', { name: 'Updated Name' }, 1);
    } catch (error) {
      expect(isOptimisticLockError(error)).toBe(true);
      if (isOptimisticLockError(error)) {
        expect(error.currentVersion).toBe(5);
        expect(error.statusCode).toBe(409);
      }
    }
  });

  test('should throw Error when record not found', async () => {
    const mockDb = createMockDb();
    // First queryOne returns null (no rows updated)
    mockDb.queryOne
      .mockResolvedValueOnce(null)
      // Second queryOne returns null (record not found)
      .mockResolvedValueOnce(null);

    await expect(
      updateUserWithVersion(asMockDb(mockDb), 'nonexistent', { name: 'Test' }, 1),
    ).rejects.toThrow('Record not found');
  });

  test('should handle version 0 in error response', async () => {
    const mockDb = createMockDb();
    // First queryOne returns null (version mismatch)
    mockDb.queryOne
      .mockResolvedValueOnce(null)
      // Second queryOne returns version 0 (edge case)
      .mockResolvedValueOnce({ version: 0 });

    try {
      await updateUserWithVersion(asMockDb(mockDb), 'user-123', { name: 'Test' }, 1);
      // Should throw, so fail if we get here
      expect.fail('Should have thrown OptimisticLockError');
    } catch (error) {
      if (isOptimisticLockError(error)) {
        // Version 0 is valid
        expect(error.currentVersion).toBe(0);
      }
    }
  });
});
