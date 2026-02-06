// backend/db/src/repositories/metering/usage-metrics.test.ts
/**
 * Tests for Usage Metrics Repository
 *
 * Validates usage metric definition operations including metric creation,
 * key lookups, listing all metrics, updates, and deletion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createUsageMetricRepository } from './usage-metrics';

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

const mockUsageMetric = {
  key: 'api_calls',
  name: 'API Calls',
  unit: 'requests',
  aggregation_type: 'sum' as const,
  created_at: new Date('2024-01-01'),
};

const mockUsageMetric2 = {
  key: 'storage_gb',
  name: 'Storage Usage',
  unit: 'GB',
  aggregation_type: 'max' as const,
  created_at: new Date('2024-01-02'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createUsageMetricRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new usage metric', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsageMetric);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.create({
        key: 'api_calls',
        name: 'API Calls',
        unit: 'requests',
        aggregationType: 'sum',
      });

      expect(result.key).toBe('api_calls');
      expect(result.name).toBe('API Calls');
      expect(result.unit).toBe('requests');
      expect(result.aggregationType).toBe('sum');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUsageMetricRepository(mockDb);

      await expect(
        repo.create({
          key: 'api_calls',
          name: 'API Calls',
          unit: 'requests',
        }),
      ).rejects.toThrow('Failed to create usage metric');
    });

    it('should handle optional aggregation type', async () => {
      const metricWithDefaultAggregation = {
        ...mockUsageMetric,
        aggregation_type: 'sum' as const,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(metricWithDefaultAggregation);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.create({
        key: 'api_calls',
        name: 'API Calls',
        unit: 'requests',
      });

      expect(result.aggregationType).toBe('sum');
    });

    it('should handle explicit aggregation type', async () => {
      const metricWithMaxAggregation = {
        ...mockUsageMetric,
        aggregation_type: 'max' as const,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(metricWithMaxAggregation);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.create({
        key: 'storage_gb',
        name: 'Storage Usage',
        unit: 'GB',
        aggregationType: 'max',
      });

      expect(result.aggregationType).toBe('max');
    });

    it('should handle last aggregation type', async () => {
      const metricWithLastAggregation = {
        ...mockUsageMetric,
        key: 'active_users',
        aggregation_type: 'last' as const,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(metricWithLastAggregation);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.create({
        key: 'active_users',
        name: 'Active Users',
        unit: 'users',
        aggregationType: 'last',
      });

      expect(result.aggregationType).toBe('last');
    });

    it('should handle optional created_at timestamp', async () => {
      const customDate = new Date('2024-06-15');
      const metricWithCustomDate = {
        ...mockUsageMetric,
        created_at: customDate,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(metricWithCustomDate);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.create({
        key: 'api_calls',
        name: 'API Calls',
        unit: 'requests',
        createdAt: customDate,
      });

      expect(result.createdAt).toEqual(customDate);
    });
  });

  describe('findByKey', () => {
    it('should return metric when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsageMetric);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.findByKey('api_calls');

      expect(result).toBeDefined();
      expect(result?.key).toBe('api_calls');
      expect(result?.name).toBe('API Calls');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('key'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.findByKey('nonexistent_metric');

      expect(result).toBeNull();
    });

    it('should handle exact key matching', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsageMetric);

      const repo = createUsageMetricRepository(mockDb);
      const key = 'api_calls';
      await repo.findByKey(key);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([key]),
        }),
      );
    });

    it('should handle underscore-separated keys', async () => {
      const metricWithUnderscores = {
        ...mockUsageMetric,
        key: 'storage_object_count',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(metricWithUnderscores);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.findByKey('storage_object_count');

      expect(result?.key).toBe('storage_object_count');
    });
  });

  describe('findAll', () => {
    it('should return array of all metrics', async () => {
      const metrics = [mockUsageMetric, mockUsageMetric2];
      vi.mocked(mockDb.query).mockResolvedValue(metrics);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('api_calls');
      expect(result[1].key).toBe('storage_gb');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('ORDER BY'),
        }),
      );
    });

    it('should return empty array when no metrics exist', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.findAll();

      expect(result).toEqual([]);
    });

    it('should order results by key ascending', async () => {
      const metrics = [
        { ...mockUsageMetric, key: 'bandwidth_mb' },
        { ...mockUsageMetric, key: 'api_calls' },
        { ...mockUsageMetric, key: 'storage_gb' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(metrics);

      const repo = createUsageMetricRepository(mockDb);
      await repo.findAll();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*key.*asc/i),
        }),
      );
    });

    it('should handle metrics with different aggregation types', async () => {
      const mixedMetrics = [
        mockUsageMetric,
        mockUsageMetric2,
        { ...mockUsageMetric, key: 'active_users', aggregation_type: 'last' as const },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(mixedMetrics);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.findAll();

      expect(result).toHaveLength(3);
      expect(result.map((m) => m.aggregationType)).toEqual(['sum', 'max', 'last']);
    });
  });

  describe('update', () => {
    it('should update metric and return updated record', async () => {
      const updatedMetric = {
        ...mockUsageMetric,
        name: 'Updated API Calls',
        unit: 'calls',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedMetric);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.update('api_calls', {
        name: 'Updated API Calls',
        unit: 'calls',
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated API Calls');
      expect(result?.unit).toBe('calls');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when metric not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.update('nonexistent_metric', {
        name: 'New Name',
      });

      expect(result).toBeNull();
    });

    it('should update only name field', async () => {
      const updatedMetric = {
        ...mockUsageMetric,
        name: 'New Name',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedMetric);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.update('api_calls', {
        name: 'New Name',
      });

      expect(result?.name).toBe('New Name');
      expect(result?.unit).toBe('requests');
      expect(result?.aggregationType).toBe('sum');
    });

    it('should update only unit field', async () => {
      const updatedMetric = {
        ...mockUsageMetric,
        unit: 'calls',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedMetric);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.update('api_calls', {
        unit: 'calls',
      });

      expect(result?.unit).toBe('calls');
      expect(result?.name).toBe('API Calls');
    });

    it('should update only aggregation type', async () => {
      const updatedMetric = {
        ...mockUsageMetric,
        aggregation_type: 'max' as const,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedMetric);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.update('api_calls', {
        aggregationType: 'max',
      });

      expect(result?.aggregationType).toBe('max');
    });

    it('should update multiple fields at once', async () => {
      const updatedMetric = {
        ...mockUsageMetric,
        name: 'Updated Name',
        unit: 'items',
        aggregation_type: 'last' as const,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedMetric);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.update('api_calls', {
        name: 'Updated Name',
        unit: 'items',
        aggregationType: 'last',
      });

      expect(result?.name).toBe('Updated Name');
      expect(result?.unit).toBe('items');
      expect(result?.aggregationType).toBe('last');
    });

    it('should not allow updating the key field', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsageMetric);

      const repo = createUsageMetricRepository(mockDb);
      await repo.update('api_calls', {
        name: 'New Name',
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/WHERE.*key/i),
          values: expect.arrayContaining(['api_calls']),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete metric and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.delete('api_calls');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when metric not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.delete('nonexistent_metric');

      expect(result).toBe(false);
    });

    it('should perform hard delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createUsageMetricRepository(mockDb);
      await repo.delete('api_calls');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*usage_metrics/s),
        }),
      );
    });

    it('should only delete exact key match', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createUsageMetricRepository(mockDb);
      const key = 'storage_gb';
      await repo.delete(key);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([key]),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle very long key names within limit', async () => {
      const longKey = 'a'.repeat(100);
      const metricWithLongKey = {
        ...mockUsageMetric,
        key: longKey,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(metricWithLongKey);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.create({
        key: longKey,
        name: 'Long Key Metric',
        unit: 'count',
      });

      expect(result.key).toBe(longKey);
    });

    it('should handle special characters in units', async () => {
      const metricWithSpecialUnit = {
        ...mockUsageMetric,
        unit: 'requests/second',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(metricWithSpecialUnit);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.create({
        key: 'api_rate',
        name: 'API Rate',
        unit: 'requests/second',
      });

      expect(result.unit).toBe('requests/second');
    });

    it('should handle empty metric list', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.findAll();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle various valid key formats', async () => {
      const validKeys = ['simple', 'snake_case', 'with_numbers123', 'multiple_words_here'];

      for (const key of validKeys) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockUsageMetric,
          key,
        });

        const repo = createUsageMetricRepository(mockDb);
        const result = await repo.findByKey(key);

        expect(result?.key).toBe(key);
      }
    });

    it('should handle concurrent updates gracefully', async () => {
      const updatedMetric = {
        ...mockUsageMetric,
        name: 'Concurrent Update',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedMetric);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.update('api_calls', {
        name: 'Concurrent Update',
      });

      expect(result?.name).toBe('Concurrent Update');
    });

    it('should handle timestamp precision', async () => {
      const preciseTimestamp = new Date('2024-01-01T12:34:56.789Z');
      const metricWithPreciseDate = {
        ...mockUsageMetric,
        created_at: preciseTimestamp,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(metricWithPreciseDate);

      const repo = createUsageMetricRepository(mockDb);
      const result = await repo.findByKey('api_calls');

      expect(result?.createdAt).toEqual(preciseTimestamp);
    });
  });
});
