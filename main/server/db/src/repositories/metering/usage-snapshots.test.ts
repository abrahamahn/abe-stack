// main/server/db/src/repositories/metering/usage-snapshots.test.ts
/**
 * Tests for Usage Snapshots Repository
 *
 * Validates usage snapshot operations including snapshot creation, ID lookups,
 * tenant queries, tenant-metric filtering, updates, and upsert functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createUsageSnapshotRepository } from './usage-snapshots';

import type { RawDb } from '../../client';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  raw: vi.fn() as RawDb['raw'],
  transaction: vi.fn() as RawDb['transaction'],
  healthCheck: vi.fn(),
  close: vi.fn(),
  getClient: vi.fn() as RawDb['getClient'],
  queryOne: vi.fn(),
  execute: vi.fn(),
});

// ============================================================================
// Test Data
// ============================================================================

const mockUsageSnapshot = {
  id: 'snap-123',
  tenant_id: 'tenant-123',
  metric_key: 'api_calls',
  value: 1000,
  period_start: new Date('2024-01-01T00:00:00Z'),
  period_end: new Date('2024-02-01T00:00:00Z'),
  updated_at: new Date('2024-01-15T12:00:00Z'),
};

const mockUsageSnapshot2 = {
  id: 'snap-456',
  tenant_id: 'tenant-123',
  metric_key: 'storage_gb',
  value: 50,
  period_start: new Date('2024-01-01T00:00:00Z'),
  period_end: new Date('2024-02-01T00:00:00Z'),
  updated_at: new Date('2024-01-15T12:00:00Z'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createUsageSnapshotRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new usage snapshot', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsageSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        value: 1000,
        periodStart: new Date('2024-01-01T00:00:00Z'),
        periodEnd: new Date('2024-02-01T00:00:00Z'),
      });

      expect(result.tenantId).toBe('tenant-123');
      expect(result.metricKey).toBe('api_calls');
      expect(result.value).toBe(1000);
      expect(result.periodStart).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(result.periodEnd).toEqual(new Date('2024-02-01T00:00:00Z'));
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUsageSnapshotRepository(mockDb);

      await expect(
        repo.create({
          tenantId: 'tenant-123',
          metricKey: 'api_calls',
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-02-01'),
        }),
      ).rejects.toThrow('Failed to create usage snapshot');
    });

    it('should handle optional id field', async () => {
      const snapshotWithCustomId = {
        ...mockUsageSnapshot,
        id: 'custom-id-123',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(snapshotWithCustomId);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.create({
        id: 'custom-id-123',
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
      });

      expect(result.id).toBe('custom-id-123');
    });

    it('should handle optional value field defaulting to 0', async () => {
      const snapshotWithDefaultValue = {
        ...mockUsageSnapshot,
        value: 0,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(snapshotWithDefaultValue);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
      });

      expect(result.value).toBe(0);
    });

    it('should handle optional updated_at timestamp', async () => {
      const customDate = new Date('2024-06-15T10:30:00Z');
      const snapshotWithCustomDate = {
        ...mockUsageSnapshot,
        updated_at: customDate,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(snapshotWithCustomDate);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
        updatedAt: customDate,
      });

      expect(result.updatedAt).toEqual(customDate);
    });

    it('should handle large values', async () => {
      const snapshotWithLargeValue = {
        ...mockUsageSnapshot,
        value: 999999999,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(snapshotWithLargeValue);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        value: 999999999,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
      });

      expect(result.value).toBe(999999999);
    });
  });

  describe('findById', () => {
    it('should return snapshot when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsageSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findById('snap-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('snap-123');
      expect(result?.tenantId).toBe('tenant-123');
      expect(result?.metricKey).toBe('api_calls');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should handle exact id matching', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsageSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const id = 'snap-123';
      await repo.findById(id);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([id]),
        }),
      );
    });

    it('should return complete snapshot data', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsageSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findById('snap-123');

      expect(result).toMatchObject({
        id: 'snap-123',
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        value: 1000,
      });
      expect(result?.periodStart).toBeInstanceOf(Date);
      expect(result?.periodEnd).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findByTenantId', () => {
    it('should return array of snapshots for tenant', async () => {
      const snapshots = [mockUsageSnapshot, mockUsageSnapshot2];
      vi.mocked(mockDb.query).mockResolvedValue(snapshots);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(2);
      expect(result[0].tenantId).toBe('tenant-123');
      expect(result[1].tenantId).toBe('tenant-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('tenant_id'),
        }),
      );
    });

    it('should return empty array when tenant has no snapshots', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findByTenantId('tenant-new');

      expect(result).toEqual([]);
    });

    it('should order by period_start descending', async () => {
      const snapshots = [
        { ...mockUsageSnapshot, period_start: new Date('2024-03-01') },
        { ...mockUsageSnapshot, period_start: new Date('2024-02-01') },
        { ...mockUsageSnapshot, period_start: new Date('2024-01-01') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(snapshots);

      const repo = createUsageSnapshotRepository(mockDb);
      await repo.findByTenantId('tenant-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*period_start.*desc/i),
        }),
      );
    });

    it('should respect default limit of 100', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockUsageSnapshot]);

      const repo = createUsageSnapshotRepository(mockDb);
      await repo.findByTenantId('tenant-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/LIMIT 100/),
          values: expect.arrayContaining(['tenant-123']),
        }),
      );
    });

    it('should respect custom limit parameter', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockUsageSnapshot]);

      const repo = createUsageSnapshotRepository(mockDb);
      await repo.findByTenantId('tenant-123', 50);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/LIMIT 50/),
          values: expect.arrayContaining(['tenant-123']),
        }),
      );
    });

    it('should handle multiple metrics for same tenant', async () => {
      const multiMetricSnapshots = [
        mockUsageSnapshot,
        mockUsageSnapshot2,
        { ...mockUsageSnapshot, id: 'snap-789', metric_key: 'bandwidth_mb' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(multiMetricSnapshots);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(3);
      expect(result.map((s) => s.metricKey)).toEqual(['api_calls', 'storage_gb', 'bandwidth_mb']);
    });
  });

  describe('findByTenantAndMetric', () => {
    it('should return snapshots for tenant and metric', async () => {
      const snapshots = [
        mockUsageSnapshot,
        { ...mockUsageSnapshot, id: 'snap-456', period_start: new Date('2024-02-01') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(snapshots);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findByTenantAndMetric('tenant-123', 'api_calls');

      expect(result).toHaveLength(2);
      expect(result.every((s) => s.tenantId === 'tenant-123')).toBe(true);
      expect(result.every((s) => s.metricKey === 'api_calls')).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('tenant_id'),
        }),
      );
    });

    it('should return empty array when no snapshots found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findByTenantAndMetric('tenant-123', 'nonexistent_metric');

      expect(result).toEqual([]);
    });

    it('should order by period_start descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockUsageSnapshot]);

      const repo = createUsageSnapshotRepository(mockDb);
      await repo.findByTenantAndMetric('tenant-123', 'api_calls');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*period_start.*desc/i),
        }),
      );
    });

    it('should respect default limit of 100', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockUsageSnapshot]);

      const repo = createUsageSnapshotRepository(mockDb);
      await repo.findByTenantAndMetric('tenant-123', 'api_calls');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/LIMIT 100/),
          values: expect.arrayContaining(['tenant-123', 'api_calls']),
        }),
      );
    });

    it('should respect custom limit parameter', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockUsageSnapshot]);

      const repo = createUsageSnapshotRepository(mockDb);
      await repo.findByTenantAndMetric('tenant-123', 'api_calls', 25);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/LIMIT 25/),
          values: expect.arrayContaining(['tenant-123', 'api_calls']),
        }),
      );
    });

    it('should filter by exact metric key', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockUsageSnapshot]);

      const repo = createUsageSnapshotRepository(mockDb);
      await repo.findByTenantAndMetric('tenant-123', 'api_calls');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('metric_key'),
          values: expect.arrayContaining(['tenant-123', 'api_calls']),
        }),
      );
    });

    it('should handle multiple time periods for same metric', async () => {
      const timeSeriesSnapshots = [
        { ...mockUsageSnapshot, period_start: new Date('2024-03-01'), value: 3000 },
        { ...mockUsageSnapshot, period_start: new Date('2024-02-01'), value: 2000 },
        { ...mockUsageSnapshot, period_start: new Date('2024-01-01'), value: 1000 },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(timeSeriesSnapshots);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findByTenantAndMetric('tenant-123', 'api_calls');

      expect(result).toHaveLength(3);
      expect(result.map((s) => s.value)).toEqual([3000, 2000, 1000]);
    });
  });

  describe('update', () => {
    it('should update snapshot and return updated record', async () => {
      const updatedSnapshot = {
        ...mockUsageSnapshot,
        value: 2000,
        updated_at: new Date('2024-01-20T15:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.update('snap-123', {
        value: 2000,
      });

      expect(result).toBeDefined();
      expect(result?.value).toBe(2000);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when snapshot not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.update('nonexistent-id', {
        value: 2000,
      });

      expect(result).toBeNull();
    });

    it('should update only value field', async () => {
      const updatedSnapshot = {
        ...mockUsageSnapshot,
        value: 1500,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.update('snap-123', {
        value: 1500,
      });

      expect(result?.value).toBe(1500);
      expect(result?.tenantId).toBe('tenant-123');
      expect(result?.metricKey).toBe('api_calls');
    });

    it('should update only updated_at field', async () => {
      const newDate = new Date('2024-01-25T18:00:00Z');
      const updatedSnapshot = {
        ...mockUsageSnapshot,
        updated_at: newDate,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.update('snap-123', {
        updatedAt: newDate,
      });

      expect(result?.updatedAt).toEqual(newDate);
      expect(result?.value).toBe(1000);
    });

    it('should update both value and updated_at', async () => {
      const newDate = new Date('2024-01-25T18:00:00Z');
      const updatedSnapshot = {
        ...mockUsageSnapshot,
        value: 3000,
        updated_at: newDate,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.update('snap-123', {
        value: 3000,
        updatedAt: newDate,
      });

      expect(result?.value).toBe(3000);
      expect(result?.updatedAt).toEqual(newDate);
    });

    it('should handle incrementing value', async () => {
      const updatedSnapshot = {
        ...mockUsageSnapshot,
        value: mockUsageSnapshot.value + 500,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.update('snap-123', {
        value: 1500,
      });

      expect(result?.value).toBe(1500);
    });

    it('should not allow updating immutable fields', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsageSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      await repo.update('snap-123', {
        value: 2000,
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/WHERE.*id/i),
          values: expect.arrayContaining(['snap-123']),
        }),
      );
    });
  });

  describe('upsert', () => {
    it('should insert new snapshot when not exists', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsageSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.upsert({
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        value: 1000,
        periodStart: new Date('2024-01-01T00:00:00Z'),
        periodEnd: new Date('2024-02-01T00:00:00Z'),
      });

      expect(result.tenantId).toBe('tenant-123');
      expect(result.metricKey).toBe('api_calls');
      expect(result.value).toBe(1000);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should update existing snapshot on conflict', async () => {
      const updatedSnapshot = {
        ...mockUsageSnapshot,
        value: 2000,
        updated_at: new Date('2024-01-20T15:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.upsert({
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        value: 2000,
        periodStart: new Date('2024-01-01T00:00:00Z'),
        periodEnd: new Date('2024-02-01T00:00:00Z'),
      });

      expect(result.value).toBe(2000);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ON CONFLICT/i),
        }),
      );
    });

    it('should throw error if upsert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUsageSnapshotRepository(mockDb);

      await expect(
        repo.upsert({
          tenantId: 'tenant-123',
          metricKey: 'api_calls',
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-02-01'),
        }),
      ).rejects.toThrow('Failed to upsert usage snapshot');
    });

    it('should use ON CONFLICT DO UPDATE with correct columns', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsageSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      await repo.upsert({
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ON CONFLICT.*tenant_id.*metric_key.*period_start/is),
        }),
      );
    });

    it('should update value and updated_at on conflict', async () => {
      const upsertedSnapshot = {
        ...mockUsageSnapshot,
        value: 1500,
        updated_at: new Date('2024-01-25T10:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(upsertedSnapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.upsert({
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        value: 1500,
        periodStart: new Date('2024-01-01T00:00:00Z'),
        periodEnd: new Date('2024-02-01T00:00:00Z'),
        updatedAt: new Date('2024-01-25T10:00:00Z'),
      });

      expect(result.value).toBe(1500);
      expect(result.updatedAt).toEqual(new Date('2024-01-25T10:00:00Z'));
    });

    it('should handle multiple upserts for same tenant different periods', async () => {
      const period1 = {
        ...mockUsageSnapshot,
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-02-01'),
      };
      const period2 = {
        ...mockUsageSnapshot,
        id: 'snap-456',
        period_start: new Date('2024-02-01'),
        period_end: new Date('2024-03-01'),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(period1).mockResolvedValueOnce(period2);

      const repo = createUsageSnapshotRepository(mockDb);
      const result1 = await repo.upsert({
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
      });
      const result2 = await repo.upsert({
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        periodStart: new Date('2024-02-01'),
        periodEnd: new Date('2024-03-01'),
      });

      expect(result1.id).toBe('snap-123');
      expect(result2.id).toBe('snap-456');
    });

    it('should handle multiple upserts for same tenant different metrics', async () => {
      const metric1 = mockUsageSnapshot;
      const metric2 = mockUsageSnapshot2;

      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(metric1).mockResolvedValueOnce(metric2);

      const repo = createUsageSnapshotRepository(mockDb);
      const result1 = await repo.upsert({
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
      });
      const result2 = await repo.upsert({
        tenantId: 'tenant-123',
        metricKey: 'storage_gb',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
      });

      expect(result1.metricKey).toBe('api_calls');
      expect(result2.metricKey).toBe('storage_gb');
    });
  });

  describe('edge cases', () => {
    it('should handle zero value', async () => {
      const snapshotWithZero = {
        ...mockUsageSnapshot,
        value: 0,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(snapshotWithZero);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findById('snap-123');

      expect(result?.value).toBe(0);
    });

    it('should handle very large values', async () => {
      const snapshotWithLargeValue = {
        ...mockUsageSnapshot,
        value: Number.MAX_SAFE_INTEGER,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(snapshotWithLargeValue);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        metricKey: 'api_calls',
        value: Number.MAX_SAFE_INTEGER,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
      });

      expect(result.value).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle period boundaries correctly', async () => {
      const snapshot = {
        ...mockUsageSnapshot,
        period_start: new Date('2024-01-01T00:00:00.000Z'),
        period_end: new Date('2024-01-31T23:59:59.999Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(snapshot);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findById('snap-123');

      expect(result?.periodStart).toEqual(new Date('2024-01-01T00:00:00.000Z'));
      expect(result?.periodEnd).toEqual(new Date('2024-01-31T23:59:59.999Z'));
    });

    it('should handle timestamp precision', async () => {
      const preciseTimestamp = new Date('2024-01-15T12:34:56.789Z');
      const snapshotWithPreciseDate = {
        ...mockUsageSnapshot,
        updated_at: preciseTimestamp,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(snapshotWithPreciseDate);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findById('snap-123');

      expect(result?.updatedAt).toEqual(preciseTimestamp);
    });

    it('should handle empty result sets', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findByTenantId('tenant-empty');

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle different metric key formats', async () => {
      const metricKeys = ['simple', 'snake_case', 'with_numbers_123', 'multiple_words_here'];

      for (const metricKey of metricKeys) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockUsageSnapshot,
          metric_key: metricKey,
        });

        const repo = createUsageSnapshotRepository(mockDb);
        const result = await repo.findById('snap-123');

        expect(result?.metricKey).toBe(metricKey);
      }
    });

    it('should handle overlapping periods for different metrics', async () => {
      const overlappingSnapshots = [
        mockUsageSnapshot,
        { ...mockUsageSnapshot, id: 'snap-456', metric_key: 'storage_gb' },
        { ...mockUsageSnapshot, id: 'snap-789', metric_key: 'bandwidth_mb' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(overlappingSnapshots);

      const repo = createUsageSnapshotRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(3);
      const uniqueMetrics = new Set(result.map((s) => s.metricKey));
      expect(uniqueMetrics.size).toBe(3);
    });
  });
});
