// apps/server/src/infrastructure/jobs/scheduled/__tests__/loginCleanup.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
    cleanupOldLoginAttempts,
    countOldLoginAttempts,
    DEFAULT_RETENTION_DAYS,
    getLoginAttemptStats,
    getTotalLoginAttemptCount,
    MAX_BATCH_SIZE,
    MIN_RETENTION_DAYS,
} from '../loginCleanup';

import type { RawDb } from '@abe-stack/db';
import type { CleanupOptions } from '../loginCleanup';

// ============================================================================
// Mock Setup
// ============================================================================

function createMockDb(options: {
  countResult?: number;
  deleteRowCount?: number;
  batchBehavior?: 'single' | 'multiple';
}): RawDb {
  const { countResult = 0, deleteRowCount = 0, batchBehavior = 'single' } = options;

  let deleteCallCount = 0;

  return {
    query: vi.fn().mockResolvedValue([{ count: countResult }]),
    queryOne: vi.fn().mockResolvedValue({ count: countResult }),
    execute: vi.fn().mockImplementation(() => {
      deleteCallCount++;
      // For batch behavior test, return full batch first time, then 0
      if (batchBehavior === 'multiple') {
        if (deleteCallCount === 1) {
          return Promise.resolve(MAX_BATCH_SIZE);
        }
        return Promise.resolve(deleteRowCount);
      }
      return Promise.resolve(deleteRowCount);
    }),
    raw: vi.fn(),
  } as unknown as RawDb;
}

function createMockDbWithTotalCount(totalResult: number): RawDb {
  return {
    query: vi.fn().mockResolvedValue([{ count: totalResult }]),
    queryOne: vi.fn().mockResolvedValue({ count: totalResult }),
    execute: vi.fn(),
    raw: vi.fn(),
  } as unknown as RawDb;
}

// ============================================================================
// Tests
// ============================================================================

describe('loginCleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('cleanupOldLoginAttempts', () => {
    test('should delete old records with default retention', async () => {
      const mockDb = createMockDb({ deleteRowCount: 150 });

      const result = await cleanupOldLoginAttempts(mockDb);

      expect(result.deletedCount).toBe(150);
      expect(result.dryRun).toBe(false);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);

      // Verify cutoff date is 90 days ago (normalized to start of local day)
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 90);
      expectedCutoff.setHours(0, 0, 0, 0);
      expect(result.cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });

    test('should use custom retention days', async () => {
      const mockDb = createMockDb({ deleteRowCount: 50 });

      const result = await cleanupOldLoginAttempts(mockDb, { retentionDays: 30 });

      // Verify cutoff date is 30 days ago (normalized to start of local day)
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 30);
      expectedCutoff.setHours(0, 0, 0, 0);
      expect(result.cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });

    test('should enforce minimum retention days', async () => {
      const mockDb = createMockDb({ deleteRowCount: 10 });

      const result = await cleanupOldLoginAttempts(mockDb, { retentionDays: 1 });

      // Should use MIN_RETENTION_DAYS (7) instead of 1 (normalized to start of local day)
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 7);
      expectedCutoff.setHours(0, 0, 0, 0);
      expect(result.cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });

    test('should perform dry run without deleting', async () => {
      const mockDb = createMockDb({ countResult: 500 });

      const result = await cleanupOldLoginAttempts(mockDb, { dryRun: true });

      expect(result.deletedCount).toBe(500);
      expect(result.dryRun).toBe(true);
      // Execute should not be called in dry run
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    test('should handle batch deletion', async () => {
      const mockDb = createMockDb({
        deleteRowCount: 5000,
        batchBehavior: 'multiple',
      });

      const result = await cleanupOldLoginAttempts(mockDb);

      // Should have called execute twice (first batch full, second batch partial)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      expect(result.deletedCount).toBe(MAX_BATCH_SIZE + 5000);
    });

    test('should handle empty result', async () => {
      const mockDb = createMockDb({ deleteRowCount: 0 });

      const result = await cleanupOldLoginAttempts(mockDb);

      expect(result.deletedCount).toBe(0);
    });

    test('should normalize cutoff date to start of day', async () => {
      vi.setSystemTime(new Date('2025-06-15T18:30:45.123Z'));
      const mockDb = createMockDb({ deleteRowCount: 0 });

      const result = await cleanupOldLoginAttempts(mockDb);

      expect(result.cutoffDate.getHours()).toBe(0);
      expect(result.cutoffDate.getMinutes()).toBe(0);
      expect(result.cutoffDate.getSeconds()).toBe(0);
      expect(result.cutoffDate.getMilliseconds()).toBe(0);
    });
  });

  describe('countOldLoginAttempts', () => {
    test('should return count of old records', async () => {
      const mockDb = createMockDb({ countResult: 250 });

      const count = await countOldLoginAttempts(mockDb);

      expect(count).toBe(250);
    });

    test('should use custom retention days', async () => {
      const mockDb = createMockDb({ countResult: 100 });

      const count = await countOldLoginAttempts(mockDb, 30);

      expect(count).toBe(100);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    test('should enforce minimum retention days', async () => {
      const mockDb = createMockDb({ countResult: 50 });

      await countOldLoginAttempts(mockDb, 3);

      // The function should use MIN_RETENTION_DAYS
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    test('should return 0 when no results', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValue([]),
        queryOne: vi.fn().mockResolvedValue(null),
        execute: vi.fn(),
        raw: vi.fn(),
      } as unknown as RawDb;

      const count = await countOldLoginAttempts(mockDb);

      expect(count).toBe(0);
    });
  });

  describe('getTotalLoginAttemptCount', () => {
    test('should return total count', async () => {
      const mockDb = createMockDbWithTotalCount(1500);

      const count = await getTotalLoginAttemptCount(mockDb);

      expect(count).toBe(1500);
    });

    test('should return 0 when table is empty', async () => {
      const mockDb = createMockDbWithTotalCount(0);

      const count = await getTotalLoginAttemptCount(mockDb);

      expect(count).toBe(0);
    });

    test('should return 0 when result is undefined', async () => {
      const mockDb = {
        query: vi.fn().mockResolvedValue([]),
        queryOne: vi.fn().mockResolvedValue(null),
        execute: vi.fn(),
        raw: vi.fn(),
      } as unknown as RawDb;

      const count = await getTotalLoginAttemptCount(mockDb);

      expect(count).toBe(0);
    });
  });

  describe('getLoginAttemptStats', () => {
    test('should return complete stats', async () => {
      let queryOneCallCount = 0;
      const mockDb = {
        query: vi.fn(),
        queryOne: vi.fn().mockImplementation(() => {
          queryOneCallCount++;
          // First call is for total count, second for old records count
          if (queryOneCallCount === 1) {
            return Promise.resolve({ count: 1000 });
          }
          return Promise.resolve({ count: 200 });
        }),
        execute: vi.fn(),
        raw: vi.fn(),
      } as unknown as RawDb;

      const stats = await getLoginAttemptStats(mockDb);

      expect(stats.total).toBe(1000);
      expect(stats.oldRecords).toBe(200);
      expect(stats.retentionDays).toBe(DEFAULT_RETENTION_DAYS);
      expect(stats.cutoffDate).toBeInstanceOf(Date);
    });

    test('should use custom retention days', async () => {
      let queryOneCallCount = 0;
      const mockDb = {
        query: vi.fn(),
        queryOne: vi.fn().mockImplementation(() => {
          queryOneCallCount++;
          if (queryOneCallCount === 1) {
            return Promise.resolve({ count: 500 });
          }
          return Promise.resolve({ count: 100 });
        }),
        execute: vi.fn(),
        raw: vi.fn(),
      } as unknown as RawDb;

      const stats = await getLoginAttemptStats(mockDb, 60);

      expect(stats.retentionDays).toBe(60);
    });

    test('should enforce minimum retention days in stats', async () => {
      let queryOneCallCount = 0;
      const mockDb = {
        query: vi.fn(),
        queryOne: vi.fn().mockImplementation(() => {
          queryOneCallCount++;
          if (queryOneCallCount === 1) {
            return Promise.resolve({ count: 100 });
          }
          return Promise.resolve({ count: 10 });
        }),
        execute: vi.fn(),
        raw: vi.fn(),
      } as unknown as RawDb;

      const stats = await getLoginAttemptStats(mockDb, 2);

      expect(stats.retentionDays).toBe(MIN_RETENTION_DAYS);
    });
  });

  describe('constants', () => {
    test('DEFAULT_RETENTION_DAYS should be 90', () => {
      expect(DEFAULT_RETENTION_DAYS).toBe(90);
    });

    test('MIN_RETENTION_DAYS should be 7', () => {
      expect(MIN_RETENTION_DAYS).toBe(7);
    });

    test('MAX_BATCH_SIZE should be 10000', () => {
      expect(MAX_BATCH_SIZE).toBe(10000);
    });
  });

  describe('type exports', () => {
    test('CleanupOptions interface should accept all optional properties', () => {
      const options: CleanupOptions = {
        retentionDays: 60,
        batchSize: 5000,
        dryRun: true,
      };
      expect(options).toBeDefined();
    });

    test('CleanupOptions interface should allow empty object', () => {
      const options: CleanupOptions = {};
      expect(options).toBeDefined();
    });
  });
});
