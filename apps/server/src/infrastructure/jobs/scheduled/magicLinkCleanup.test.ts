// apps/server/src/infrastructure/jobs/scheduled/magicLinkCleanup.test.ts
/**
 * Tests for Magic Link Token Cleanup Job
 *
 * Verifies cleanup operations for expired and used magic link tokens,
 * including dry-run mode, batch deletion, and statistics gathering.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  cleanupMagicLinkTokens,
  countOldMagicLinkTokens,
  getTotalMagicLinkTokenCount,
  getMagicLinkTokenStats,
  DEFAULT_RETENTION_HOURS,
  MIN_RETENTION_HOURS,
  MAX_BATCH_SIZE,
} from './magicLinkCleanup';

import type { RawDb } from '@abe-stack/db';

// ============================================================================
// Mock Modules
// ============================================================================

vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual('@abe-stack/db');
  return {
    ...actual,
    lt: vi.fn((field: string, value: unknown) => ({
      type: 'condition',
      field,
      operator: '<',
      value,
    })),
    selectCount: vi.fn(() => ({
      where: vi.fn((condition: unknown) => ({
        toSql: vi.fn(() => ({ text: 'SELECT COUNT(*) FROM table WHERE ...', values: [] })),
        condition,
      })),
      toSql: vi.fn(() => ({ text: 'SELECT COUNT(*) FROM table', values: [] })),
    })),
    MAGIC_LINK_TOKENS_TABLE: 'magic_link_tokens',
  };
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock database client with common methods
 */
function createMockDb(): RawDb {
  return {
    queryOne: vi.fn(),
    query: vi.fn(),
    execute: vi.fn(),
    raw: vi.fn(),
    close: vi.fn(),
  } as unknown as RawDb;
}


// ============================================================================
// Tests
// ============================================================================

describe('cleanupMagicLinkTokens', () => {
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
    it('should count records without deleting in dry-run mode', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 42 });

      const result = await cleanupMagicLinkTokens(mockDb, { dryRun: true });

      expect(result.dryRun).toBe(true);
      expect(result.deletedCount).toBe(42);
      expect(mockDb.queryOne).toHaveBeenCalled();
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should use default retention hours in dry-run', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 10 });

      const result = await cleanupMagicLinkTokens(mockDb, { dryRun: true });

      // Cutoff should be 24 hours ago from now
      const expectedCutoff = new Date('2024-01-14T12:00:00Z');
      expect(result.cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });

    it('should use custom retention hours in dry-run', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 5 });

      const result = await cleanupMagicLinkTokens(mockDb, {
        dryRun: true,
        retentionHours: 48,
      });

      // Cutoff should be 48 hours ago from now
      const expectedCutoff = new Date('2024-01-13T12:00:00Z');
      expect(result.cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });

    it('should handle zero count in dry-run', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const result = await cleanupMagicLinkTokens(mockDb, { dryRun: true });

      expect(result.deletedCount).toBe(0);
    });

    it('should handle null queryOne result in dry-run', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const result = await cleanupMagicLinkTokens(mockDb, { dryRun: true });

      expect(result.deletedCount).toBe(0);
    });
  });

  describe('actual deletion', () => {
    it('should delete old tokens and return count', async () => {
      // When deleted count < batchSize, loop stops (no continuation needed)
      vi.mocked(mockDb.execute).mockResolvedValueOnce(15);

      const result = await cleanupMagicLinkTokens(mockDb);

      expect(result.dryRun).toBe(false);
      expect(result.deletedCount).toBe(15);
      // Only one call since 15 < MAX_BATCH_SIZE (10000)
      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });

    it('should delete in batches when count exceeds batch size', async () => {
      // Loop continues while batchDeleted === batchSize, stops when < batchSize
      vi.mocked(mockDb.execute)
        .mockResolvedValueOnce(1000) // Full batch, continue
        .mockResolvedValueOnce(1000) // Full batch, continue
        .mockResolvedValueOnce(500); // Partial batch, stop

      const result = await cleanupMagicLinkTokens(mockDb, { batchSize: 1000 });

      expect(result.deletedCount).toBe(2500);
      // Three calls: two full batches + one partial batch
      expect(mockDb.execute).toHaveBeenCalledTimes(3);
    });

    it('should use correct SQL with cutoff date and batch size', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      await cleanupMagicLinkTokens(mockDb, { retentionHours: 12 });

      const expectedCutoff = new Date('2024-01-15T00:00:00Z');

      expect(mockDb.execute).toHaveBeenCalledWith({
        text: expect.stringContaining('DELETE FROM magic_link_tokens'),
        values: [expectedCutoff, MAX_BATCH_SIZE],
      });
    });

    it('should respect custom batch size', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      await cleanupMagicLinkTokens(mockDb, { batchSize: 500 });

      expect(mockDb.execute).toHaveBeenCalledWith({
        text: expect.any(String),
        values: [expect.any(Date), 500],
      });
    });

    it('should continue deleting until no more records', async () => {
      // Loop continues while batchDeleted === batchSize, stops when < batchSize
      vi.mocked(mockDb.execute)
        .mockResolvedValueOnce(100) // Full batch, continue
        .mockResolvedValueOnce(100) // Full batch, continue
        .mockResolvedValueOnce(50); // Partial batch, stop

      const result = await cleanupMagicLinkTokens(mockDb, { batchSize: 100 });

      expect(result.deletedCount).toBe(250);
      // Three calls: two full batches + one partial batch
      expect(mockDb.execute).toHaveBeenCalledTimes(3);
    });
  });

  describe('retention validation', () => {
    it('should enforce minimum retention hours', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const result = await cleanupMagicLinkTokens(mockDb, {
        dryRun: true,
        retentionHours: 0.1, // Below minimum
      });

      // Should use MIN_RETENTION_HOURS (1 hour) instead
      const expectedCutoff = new Date('2024-01-15T11:00:00Z');
      expect(result.cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });

    it('should enforce minimum retention for negative values', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const result = await cleanupMagicLinkTokens(mockDb, {
        dryRun: true,
        retentionHours: -5,
      });

      const expectedCutoff = new Date('2024-01-15T11:00:00Z');
      expect(result.cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });

    it('should allow retention hours above minimum', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const result = await cleanupMagicLinkTokens(mockDb, {
        dryRun: true,
        retentionHours: 72,
      });

      const expectedCutoff = new Date('2024-01-12T12:00:00Z');
      expect(result.cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });
  });

  describe('performance metrics', () => {
    it('should track operation duration', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 5 });

      const result = await cleanupMagicLinkTokens(mockDb, { dryRun: true });

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe('number');
    });

    it('should include duration for actual deletions', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const result = await cleanupMagicLinkTokens(mockDb);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const result = await cleanupMagicLinkTokens(mockDb, {});

      expect(result.dryRun).toBe(false);
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle undefined options', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const result = await cleanupMagicLinkTokens(mockDb);

      expect(result.dryRun).toBe(false);
      expect(result.cutoffDate).toBeInstanceOf(Date);
    });
  });
});

describe('countOldMagicLinkTokens', () => {
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

  it('should return count of old tokens with default retention', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 123 });

    const count = await countOldMagicLinkTokens(mockDb);

    expect(count).toBe(123);
    expect(mockDb.queryOne).toHaveBeenCalled();
  });

  it('should use custom retention hours', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 50 });

    const count = await countOldMagicLinkTokens(mockDb, 48);

    expect(count).toBe(50);
  });

  it('should enforce minimum retention hours', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 10 });

    const count = await countOldMagicLinkTokens(mockDb, 0.5);

    expect(count).toBe(10);
  });

  it('should handle null result', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue(null);

    const count = await countOldMagicLinkTokens(mockDb);

    expect(count).toBe(0);
  });

  it('should handle undefined count in result', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({});

    const count = await countOldMagicLinkTokens(mockDb);

    expect(count).toBe(0);
  });
});

describe('getTotalMagicLinkTokenCount', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  it('should return total count of magic link tokens', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 456 });

    const count = await getTotalMagicLinkTokenCount(mockDb);

    expect(count).toBe(456);
  });

  it('should handle null result', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue(null);

    const count = await getTotalMagicLinkTokenCount(mockDb);

    expect(count).toBe(0);
  });

  it('should handle zero count', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

    const count = await getTotalMagicLinkTokenCount(mockDb);

    expect(count).toBe(0);
  });
});

describe('getMagicLinkTokenStats', () => {
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

  it('should return complete statistics with default retention', async () => {
    vi.mocked(mockDb.queryOne)
      .mockResolvedValueOnce({ count: 1000 }) // total
      .mockResolvedValueOnce({ count: 150 }); // old records

    const stats = await getMagicLinkTokenStats(mockDb);

    expect(stats).toEqual({
      total: 1000,
      oldRecords: 150,
      retentionHours: DEFAULT_RETENTION_HOURS,
      cutoffDate: new Date('2024-01-14T12:00:00Z'),
    });
  });

  it('should use custom retention hours', async () => {
    vi.mocked(mockDb.queryOne)
      .mockResolvedValueOnce({ count: 500 })
      .mockResolvedValueOnce({ count: 75 });

    const stats = await getMagicLinkTokenStats(mockDb, 48);

    expect(stats.retentionHours).toBe(48);
    expect(stats.cutoffDate).toEqual(new Date('2024-01-13T12:00:00Z'));
  });

  it('should enforce minimum retention hours', async () => {
    vi.mocked(mockDb.queryOne)
      .mockResolvedValueOnce({ count: 100 })
      .mockResolvedValueOnce({ count: 10 });

    const stats = await getMagicLinkTokenStats(mockDb, 0.25);

    expect(stats.retentionHours).toBe(MIN_RETENTION_HOURS);
  });

  it('should handle zero counts', async () => {
    vi.mocked(mockDb.queryOne)
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 });

    const stats = await getMagicLinkTokenStats(mockDb);

    expect(stats.total).toBe(0);
    expect(stats.oldRecords).toBe(0);
  });

  it('should handle null results', async () => {
    vi.mocked(mockDb.queryOne).mockResolvedValue(null);

    const stats = await getMagicLinkTokenStats(mockDb);

    expect(stats.total).toBe(0);
    expect(stats.oldRecords).toBe(0);
  });

  it('should call both queries in parallel', async () => {
    vi.mocked(mockDb.queryOne)
      .mockResolvedValueOnce({ count: 200 })
      .mockResolvedValueOnce({ count: 20 });

    await getMagicLinkTokenStats(mockDb);

    expect(mockDb.queryOne).toHaveBeenCalledTimes(2);
  });
});

describe('constants', () => {
  it('should export DEFAULT_RETENTION_HOURS', () => {
    expect(DEFAULT_RETENTION_HOURS).toBe(24);
  });

  it('should export MIN_RETENTION_HOURS', () => {
    expect(MIN_RETENTION_HOURS).toBe(1);
  });

  it('should export MAX_BATCH_SIZE', () => {
    expect(MAX_BATCH_SIZE).toBe(10000);
  });
});
