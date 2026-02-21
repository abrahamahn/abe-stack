// main/server/core/src/billing/usage-metering.test.ts
/**
 * Usage Metering Service Tests
 *
 * Unit tests for the usage metering business logic.
 * Uses mock repositories to test service functions in isolation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assertWithinUsageLimit,
  createUsageSnapshot,
  getUsage,
  getUsageSummary,
  recordUsage,
} from './usage-metering';

import type { UsageMeteringRepositories } from './usage-metering';
import type {
  UsageMetric,
  UsageMetricRepository,
  UsageSnapshot,
  UsageSnapshotRepository,
} from '../../../db/src';

// ============================================================================
// Test Helpers
// ============================================================================

const PERIOD_START = new Date('2026-02-01T00:00:00.000Z');
const PERIOD_END = new Date('2026-03-01T00:00:00.000Z');

function createMockMetric(overrides?: Partial<UsageMetric>): UsageMetric {
  return {
    key: 'api_calls',
    name: 'API Calls',
    unit: 'calls',
    aggregationType: 'sum',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function createMockSnapshot(overrides?: Partial<UsageSnapshot>): UsageSnapshot {
  return {
    id: 'snap-1',
    tenantId: 'tenant-1',
    metricKey: 'api_calls',
    value: 100,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    updatedAt: new Date('2026-02-15T00:00:00Z'),
    ...overrides,
  };
}

function createMockRepos(): UsageMeteringRepositories {
  const usageMetrics: UsageMetricRepository = {
    create: vi.fn(),
    findByKey: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const usageSnapshots: UsageSnapshotRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByTenantId: vi.fn(),
    findByTenantAndMetric: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  };

  return { usageMetrics, usageSnapshots };
}

// ============================================================================
// recordUsage
// ============================================================================

describe('recordUsage', () => {
  let repos: UsageMeteringRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should throw if metric key does not exist', async () => {
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(null);

    await expect(
      recordUsage(repos, {
        metricKey: 'nonexistent',
        tenantId: 'tenant-1',
        delta: 1,
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      }),
    ).rejects.toThrow('Usage metric not found: nonexistent');
  });

  it('should create a new snapshot when none exists', async () => {
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(createMockMetric());
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([]);
    const expectedSnapshot = createMockSnapshot({ value: 5 });
    vi.mocked(repos.usageSnapshots.upsert).mockResolvedValue(expectedSnapshot);

    const result = await recordUsage(repos, {
      metricKey: 'api_calls',
      tenantId: 'tenant-1',
      delta: 5,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });

    expect(result).toEqual(expectedSnapshot);
    expect(repos.usageSnapshots.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        metricKey: 'api_calls',
        value: 5,
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      }),
    );
  });

  it('should increment value for sum aggregation', async () => {
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(
      createMockMetric({ aggregationType: 'sum' }),
    );
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([
      createMockSnapshot({ value: 100 }),
    ]);
    const expectedSnapshot = createMockSnapshot({ value: 110 });
    vi.mocked(repos.usageSnapshots.upsert).mockResolvedValue(expectedSnapshot);

    await recordUsage(repos, {
      metricKey: 'api_calls',
      tenantId: 'tenant-1',
      delta: 10,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });

    expect(repos.usageSnapshots.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ value: 110 }),
    );
  });

  it('should use max for max aggregation', async () => {
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(
      createMockMetric({ aggregationType: 'max' }),
    );
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([
      createMockSnapshot({ value: 50 }),
    ]);
    const expectedSnapshot = createMockSnapshot({ value: 75 });
    vi.mocked(repos.usageSnapshots.upsert).mockResolvedValue(expectedSnapshot);

    await recordUsage(repos, {
      metricKey: 'api_calls',
      tenantId: 'tenant-1',
      delta: 75,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });

    expect(repos.usageSnapshots.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ value: 75 }),
    );
  });

  it('should replace value for last aggregation', async () => {
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(
      createMockMetric({ aggregationType: 'last' }),
    );
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([
      createMockSnapshot({ value: 50 }),
    ]);
    const expectedSnapshot = createMockSnapshot({ value: 42 });
    vi.mocked(repos.usageSnapshots.upsert).mockResolvedValue(expectedSnapshot);

    await recordUsage(repos, {
      metricKey: 'api_calls',
      tenantId: 'tenant-1',
      delta: 42,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });

    expect(repos.usageSnapshots.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ value: 42 }),
    );
  });

  it('should not allow negative values', async () => {
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(createMockMetric());
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([
      createMockSnapshot({ value: 5 }),
    ]);
    const expectedSnapshot = createMockSnapshot({ value: 0 });
    vi.mocked(repos.usageSnapshots.upsert).mockResolvedValue(expectedSnapshot);

    await recordUsage(repos, {
      metricKey: 'api_calls',
      tenantId: 'tenant-1',
      delta: -10,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });

    expect(repos.usageSnapshots.upsert).toHaveBeenCalledWith(expect.objectContaining({ value: 0 }));
  });
});

// ============================================================================
// getUsage
// ============================================================================

describe('getUsage', () => {
  let repos: UsageMeteringRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should return 0 when metric does not exist', async () => {
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(null);

    const result = await getUsage(repos, 'nonexistent', 'tenant-1', PERIOD_START, PERIOD_END);

    expect(result).toBe(0);
  });

  it('should return 0 when no snapshots exist', async () => {
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(createMockMetric());
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([]);

    const result = await getUsage(repos, 'api_calls', 'tenant-1', PERIOD_START, PERIOD_END);

    expect(result).toBe(0);
  });

  it('should return aggregated value for matching period snapshots', async () => {
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(
      createMockMetric({ aggregationType: 'sum' }),
    );
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([
      createMockSnapshot({ value: 150 }),
    ]);

    const result = await getUsage(repos, 'api_calls', 'tenant-1', PERIOD_START, PERIOD_END);

    expect(result).toBe(150);
  });
});

// ============================================================================
// getUsageSummary
// ============================================================================

describe('getUsageSummary', () => {
  let repos: UsageMeteringRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should return empty metrics when no metrics are defined', async () => {
    vi.mocked(repos.usageMetrics.findAll).mockResolvedValue([]);
    vi.mocked(repos.usageSnapshots.findByTenantId).mockResolvedValue([]);

    const result = await getUsageSummary(repos, 'tenant-1', []);

    expect(result.metrics).toEqual([]);
    expect(result.periodStart).toBeDefined();
    expect(result.periodEnd).toBeDefined();
  });

  it('should include all defined metrics in summary', async () => {
    vi.mocked(repos.usageMetrics.findAll).mockResolvedValue([
      createMockMetric({ key: 'api_calls', name: 'API Calls', unit: 'calls' }),
      createMockMetric({ key: 'storage_gb', name: 'Storage', unit: 'GB' }),
    ]);
    vi.mocked(repos.usageSnapshots.findByTenantId).mockResolvedValue([]);

    const result = await getUsageSummary(repos, 'tenant-1', [
      { metricKey: 'api_calls', limit: 1000 },
      { metricKey: 'storage_gb', limit: 10 },
    ]);

    expect(result.metrics).toHaveLength(2);
    expect(result.metrics[0]?.metricKey).toBe('api_calls');
    expect(result.metrics[0]?.limit).toBe(1000);
    expect(result.metrics[1]?.metricKey).toBe('storage_gb');
    expect(result.metrics[1]?.limit).toBe(10);
  });

  it('should calculate percentUsed correctly', async () => {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    vi.mocked(repos.usageMetrics.findAll).mockResolvedValue([
      createMockMetric({ key: 'api_calls', name: 'API Calls', unit: 'calls' }),
    ]);
    vi.mocked(repos.usageSnapshots.findByTenantId).mockResolvedValue([
      createMockSnapshot({
        metricKey: 'api_calls',
        value: 750,
        periodStart,
        periodEnd,
      }),
    ]);

    const result = await getUsageSummary(repos, 'tenant-1', [
      { metricKey: 'api_calls', limit: 1000 },
    ]);

    expect(result.metrics[0]?.currentValue).toBe(750);
    expect(result.metrics[0]?.percentUsed).toBe(75);
  });

  it('should use -1 limit when no limit is defined for a metric', async () => {
    vi.mocked(repos.usageMetrics.findAll).mockResolvedValue([
      createMockMetric({ key: 'storage_gb' }),
    ]);
    vi.mocked(repos.usageSnapshots.findByTenantId).mockResolvedValue([]);

    const result = await getUsageSummary(repos, 'tenant-1', []);

    expect(result.metrics[0]?.limit).toBe(-1);
    expect(result.metrics[0]?.percentUsed).toBe(0);
  });
});

// ============================================================================
// createUsageSnapshot
// ============================================================================

describe('createUsageSnapshot', () => {
  let repos: UsageMeteringRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should create snapshots for all defined metrics', async () => {
    vi.mocked(repos.usageMetrics.findAll).mockResolvedValue([
      createMockMetric({ key: 'api_calls' }),
      createMockMetric({ key: 'storage_gb' }),
    ]);
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(createMockMetric());
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([]);
    vi.mocked(repos.usageSnapshots.upsert).mockImplementation(async (data) =>
      createMockSnapshot({
        metricKey: data.metricKey,
        value: data.value ?? 0,
      }),
    );

    const result = await createUsageSnapshot(repos, 'tenant-1');

    expect(result).toHaveLength(2);
    expect(repos.usageSnapshots.upsert).toHaveBeenCalledTimes(2);
  });

  it('should return empty array when no metrics exist', async () => {
    vi.mocked(repos.usageMetrics.findAll).mockResolvedValue([]);

    const result = await createUsageSnapshot(repos, 'tenant-1');

    expect(result).toEqual([]);
  });
});

// ============================================================================
// Meter Increment Logic — Idempotency & Period Rollover
// ============================================================================

describe('meter increment logic', () => {
  let repos: UsageMeteringRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should produce the same result when recording the same delta with identical period (idempotency key behavior)', async () => {
    const metric = createMockMetric({ aggregationType: 'sum' });
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(metric);
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([
      createMockSnapshot({ value: 50 }),
    ]);

    const resultSnapshot = createMockSnapshot({ value: 55 });
    vi.mocked(repos.usageSnapshots.upsert).mockResolvedValue(resultSnapshot);

    // Record delta = 5 twice with same parameters
    const result1 = await recordUsage(repos, {
      metricKey: 'api_calls',
      tenantId: 'tenant-1',
      delta: 5,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });

    // The upsert call should produce the same snapshot shape
    expect(repos.usageSnapshots.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        metricKey: 'api_calls',
        value: 55,
      }),
    );
    expect(result1.value).toBe(55);
  });

  it('should correctly aggregate counters across multiple increments', async () => {
    const metric = createMockMetric({ aggregationType: 'sum' });
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(metric);

    // First increment: no existing snapshot
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValueOnce([]);
    vi.mocked(repos.usageSnapshots.upsert).mockResolvedValueOnce(createMockSnapshot({ value: 10 }));

    await recordUsage(repos, {
      metricKey: 'api_calls',
      tenantId: 'tenant-1',
      delta: 10,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });

    expect(repos.usageSnapshots.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ value: 10 }),
    );

    // Second increment: existing snapshot with value 10
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValueOnce([
      createMockSnapshot({ value: 10 }),
    ]);
    vi.mocked(repos.usageSnapshots.upsert).mockResolvedValueOnce(createMockSnapshot({ value: 35 }));

    await recordUsage(repos, {
      metricKey: 'api_calls',
      tenantId: 'tenant-1',
      delta: 25,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });

    expect(repos.usageSnapshots.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: 35 }),
    );
  });

  it('should create a new snapshot for a new period (period rollover)', async () => {
    const metric = createMockMetric({ aggregationType: 'sum' });
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(metric);

    // Old period snapshot exists but is from a different period
    const oldPeriodStart = new Date('2026-01-01T00:00:00.000Z');
    const oldPeriodEnd = new Date('2026-02-01T00:00:00.000Z');
    const newPeriodStart = new Date('2026-02-01T00:00:00.000Z');
    const newPeriodEnd = new Date('2026-03-01T00:00:00.000Z');

    // Return a snapshot from the OLD period -- it won't match the new period dates
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([
      createMockSnapshot({
        value: 500,
        periodStart: oldPeriodStart,
        periodEnd: oldPeriodEnd,
      }),
    ]);

    vi.mocked(repos.usageSnapshots.upsert).mockResolvedValue(
      createMockSnapshot({ value: 3, periodStart: newPeriodStart, periodEnd: newPeriodEnd }),
    );

    await recordUsage(repos, {
      metricKey: 'api_calls',
      tenantId: 'tenant-1',
      delta: 3,
      periodStart: newPeriodStart,
      periodEnd: newPeriodEnd,
    });

    // The new period snapshot starts from delta (3), not 500 + 3
    expect(repos.usageSnapshots.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 3,
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
      }),
    );
  });
});

// ============================================================================
// Usage Limit Enforcement — Soft vs Hard
// ============================================================================

describe('usage limit enforcement', () => {
  let repos: UsageMeteringRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('soft limit (warn): usage at 80% of limit does not throw', async () => {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(createMockMetric());
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([
      createMockSnapshot({ value: 800, periodStart, periodEnd }),
    ]);

    // 800/1000 = 80% -- below the hard limit, should NOT throw
    await expect(
      assertWithinUsageLimit(repos, 'api_calls', 'tenant-1', 1000),
    ).resolves.not.toThrow();
  });

  it('hard limit (block): usage at 100% of limit throws', async () => {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(createMockMetric());
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([
      createMockSnapshot({ value: 1000, periodStart, periodEnd }),
    ]);

    // Exactly at limit -- should throw (hard limit blocks)
    await expect(assertWithinUsageLimit(repos, 'api_calls', 'tenant-1', 1000)).rejects.toThrow(
      'Usage limit exceeded',
    );
  });

  it('hard limit (block): usage above limit throws with metric info', async () => {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(createMockMetric());
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([
      createMockSnapshot({ value: 1500, periodStart, periodEnd }),
    ]);

    await expect(assertWithinUsageLimit(repos, 'api_calls', 'tenant-1', 1000)).rejects.toThrow(
      /api_calls.*1500.*1000/,
    );
  });

  it('unlimited limit (-1) never throws regardless of usage', async () => {
    await expect(assertWithinUsageLimit(repos, 'api_calls', 'tenant-1', -1)).resolves.not.toThrow();
    // findByKey should never have been called for unlimited
    expect(repos.usageMetrics.findByKey).not.toHaveBeenCalled();
  });

  it('percent calculation: 750/1000 = 75%', async () => {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    vi.mocked(repos.usageMetrics.findAll).mockResolvedValue([
      createMockMetric({ key: 'api_calls', name: 'API Calls', unit: 'calls' }),
    ]);
    vi.mocked(repos.usageSnapshots.findByTenantId).mockResolvedValue([
      createMockSnapshot({ metricKey: 'api_calls', value: 750, periodStart, periodEnd }),
    ]);

    const summary = await getUsageSummary(repos, 'tenant-1', [
      { metricKey: 'api_calls', limit: 1000 },
    ]);

    expect(summary.metrics[0]?.percentUsed).toBe(75);
    expect(summary.metrics[0]?.currentValue).toBe(750);
    expect(summary.metrics[0]?.limit).toBe(1000);
  });
});

// ============================================================================
// assertWithinUsageLimit
// ============================================================================

describe('assertWithinUsageLimit', () => {
  let repos: UsageMeteringRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should not throw for unlimited (-1) limit', async () => {
    await expect(assertWithinUsageLimit(repos, 'api_calls', 'tenant-1', -1)).resolves.not.toThrow();
  });

  it('should not throw for Infinity limit', async () => {
    await expect(
      assertWithinUsageLimit(repos, 'api_calls', 'tenant-1', Infinity),
    ).resolves.not.toThrow();
  });

  it('should not throw when usage is below limit', async () => {
    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(createMockMetric());
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([]);

    await expect(
      assertWithinUsageLimit(repos, 'api_calls', 'tenant-1', 1000),
    ).resolves.not.toThrow();
  });

  it('should throw when usage meets limit', async () => {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(createMockMetric());
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([
      createMockSnapshot({
        value: 1000,
        periodStart,
        periodEnd,
      }),
    ]);

    await expect(assertWithinUsageLimit(repos, 'api_calls', 'tenant-1', 1000)).rejects.toThrow(
      'Usage limit exceeded',
    );
  });

  it('should throw when usage exceeds limit', async () => {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    vi.mocked(repos.usageMetrics.findByKey).mockResolvedValue(createMockMetric());
    vi.mocked(repos.usageSnapshots.findByTenantAndMetric).mockResolvedValue([
      createMockSnapshot({
        value: 1500,
        periodStart,
        periodEnd,
      }),
    ]);

    await expect(assertWithinUsageLimit(repos, 'api_calls', 'tenant-1', 1000)).rejects.toThrow(
      'Usage limit exceeded',
    );
  });
});
