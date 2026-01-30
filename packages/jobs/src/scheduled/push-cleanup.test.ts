// packages/jobs/src/scheduled/push-cleanup.test.ts
/**
 * Tests for Push Subscription Cleanup Job
 *
 * Verifies cleanup of expired and inactive push subscriptions with proper
 * categorization, batch processing, and statistics gathering.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  cleanupPushSubscriptions,
  getPushSubscriptionStats,
  countCleanupCandidates,
  DEFAULT_INACTIVE_DAYS,
  MIN_INACTIVE_DAYS,
  MAX_BATCH_SIZE,
} from './push-cleanup';

import type { RawDb } from '@abe-stack/db';

// ============================================================================
// Mock Modules
// ============================================================================

vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual('@abe-stack/db');
  return {
    ...actual,
    lt: vi.fn((field: string, value: unknown) => ({ field, op: 'lt', value })),
    eq: vi.fn((field: string, value: unknown) => ({ field, op: 'eq', value })),
    or: vi.fn((...conditions: unknown[]) => ({ type: 'or', conditions })),
    and: vi.fn((...conditions: unknown[]) => ({ type: 'and', conditions })),
    isNotNull: vi.fn((field: string) => ({ field, op: 'isNotNull' })),
    selectCount: vi.fn(() => ({
      where: vi.fn(() => ({
        toSql: vi.fn(() => ({ text: 'SELECT COUNT(*) ...', values: [] })),
      })),
      toSql: vi.fn(() => ({ text: 'SELECT COUNT(*)', values: [] })),
    })),
    PUSH_SUBSCRIPTIONS_TABLE: 'push_subscriptions',
  };
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock database client
 */
function createMockDb(): RawDb {
  return {
    query: vi.fn(),
    queryOne: vi.fn(),
    execute: vi.fn(),
    raw: vi.fn(),
    close: vi.fn(),
  } as unknown as RawDb;
}

// ============================================================================
// Tests
// ============================================================================

describe('cleanupPushSubscriptions', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('dry-run mode', () => {
    it('should count subscriptions to be deleted without actual deletion', async () => {
      vi.mocked(mockDb.queryOne)
        .mockResolvedValueOnce({ count: 10 }) // marked inactive
        .mockResolvedValueOnce({ count: 20 }) // stale
        .mockResolvedValueOnce({ count: 5 }); // expired

      const result = await cleanupPushSubscriptions(mockDb, { dryRun: true });

      expect(result.dryRun).toBe(true);
      expect(result.deletedCount).toBe(35); // 10 + 20 + 5
      expect(result.breakdown.markedInactive).toBe(10);
      expect(result.breakdown.inactive).toBe(20);
      expect(result.breakdown.expired).toBe(5);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should use default inactive days (90) for cutoff calculation', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const result = await cleanupPushSubscriptions(mockDb, { dryRun: true });

      // Cutoff should be 90 days ago (2024-01-15 - 90 days = 2023-10-17) at start of day
      // setHours(0, 0, 0, 0) uses local time, so we compare date parts only
      expect(result.cutoffDate.getFullYear()).toBe(2023);
      expect(result.cutoffDate.getMonth()).toBe(9); // October (0-indexed)
      expect(result.cutoffDate.getDate()).toBe(17);
      expect(result.cutoffDate.getHours()).toBe(0);
      expect(result.cutoffDate.getMinutes()).toBe(0);
    });

    it('should use custom inactive days', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const result = await cleanupPushSubscriptions(mockDb, {
        dryRun: true,
        inactiveDays: 30,
      });

      // Cutoff should be 30 days ago (2024-01-15 - 30 days = 2023-12-16) at start of day
      expect(result.cutoffDate.getFullYear()).toBe(2023);
      expect(result.cutoffDate.getMonth()).toBe(11); // December (0-indexed)
      expect(result.cutoffDate.getDate()).toBe(16);
      expect(result.cutoffDate.getHours()).toBe(0);
    });

    it('should handle zero counts in all categories', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const result = await cleanupPushSubscriptions(mockDb, { dryRun: true });

      expect(result.deletedCount).toBe(0);
      expect(result.breakdown.markedInactive).toBe(0);
      expect(result.breakdown.inactive).toBe(0);
      expect(result.breakdown.expired).toBe(0);
    });

    it('should handle null query results', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const result = await cleanupPushSubscriptions(mockDb, { dryRun: true });

      expect(result.deletedCount).toBe(0);
    });
  });

  describe('actual deletion', () => {
    it('should delete subscriptions and return total count', async () => {
      // When deleted count < batchSize, loop stops (no continuation needed)
      vi.mocked(mockDb.execute).mockResolvedValueOnce(50);

      const result = await cleanupPushSubscriptions(mockDb);

      expect(result.dryRun).toBe(false);
      expect(result.deletedCount).toBe(50);
      // Only one call since 50 < MAX_BATCH_SIZE (1000)
      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });

    it('should delete in batches when count exceeds batch size', async () => {
      // Loop continues while batchDeleted === batchSize, stops when < batchSize
      vi.mocked(mockDb.execute)
        .mockResolvedValueOnce(1000) // Full batch, continue
        .mockResolvedValueOnce(1000) // Full batch, continue
        .mockResolvedValueOnce(500); // Partial batch, stop

      const result = await cleanupPushSubscriptions(mockDb, { batchSize: 1000 });

      expect(result.deletedCount).toBe(2500);
      // Three calls: two full batches + one partial batch
      expect(mockDb.execute).toHaveBeenCalledTimes(3);
    });

    it('should use correct SQL with proper conditions', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      await cleanupPushSubscriptions(mockDb, { inactiveDays: 60 });

      expect(mockDb.execute).toHaveBeenCalledWith({
        text: expect.stringContaining('DELETE FROM push_subscriptions'),
        values: expect.arrayContaining([
          expect.any(Date), // cutoff date
          expect.any(Date), // current date
          expect.any(Number), // batch size
        ]),
      });
    });

    it('should respect custom batch size', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      await cleanupPushSubscriptions(mockDb, { batchSize: 500 });

      expect(mockDb.execute).toHaveBeenCalledWith({
        text: expect.any(String),
        values: expect.arrayContaining([
          expect.any(Date),
          expect.any(Date),
          500,
        ]),
      });
    });

    it('should continue deleting until no more records match', async () => {
      // Loop continues while batchDeleted === batchSize, stops when < batchSize
      vi.mocked(mockDb.execute)
        .mockResolvedValueOnce(100) // Full batch, continue
        .mockResolvedValueOnce(100) // Full batch, continue
        .mockResolvedValueOnce(75); // Partial batch, stop

      const result = await cleanupPushSubscriptions(mockDb, { batchSize: 100 });

      expect(result.deletedCount).toBe(275);
      // Three calls: two full batches + one partial batch
      expect(mockDb.execute).toHaveBeenCalledTimes(3);
    });

    it('should not populate breakdown in actual deletion mode', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(50).mockResolvedValueOnce(0);

      const result = await cleanupPushSubscriptions(mockDb);

      // Breakdown is not tracked in actual deletion mode
      expect(result.breakdown.markedInactive).toBe(0);
      expect(result.breakdown.inactive).toBe(0);
      expect(result.breakdown.expired).toBe(0);
    });
  });

  describe('retention validation', () => {
    it('should enforce minimum inactive days', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const result = await cleanupPushSubscriptions(mockDb, {
        dryRun: true,
        inactiveDays: 3, // Below MIN_INACTIVE_DAYS (7)
      });

      // Should use MIN_INACTIVE_DAYS (7) instead: 2024-01-15 - 7 days = 2024-01-08
      expect(result.cutoffDate.getFullYear()).toBe(2024);
      expect(result.cutoffDate.getMonth()).toBe(0); // January
      expect(result.cutoffDate.getDate()).toBe(8);
      expect(result.cutoffDate.getHours()).toBe(0);
    });

    it('should enforce minimum for negative values', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const result = await cleanupPushSubscriptions(mockDb, {
        dryRun: true,
        inactiveDays: -10,
      });

      // Should use MIN_INACTIVE_DAYS (7): 2024-01-15 - 7 days = 2024-01-08
      expect(result.cutoffDate.getFullYear()).toBe(2024);
      expect(result.cutoffDate.getMonth()).toBe(0); // January
      expect(result.cutoffDate.getDate()).toBe(8);
    });

    it('should allow inactive days above minimum', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const result = await cleanupPushSubscriptions(mockDb, {
        dryRun: true,
        inactiveDays: 180,
      });

      // 2024-01-15 - 180 days = approximately 2023-07-19
      expect(result.cutoffDate.getFullYear()).toBe(2023);
      expect(result.cutoffDate.getMonth()).toBe(6); // July
      expect(result.cutoffDate.getDate()).toBe(19);
    });

    it('should normalize cutoff to start of day', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const result = await cleanupPushSubscriptions(mockDb, { dryRun: true });

      // Hours, minutes, seconds should be 0 (local time)
      expect(result.cutoffDate.getHours()).toBe(0);
      expect(result.cutoffDate.getMinutes()).toBe(0);
      expect(result.cutoffDate.getSeconds()).toBe(0);
      expect(result.cutoffDate.getMilliseconds()).toBe(0);
    });
  });

  describe('performance metrics', () => {
    it('should track operation duration in dry-run', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const result = await cleanupPushSubscriptions(mockDb, { dryRun: true });

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe('number');
    });

    it('should track operation duration for actual deletion', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const result = await cleanupPushSubscriptions(mockDb);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const result = await cleanupPushSubscriptions(mockDb, {});

      expect(result.dryRun).toBe(false);
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle undefined options', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const result = await cleanupPushSubscriptions(mockDb);

      expect(result.dryRun).toBe(false);
      expect(result.cutoffDate).toBeInstanceOf(Date);
    });
  });
});

describe('getPushSubscriptionStats', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return comprehensive subscription statistics', async () => {
    vi.mocked(mockDb.queryOne)
      .mockResolvedValueOnce({ count: 1000 }) // total
      .mockResolvedValueOnce({ count: 800 }) // active
      .mockResolvedValueOnce({ count: 200 }) // marked inactive
      .mockResolvedValueOnce({ count: 50 }) // stale
      .mockResolvedValueOnce({ count: 25 }); // expired

    vi.mocked(mockDb.raw).mockResolvedValue([{ count: 10 }]); // expiring soon

    const stats = await getPushSubscriptionStats(mockDb);

    expect(stats).toEqual({
      total: 1000,
      active: 800,
      markedInactive: 200,
      stale: 50,
      expired: 25,
      expiringSoon: 10,
      cutoffDate: expect.any(Date),
    });
  });

  it('should use custom inactive days for cutoff', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });
    vi.mocked(mockDb.raw).mockResolvedValue([{ count: 0 }]);

    const stats = await getPushSubscriptionStats(mockDb, 30);

    // 2024-01-15 - 30 days = 2023-12-16
    expect(stats.cutoffDate.getFullYear()).toBe(2023);
    expect(stats.cutoffDate.getMonth()).toBe(11); // December
    expect(stats.cutoffDate.getDate()).toBe(16);
  });

  it('should enforce minimum inactive days', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });
    vi.mocked(mockDb.raw).mockResolvedValue([{ count: 0 }]);

    const stats = await getPushSubscriptionStats(mockDb, 3);

    // Should use MIN_INACTIVE_DAYS (7): 2024-01-15 - 7 = 2024-01-08
    expect(stats.cutoffDate.getFullYear()).toBe(2024);
    expect(stats.cutoffDate.getMonth()).toBe(0); // January
    expect(stats.cutoffDate.getDate()).toBe(8);
  });

  it('should handle all zero counts', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });
    vi.mocked(mockDb.raw).mockResolvedValue([{ count: 0 }]);

    const stats = await getPushSubscriptionStats(mockDb);

    expect(stats.total).toBe(0);
    expect(stats.active).toBe(0);
    expect(stats.markedInactive).toBe(0);
    expect(stats.stale).toBe(0);
    expect(stats.expired).toBe(0);
    expect(stats.expiringSoon).toBe(0);
  });

  it('should handle null query results', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue(null);
    vi.mocked(mockDb.raw).mockResolvedValue([]);

    const stats = await getPushSubscriptionStats(mockDb);

    expect(stats.total).toBe(0);
    expect(stats.expiringSoon).toBe(0);
  });

  it('should call all stat queries in parallel', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });
    vi.mocked(mockDb.raw).mockResolvedValue([{ count: 0 }]);

    await getPushSubscriptionStats(mockDb);

    // 5 queryOne calls + 1 raw call
    expect(mockDb.queryOne).toHaveBeenCalledTimes(5);
    expect(mockDb.raw).toHaveBeenCalledTimes(1);
  });

  it('should calculate expiringSoon with correct window', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });
    vi.mocked(mockDb.raw).mockResolvedValue([{ count: 15 }]);

    const stats = await getPushSubscriptionStats(mockDb);

    // Should query for subscriptions expiring within next 7 days
    expect(mockDb.raw).toHaveBeenCalledWith(
      expect.stringContaining('expiration_time'),
      expect.arrayContaining([
        expect.any(Date), // now
        expect.any(Date), // week from now
      ]),
    );
    expect(stats.expiringSoon).toBe(15);
  });
});

describe('countCleanupCandidates', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should count total subscriptions matching cleanup criteria', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 150 });

    const count = await countCleanupCandidates(mockDb);

    expect(count).toBe(150);
  });

  it('should use custom inactive days', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 75 });

    const count = await countCleanupCandidates(mockDb, 30);

    expect(count).toBe(75);
  });

  it('should enforce minimum inactive days', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 10 });

    const count = await countCleanupCandidates(mockDb, 2);

    expect(count).toBe(10);
  });

  it('should handle null result', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue(null);

    const count = await countCleanupCandidates(mockDb);

    expect(count).toBe(0);
  });

  it('should handle zero count', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

    const count = await countCleanupCandidates(mockDb);

    expect(count).toBe(0);
  });

  it('should normalize cutoff to start of day', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

    await countCleanupCandidates(mockDb);

    // Verify query was called (cutoff calculation happens internally)
    expect(mockDb.queryOne).toHaveBeenCalled();
  });
});

describe('constants', () => {
  it('should export DEFAULT_INACTIVE_DAYS', () => {
    expect(DEFAULT_INACTIVE_DAYS).toBe(90);
  });

  it('should export MIN_INACTIVE_DAYS', () => {
    expect(MIN_INACTIVE_DAYS).toBe(7);
  });

  it('should export MAX_BATCH_SIZE', () => {
    expect(MAX_BATCH_SIZE).toBe(1000);
  });
});
