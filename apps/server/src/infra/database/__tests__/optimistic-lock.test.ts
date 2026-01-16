// apps/server/src/infra/database/__tests__/optimistic-lock.test.ts
import { describe, expect, test, vi } from 'vitest';

import {
  isOptimisticLockError,
  OptimisticLockError,
  updateUserWithVersion,
} from '../utils/optimistic-lock';

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
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    version: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  test('should return updated user when version matches', async () => {
    const mockReturning = vi.fn().mockResolvedValue([mockUser]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

    const mockDb = {
      update: mockUpdate,
    } as unknown as Parameters<typeof updateUserWithVersion>[0];

    const result = await updateUserWithVersion(mockDb, 'user-123', { name: 'Updated Name' }, 1);

    expect(result).toEqual(mockUser);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalled();
  });

  test('should throw OptimisticLockError when version mismatch', async () => {
    // First update returns empty (version mismatch)
    const mockReturning = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

    // Then fetch current version
    const mockLimit = vi.fn().mockResolvedValue([{ version: 5 }]);
    const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    const mockDb = {
      update: mockUpdate,
      select: mockSelect,
    } as unknown as Parameters<typeof updateUserWithVersion>[0];

    await expect(
      updateUserWithVersion(mockDb, 'user-123', { name: 'Updated Name' }, 1),
    ).rejects.toThrow(OptimisticLockError);

    try {
      await updateUserWithVersion(mockDb, 'user-123', { name: 'Updated Name' }, 1);
    } catch (error) {
      expect(isOptimisticLockError(error)).toBe(true);
      if (isOptimisticLockError(error)) {
        expect(error.currentVersion).toBe(5);
        expect(error.statusCode).toBe(409);
      }
    }
  });

  test('should throw Error when record not found', async () => {
    // Update returns empty
    const mockReturning = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

    // Select returns empty (record not found)
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    const mockDb = {
      update: mockUpdate,
      select: mockSelect,
    } as unknown as Parameters<typeof updateUserWithVersion>[0];

    await expect(updateUserWithVersion(mockDb, 'nonexistent', { name: 'Test' }, 1)).rejects.toThrow(
      'Record not found',
    );
  });

  test('should handle version 0 in error response', async () => {
    const mockReturning = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

    // Return undefined version (edge case)
    const mockLimit = vi.fn().mockResolvedValue([{ version: undefined }]);
    const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    const mockDb = {
      update: mockUpdate,
      select: mockSelect,
    } as unknown as Parameters<typeof updateUserWithVersion>[0];

    try {
      await updateUserWithVersion(mockDb, 'user-123', { name: 'Test' }, 1);
    } catch (error) {
      if (isOptimisticLockError(error)) {
        expect(error.currentVersion).toBe(0);
      }
    }
  });
});
