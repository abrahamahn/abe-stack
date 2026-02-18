// main/shared/src/system/usage-metering/usage.metering.test.ts

import { describe, expect, it } from 'vitest';

import {
  aggregateSnapshots,
  aggregateValues,
  isOverQuota,
  usageMetricSchema,
  usageMetricSummarySchema,
  usageSnapshotSchema,
  usageSummaryResponseSchema,
} from './usage.metering';

import type { UsageSnapshot } from './usage.metering';

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Creates a valid UsageMetric test fixture.
 * @param overrides - Partial overrides for the default values
 * @returns A complete UsageMetric object
 */
function createValidUsageMetric(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    key: 'api_requests',
    name: 'API Requests',
    unit: 'requests',
    aggregationType: 'sum',
    ...overrides,
  };
}

/**
 * Creates a valid UsageSnapshot test fixture.
 * @param overrides - Partial overrides for the default values
 * @returns A complete UsageSnapshot object
 */
function createValidUsageSnapshot(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 'snap_001',
    tenantId: '12345678-1234-4abc-8abc-123456789001',
    metricKey: 'api_requests',
    value: 1000,
    periodStart: '2026-02-01T00:00:00.000Z',
    periodEnd: '2026-02-28T23:59:59.999Z',
    updatedAt: '2026-02-06T12:00:00.000Z',
    ...overrides,
  };
}

// ============================================================================
// usageMetricSchema Tests
// ============================================================================

describe('usageMetricSchema', () => {
  describe('when given valid input', () => {
    it('should parse valid metric with aggregation type "sum"', () => {
      const input = createValidUsageMetric({ aggregationType: 'sum' });
      const result = usageMetricSchema.parse(input);

      expect(result).toEqual({
        key: 'api_requests',
        name: 'API Requests',
        unit: 'requests',
        aggregationType: 'sum',
      });
    });

    it('should parse valid metric with aggregation type "max"', () => {
      const input = createValidUsageMetric({ aggregationType: 'max' });
      const result = usageMetricSchema.parse(input);

      expect(result.aggregationType).toBe('max');
    });

    it('should parse valid metric with aggregation type "last"', () => {
      const input = createValidUsageMetric({ aggregationType: 'last' });
      const result = usageMetricSchema.parse(input);

      expect(result.aggregationType).toBe('last');
    });

    it('should preserve all string field values', () => {
      const input = createValidUsageMetric({
        key: 'storage_bytes',
        name: 'Storage Usage',
        unit: 'bytes',
      });
      const result = usageMetricSchema.parse(input);

      expect(result.key).toBe('storage_bytes');
      expect(result.name).toBe('Storage Usage');
      expect(result.unit).toBe('bytes');
    });
  });

  describe('when given invalid aggregation type', () => {
    it('should throw error for invalid string aggregation type', () => {
      const input = createValidUsageMetric({ aggregationType: 'average' });

      expect(() => usageMetricSchema.parse(input)).toThrow(
        'Invalid aggregation type: "average". Expected one of: sum, max, last',
      );
    });

    it('should throw error for numeric aggregation type', () => {
      const input = createValidUsageMetric({ aggregationType: 123 });

      expect(() => usageMetricSchema.parse(input)).toThrow('aggregation type must be a string');
    });

    it('should throw error for null aggregation type', () => {
      const input = createValidUsageMetric({ aggregationType: null });

      expect(() => usageMetricSchema.parse(input)).toThrow('aggregation type must be a string');
    });

    it('should throw error for undefined aggregation type', () => {
      const input = createValidUsageMetric({ aggregationType: undefined });

      expect(() => usageMetricSchema.parse(input)).toThrow('aggregation type must be a string');
    });
  });

  describe('when given invalid field types', () => {
    it('should throw error when key is not a string', () => {
      const input = createValidUsageMetric({ key: 123 });

      expect(() => usageMetricSchema.parse(input)).toThrow('key must be a string');
    });

    it('should throw error when name is not a string', () => {
      const input = createValidUsageMetric({ name: true });

      expect(() => usageMetricSchema.parse(input)).toThrow('name must be a string');
    });

    it('should throw error when unit is not a string', () => {
      const input = createValidUsageMetric({ unit: ['requests'] });

      expect(() => usageMetricSchema.parse(input)).toThrow('unit must be a string');
    });

    it('should throw error when key is null', () => {
      const input = createValidUsageMetric({ key: null });

      expect(() => usageMetricSchema.parse(input)).toThrow('key must be a string');
    });

    it('should throw error when name is undefined', () => {
      const input = createValidUsageMetric({ name: undefined });

      expect(() => usageMetricSchema.parse(input)).toThrow('name must be a string');
    });
  });

  describe('when given missing fields', () => {
    it('should throw error when key is missing', () => {
      const { key: _key, ...input } = createValidUsageMetric();

      expect(() => usageMetricSchema.parse(input)).toThrow('key must be a string');
    });

    it('should throw error when name is missing', () => {
      const { name: _name, ...input } = createValidUsageMetric();

      expect(() => usageMetricSchema.parse(input)).toThrow('name must be a string');
    });

    it('should throw error when unit is missing', () => {
      const { unit: _unit, ...input } = createValidUsageMetric();

      expect(() => usageMetricSchema.parse(input)).toThrow('unit must be a string');
    });

    it('should throw error when aggregationType is missing', () => {
      const { aggregationType: _aggregationType, ...input } = createValidUsageMetric();

      expect(() => usageMetricSchema.parse(input)).toThrow('aggregation type must be a string');
    });
  });

  describe('edge cases', () => {
    it('should throw error when input is null', () => {
      expect(() => usageMetricSchema.parse(null)).toThrow('key must be a string');
    });

    it('should throw error when input is undefined', () => {
      expect(() => usageMetricSchema.parse(undefined)).toThrow('key must be a string');
    });

    it('should throw error when input is not an object', () => {
      expect(() => usageMetricSchema.parse('string')).toThrow('key must be a string');
    });

    it('should throw error when input is an array', () => {
      expect(() => usageMetricSchema.parse([1, 2, 3])).toThrow('key must be a string');
    });

    it('should accept empty strings for string fields', () => {
      const input = createValidUsageMetric({
        key: '',
        name: '',
        unit: '',
      });

      const result = usageMetricSchema.parse(input);
      expect(result.key).toBe('');
      expect(result.name).toBe('');
      expect(result.unit).toBe('');
    });
  });
});

// ============================================================================
// usageSnapshotSchema Tests
// ============================================================================

describe('usageSnapshotSchema', () => {
  describe('when given valid input', () => {
    it('should parse valid usage snapshot with all required fields', () => {
      const input = createValidUsageSnapshot();
      const result = usageSnapshotSchema.parse(input);

      expect(result).toEqual({
        id: 'snap_001',
        tenantId: '12345678-1234-4abc-8abc-123456789001',
        metricKey: 'api_requests',
        value: 1000,
        periodStart: '2026-02-01T00:00:00.000Z',
        periodEnd: '2026-02-28T23:59:59.999Z',
        updatedAt: '2026-02-06T12:00:00.000Z',
      });
    });

    it('should parse snapshot with different valid UUID format', () => {
      // Must satisfy UUID regex: [1-5] in third segment, [89ab] in fourth segment
      const input = createValidUsageSnapshot({
        tenantId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
      });
      const result = usageSnapshotSchema.parse(input);

      expect(result.tenantId).toBe('a1b2c3d4-e5f6-4890-abcd-ef1234567890');
    });

    it('should parse snapshot with zero value', () => {
      const input = createValidUsageSnapshot({ value: 0 });
      const result = usageSnapshotSchema.parse(input);

      expect(result.value).toBe(0);
    });

    it('should parse snapshot with negative value', () => {
      const input = createValidUsageSnapshot({ value: -100 });
      const result = usageSnapshotSchema.parse(input);

      expect(result.value).toBe(-100);
    });

    it('should parse snapshot with decimal value', () => {
      const input = createValidUsageSnapshot({ value: 1234.5678 });
      const result = usageSnapshotSchema.parse(input);

      expect(result.value).toBe(1234.5678);
    });

    it('should parse snapshot with different valid ISO datetime formats', () => {
      const input = createValidUsageSnapshot({
        periodStart: '2026-01-15T10:30:45.123Z',
        periodEnd: '2026-01-31T23:59:59.999Z',
        updatedAt: '2026-02-01T08:15:30.000Z',
      });
      const result = usageSnapshotSchema.parse(input);

      expect(result.periodStart).toBe('2026-01-15T10:30:45.123Z');
      expect(result.periodEnd).toBe('2026-01-31T23:59:59.999Z');
      expect(result.updatedAt).toBe('2026-02-01T08:15:30.000Z');
    });
  });

  describe('when given invalid tenantId', () => {
    it('should throw error for non-UUID string', () => {
      const input = createValidUsageSnapshot({ tenantId: 'not-a-uuid' });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('TenantId must be a valid UUID');
    });

    it('should throw error for UUID with invalid format', () => {
      const input = createValidUsageSnapshot({ tenantId: '12345678-1234-1234-1234' });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('TenantId must be a valid UUID');
    });

    it('should throw error for UUID with extra characters', () => {
      const input = createValidUsageSnapshot({
        tenantId: '12345678-1234-4abc-8abc-123456789001-extra',
      });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('TenantId must be a valid UUID');
    });

    it('should throw error when tenantId is a number', () => {
      const input = createValidUsageSnapshot({ tenantId: 123 });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('TenantId must be a string');
    });

    it('should throw error when tenantId is null', () => {
      const input = createValidUsageSnapshot({ tenantId: null });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('TenantId must be a string');
    });

    it('should throw error when tenantId is undefined', () => {
      const input = createValidUsageSnapshot({ tenantId: undefined });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('TenantId must be a string');
    });
  });

  describe('when given invalid value', () => {
    it('should throw error when value is a string', () => {
      const input = createValidUsageSnapshot({ value: '1000' });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('value must be a number');
    });

    it('should throw error when value is null', () => {
      const input = createValidUsageSnapshot({ value: null });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('value must be a number');
    });

    it('should throw error when value is undefined', () => {
      const input = createValidUsageSnapshot({ value: undefined });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('value must be a number');
    });

    it('should throw error when value is NaN', () => {
      const input = createValidUsageSnapshot({ value: Number.NaN });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('value must be a number');
    });

    it('should throw error when value is a boolean', () => {
      const input = createValidUsageSnapshot({ value: true });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('value must be a number');
    });

    it('should throw error when value is an object', () => {
      const input = createValidUsageSnapshot({ value: { count: 1000 } });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('value must be a number');
    });
  });

  describe('when given invalid ISO datetime fields', () => {
    it('should throw error for invalid periodStart format', () => {
      const input = createValidUsageSnapshot({ periodStart: 'not-a-date' });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('Invalid ISO datetime format');
    });

    it('should throw error for invalid periodEnd format', () => {
      const input = createValidUsageSnapshot({ periodEnd: '28/02/2026' });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('Invalid ISO datetime format');
    });

    it('should throw error for invalid updatedAt format', () => {
      const input = createValidUsageSnapshot({ updatedAt: 'not-a-date' });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('Invalid ISO datetime format');
    });

    it('should throw error when periodStart is a number', () => {
      const input = createValidUsageSnapshot({ periodStart: 1675209600000 });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('ISO datetime must be a string');
    });

    it('should throw error when periodEnd is null', () => {
      const input = createValidUsageSnapshot({ periodEnd: null });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('ISO datetime must be a string');
    });

    it('should throw error when updatedAt is undefined', () => {
      const input = createValidUsageSnapshot({ updatedAt: undefined });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('ISO datetime must be a string');
    });

    it('should accept datetime string without explicit timezone (local time)', () => {
      const input = createValidUsageSnapshot({ periodStart: '2026-02-01T00:00:00' });
      const result = usageSnapshotSchema.parse(input);

      expect(result.periodStart).toBe('2026-02-01T00:00:00');
    });

    it('should throw error for invalid date in ISO format', () => {
      const input = createValidUsageSnapshot({ periodStart: '2026-13-01T00:00:00.000Z' });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('Invalid ISO datetime format');
    });

    it('should throw error for unparseable datetime string', () => {
      const input = createValidUsageSnapshot({ updatedAt: 'not-a-date' });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('Invalid ISO datetime format');
    });
  });

  describe('when given invalid metricKey', () => {
    it('should throw error when metricKey is a number', () => {
      const input = createValidUsageSnapshot({ metricKey: 123 });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('metricKey must be a string');
    });

    it('should throw error when metricKey is null', () => {
      const input = createValidUsageSnapshot({ metricKey: null });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('metricKey must be a string');
    });

    it('should throw error when metricKey is undefined', () => {
      const input = createValidUsageSnapshot({ metricKey: undefined });

      expect(() => usageSnapshotSchema.parse(input)).toThrow('metricKey must be a string');
    });

    it('should accept empty string for metricKey', () => {
      const input = createValidUsageSnapshot({ metricKey: '' });
      const result = usageSnapshotSchema.parse(input);

      expect(result.metricKey).toBe('');
    });
  });

  describe('when given missing fields', () => {
    it('should throw error when id is missing', () => {
      const { id: _id, ...input } = createValidUsageSnapshot();

      expect(() => usageSnapshotSchema.parse(input)).toThrow('id must be a string');
    });

    it('should throw error when tenantId is missing', () => {
      const { tenantId: _tenantId, ...input } = createValidUsageSnapshot();

      expect(() => usageSnapshotSchema.parse(input)).toThrow('TenantId must be a string');
    });

    it('should throw error when metricKey is missing', () => {
      const { metricKey: _metricKey, ...input } = createValidUsageSnapshot();

      expect(() => usageSnapshotSchema.parse(input)).toThrow('metricKey must be a string');
    });

    it('should throw error when value is missing', () => {
      const { value: _value, ...input } = createValidUsageSnapshot();

      expect(() => usageSnapshotSchema.parse(input)).toThrow('value must be a number');
    });

    it('should throw error when periodStart is missing', () => {
      const { periodStart: _periodStart, ...input } = createValidUsageSnapshot();

      expect(() => usageSnapshotSchema.parse(input)).toThrow('ISO datetime must be a string');
    });

    it('should throw error when periodEnd is missing', () => {
      const { periodEnd: _periodEnd, ...input } = createValidUsageSnapshot();

      expect(() => usageSnapshotSchema.parse(input)).toThrow('ISO datetime must be a string');
    });

    it('should throw error when updatedAt is missing', () => {
      const { updatedAt: _updatedAt, ...input } = createValidUsageSnapshot();

      expect(() => usageSnapshotSchema.parse(input)).toThrow('ISO datetime must be a string');
    });
  });

  describe('edge cases', () => {
    it('should throw error when input is null', () => {
      expect(() => usageSnapshotSchema.parse(null)).toThrow('id must be a string');
    });

    it('should throw error when input is undefined', () => {
      expect(() => usageSnapshotSchema.parse(undefined)).toThrow('id must be a string');
    });

    it('should throw error when input is not an object', () => {
      expect(() => usageSnapshotSchema.parse('string')).toThrow('id must be a string');
    });

    it('should throw error when input is an array', () => {
      expect(() => usageSnapshotSchema.parse([])).toThrow('id must be a string');
    });

    it('should accept very large numeric values', () => {
      const input = createValidUsageSnapshot({ value: Number.MAX_SAFE_INTEGER });
      const result = usageSnapshotSchema.parse(input);

      expect(result.value).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should accept Infinity as value', () => {
      const input = createValidUsageSnapshot({ value: Number.POSITIVE_INFINITY });
      const result = usageSnapshotSchema.parse(input);

      expect(result.value).toBe(Number.POSITIVE_INFINITY);
    });
  });
});

// ============================================================================
// aggregateValues Tests
// ============================================================================

describe('aggregateValues', () => {
  it('returns 0 for empty array', () => {
    expect(aggregateValues([], 'sum')).toBe(0);
    expect(aggregateValues([], 'max')).toBe(0);
    expect(aggregateValues([], 'last')).toBe(0);
  });

  describe('sum aggregation', () => {
    it('sums all values', () => {
      expect(aggregateValues([1, 2, 3, 4, 5], 'sum')).toBe(15);
    });

    it('handles negative values', () => {
      expect(aggregateValues([-1, 2, -3], 'sum')).toBe(-2);
    });
  });

  describe('max aggregation', () => {
    it('returns the maximum value', () => {
      expect(aggregateValues([1, 5, 3, 2], 'max')).toBe(5);
    });

    it('handles single value', () => {
      expect(aggregateValues([42], 'max')).toBe(42);
    });

    it('handles negative values', () => {
      expect(aggregateValues([-5, -1, -10], 'max')).toBe(-1);
    });
  });

  describe('last aggregation', () => {
    it('returns the last value', () => {
      expect(aggregateValues([1, 2, 3], 'last')).toBe(3);
    });

    it('handles single value', () => {
      expect(aggregateValues([42], 'last')).toBe(42);
    });
  });

  it('returns 0 for unknown aggregation type', () => {
    expect(aggregateValues([1, 2, 3], 'unknown' as 'sum')).toBe(0);
  });
});

// ============================================================================
// aggregateSnapshots Tests
// ============================================================================

describe('aggregateSnapshots', () => {
  it('aggregates snapshot values', () => {
    const snapshots: UsageSnapshot[] = [
      {
        id: 'snap_1',
        tenantId: 'tenant-1' as UsageSnapshot['tenantId'],
        metricKey: 'api_calls',
        value: 100,
        periodStart: '2023-01-01T00:00:00Z',
        periodEnd: '2023-01-31T23:59:59Z',
        updatedAt: '2023-01-15T12:00:00Z',
      },
      {
        id: 'snap_2',
        tenantId: 'tenant-1' as UsageSnapshot['tenantId'],
        metricKey: 'api_calls',
        value: 200,
        periodStart: '2023-02-01T00:00:00Z',
        periodEnd: '2023-02-28T23:59:59Z',
        updatedAt: '2023-02-15T12:00:00Z',
      },
    ];

    expect(aggregateSnapshots(snapshots, 'sum')).toBe(300);
    expect(aggregateSnapshots(snapshots, 'max')).toBe(200);
    expect(aggregateSnapshots(snapshots, 'last')).toBe(200);
  });

  it('handles empty snapshots', () => {
    expect(aggregateSnapshots([], 'sum')).toBe(0);
  });
});

// ============================================================================
// isOverQuota Tests
// ============================================================================

describe('isOverQuota', () => {
  it('returns true when usage equals limit', () => {
    expect(isOverQuota(100, 100)).toBe(true);
  });

  it('returns true when usage exceeds limit', () => {
    expect(isOverQuota(101, 100)).toBe(true);
  });

  it('returns false when usage is below limit', () => {
    expect(isOverQuota(50, 100)).toBe(false);
  });

  it('returns false for Infinity limit', () => {
    expect(isOverQuota(999999, Infinity)).toBe(false);
  });

  it('returns false for -1 limit (unlimited)', () => {
    expect(isOverQuota(999999, -1)).toBe(false);
  });

  it('handles zero usage and limit', () => {
    expect(isOverQuota(0, 0)).toBe(true);
  });
});

// ============================================================================
// usageMetricSummarySchema Tests
// ============================================================================

describe('usageMetricSummarySchema', () => {
  function createValidSummary(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      metricKey: 'api_requests',
      name: 'API Requests',
      unit: 'requests',
      currentValue: 750,
      limit: 1000,
      percentUsed: 75,
      ...overrides,
    };
  }

  describe('when given valid input', () => {
    it('should parse valid summary with all fields', () => {
      const result = usageMetricSummarySchema.parse(createValidSummary());

      expect(result.metricKey).toBe('api_requests');
      expect(result.name).toBe('API Requests');
      expect(result.unit).toBe('requests');
      expect(result.currentValue).toBe(750);
      expect(result.limit).toBe(1000);
      expect(result.percentUsed).toBe(75);
    });

    it('should parse summary with zero currentValue and percentUsed', () => {
      const result = usageMetricSummarySchema.parse(
        createValidSummary({ currentValue: 0, percentUsed: 0 }),
      );

      expect(result.currentValue).toBe(0);
      expect(result.percentUsed).toBe(0);
    });

    it('should parse summary with unlimited limit (negative)', () => {
      const result = usageMetricSummarySchema.parse(createValidSummary({ limit: -1 }));

      expect(result.limit).toBe(-1);
    });

    it('should parse summary with decimal percentUsed', () => {
      const result = usageMetricSummarySchema.parse(
        createValidSummary({ currentValue: 333, limit: 1000, percentUsed: 33.3 }),
      );

      expect(result.percentUsed).toBe(33.3);
    });
  });

  describe('when given invalid input', () => {
    it('should throw when metricKey is missing', () => {
      const { metricKey: _mk, ...input } = createValidSummary();
      expect(() => usageMetricSummarySchema.parse(input)).toThrow('metricKey must be a string');
    });

    it('should throw when currentValue is not a number', () => {
      expect(() =>
        usageMetricSummarySchema.parse(createValidSummary({ currentValue: 'a lot' })),
      ).toThrow('currentValue must be a number');
    });

    it('should throw when limit is null', () => {
      expect(() => usageMetricSummarySchema.parse(createValidSummary({ limit: null }))).toThrow(
        'limit must be a number',
      );
    });

    it('should throw when percentUsed is missing', () => {
      const { percentUsed: _pu, ...input } = createValidSummary();
      expect(() => usageMetricSummarySchema.parse(input)).toThrow('percentUsed must be a number');
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => usageMetricSummarySchema.parse(null)).toThrow();
    });

    it('should throw for non-object input', () => {
      expect(() => usageMetricSummarySchema.parse('summary')).toThrow();
    });
  });
});

// ============================================================================
// usageSummaryResponseSchema Tests
// ============================================================================

describe('usageSummaryResponseSchema', () => {
  const validMetric = {
    metricKey: 'api_requests',
    name: 'API Requests',
    unit: 'requests',
    currentValue: 500,
    limit: 1000,
    percentUsed: 50,
  };

  function createValidResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      metrics: [validMetric],
      periodStart: '2026-02-01T00:00:00.000Z',
      periodEnd: '2026-02-28T23:59:59.999Z',
      ...overrides,
    };
  }

  describe('when given valid input', () => {
    it('should parse response with one metric', () => {
      const result = usageSummaryResponseSchema.parse(createValidResponse());

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0]?.metricKey).toBe('api_requests');
      expect(result.periodStart).toBe('2026-02-01T00:00:00.000Z');
      expect(result.periodEnd).toBe('2026-02-28T23:59:59.999Z');
    });

    it('should parse response with empty metrics array', () => {
      const result = usageSummaryResponseSchema.parse(createValidResponse({ metrics: [] }));

      expect(result.metrics).toHaveLength(0);
    });

    it('should parse response with multiple metrics', () => {
      const secondMetric = {
        metricKey: 'storage_bytes',
        name: 'Storage',
        unit: 'bytes',
        currentValue: 1024,
        limit: 5120,
        percentUsed: 20,
      };
      const result = usageSummaryResponseSchema.parse(
        createValidResponse({ metrics: [validMetric, secondMetric] }),
      );

      expect(result.metrics).toHaveLength(2);
      expect(result.metrics[1]?.metricKey).toBe('storage_bytes');
    });
  });

  describe('when given invalid input', () => {
    it('should throw when metrics is not an array', () => {
      expect(() =>
        usageSummaryResponseSchema.parse(createValidResponse({ metrics: 'not-array' })),
      ).toThrow('metrics must be an array');
    });

    it('should throw when metrics is missing', () => {
      const { metrics: _m, ...input } = createValidResponse();
      expect(() => usageSummaryResponseSchema.parse(input)).toThrow('metrics must be an array');
    });

    it('should throw when periodStart is not a valid datetime', () => {
      expect(() =>
        usageSummaryResponseSchema.parse(createValidResponse({ periodStart: 'bad-date' })),
      ).toThrow('Invalid ISO datetime format');
    });

    it('should throw when periodEnd is missing', () => {
      const { periodEnd: _pe, ...input } = createValidResponse();
      expect(() => usageSummaryResponseSchema.parse(input)).toThrow(
        'ISO datetime must be a string',
      );
    });

    it('should throw when a metric in the array is invalid', () => {
      const badMetric = { ...validMetric, currentValue: 'not-a-number' };
      expect(() =>
        usageSummaryResponseSchema.parse(createValidResponse({ metrics: [badMetric] })),
      ).toThrow('currentValue must be a number');
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => usageSummaryResponseSchema.parse(null)).toThrow('metrics must be an array');
    });

    it('should throw for non-object input', () => {
      expect(() => usageSummaryResponseSchema.parse('response')).toThrow(
        'metrics must be an array',
      );
    });
  });
});

// ============================================================================
// Adversarial: aggregateValues boundary stress
// ============================================================================

describe('aggregateValues — adversarial', () => {
  describe('overflow and precision boundaries', () => {
    it('sum of MAX_SAFE_INTEGER values overflows to Infinity', () => {
      const result = aggregateValues([Number.MAX_VALUE, Number.MAX_VALUE], 'sum');
      expect(result).toBe(Infinity);
    });

    it('sum handles mix of Infinity and negative Infinity (NaN result)', () => {
      const result = aggregateValues([Infinity, -Infinity], 'sum');
      expect(Number.isNaN(result)).toBe(true);
    });

    it('max with a single -Infinity value returns -Infinity', () => {
      expect(aggregateValues([-Infinity], 'max')).toBe(-Infinity);
    });

    it('max of all-negative array returns least-negative value', () => {
      expect(aggregateValues([-100, -1, -50], 'max')).toBe(-1);
    });

    it('last on single-element array returns that element', () => {
      expect(aggregateValues([42], 'last')).toBe(42);
    });

    it('last on large array returns the final element, not the largest', () => {
      expect(aggregateValues([999, 1, 2, 0], 'last')).toBe(0);
    });

    it('sum with NaN propagates NaN', () => {
      const result = aggregateValues([1, NaN, 3], 'sum');
      expect(Number.isNaN(result)).toBe(true);
    });

    it('max with NaN in array returns NaN (JS comparison with NaN is always false)', () => {
      // The iterative max implementation compares with >, which returns false when NaN
      // so NaN does NOT replace the current max — result depends on position
      const result = aggregateValues([NaN, 5, 3], 'max');
      // NaN starts as max[0]; 5 > NaN is false, 3 > NaN is false → returns NaN
      expect(Number.isNaN(result)).toBe(true);
    });

    it('max when NaN comes after valid number returns the valid number', () => {
      // max[0] = 5; NaN > 5 is false → max stays 5
      const result = aggregateValues([5, NaN, 3], 'max');
      expect(result).toBe(5);
    });
  });

  describe('empty array edge cases', () => {
    it('returns 0 for sum of empty array', () => {
      expect(aggregateValues([], 'sum')).toBe(0);
    });

    it('returns 0 for max of empty array', () => {
      expect(aggregateValues([], 'max')).toBe(0);
    });

    it('returns 0 for last of empty array', () => {
      expect(aggregateValues([], 'last')).toBe(0);
    });
  });
});

// ============================================================================
// Adversarial: isOverQuota boundary conditions
// ============================================================================

describe('isOverQuota — adversarial', () => {
  it('returns false for negative usage with positive limit', () => {
    expect(isOverQuota(-1, 100)).toBe(false);
  });

  it('returns true when usage equals limit at zero', () => {
    expect(isOverQuota(0, 0)).toBe(true);
  });

  it('returns false for NaN usage (NaN >= limit is false)', () => {
    expect(isOverQuota(NaN, 100)).toBe(false);
  });

  it('returns false for NaN limit (since limit !== Infinity and limit !== -1, compares NaN)', () => {
    // currentUsage >= NaN is false
    expect(isOverQuota(100, NaN)).toBe(false);
  });

  it('returns false for Infinity limit sentinel', () => {
    expect(isOverQuota(Number.MAX_SAFE_INTEGER, Infinity)).toBe(false);
  });

  it('returns false for -1 limit sentinel (unlimited)', () => {
    expect(isOverQuota(Number.MAX_SAFE_INTEGER, -1)).toBe(false);
  });

  it('returns true for Infinity usage against finite limit', () => {
    expect(isOverQuota(Infinity, 1000)).toBe(true);
  });

  it('returns true when usage is 1 more than limit', () => {
    expect(isOverQuota(1001, 1000)).toBe(true);
  });

  it('returns false when usage is 1 less than limit', () => {
    expect(isOverQuota(999, 1000)).toBe(false);
  });
});

// ============================================================================
// Adversarial: usageSnapshotSchema — malformed structure attacks
// ============================================================================

describe('usageSnapshotSchema — adversarial', () => {
  it('rejects prototype-injected object with no enumerable own props', () => {
    // An object with a null prototype and no own properties
    const empty = Object.create(null) as Record<string, unknown>;
    expect(() => usageSnapshotSchema.parse(empty)).toThrow('id must be a string');
  });

  it('rejects snapshot where value is Number.NEGATIVE_INFINITY (still a number — passes)', () => {
    const input = createValidUsageSnapshot({ value: Number.NEGATIVE_INFINITY });
    const result = usageSnapshotSchema.parse(input);
    expect(result.value).toBe(Number.NEGATIVE_INFINITY);
  });

  it('accepts ISO date-only string for periodStart (new Date() parses it without NaN)', () => {
    // isoDateTimeSchema uses new Date(data).getTime() — date-only strings are valid dates
    const input = createValidUsageSnapshot({ periodStart: '2026-02-01' });
    const result = usageSnapshotSchema.parse(input);
    expect(result.periodStart).toBe('2026-02-01');
  });

  it('rejects snapshot where tenantId has uppercase letters in wrong segment (v4 variant bit)', () => {
    // Fourth segment must start with [89ab]; 'C' fails even case-insensitively since C > b
    const input = createValidUsageSnapshot({
      tenantId: '12345678-1234-4abc-Cabc-123456789001',
    });
    expect(() => usageSnapshotSchema.parse(input)).toThrow('TenantId must be a valid UUID');
  });

  it('rejects snapshot where all fields are present but tenantId is an object', () => {
    const input = createValidUsageSnapshot({
      tenantId: { id: '12345678-1234-4abc-8abc-123456789001' },
    });
    expect(() => usageSnapshotSchema.parse(input)).toThrow('TenantId must be a string');
  });

  it('rejects a completely empty object', () => {
    expect(() => usageSnapshotSchema.parse({})).toThrow('id must be a string');
  });

  it('rejects when value is an array of one number', () => {
    const input = createValidUsageSnapshot({ value: [1000] });
    expect(() => usageSnapshotSchema.parse(input)).toThrow('value must be a number');
  });
});

// ============================================================================
// Adversarial: usageMetricSummarySchema — overflow and precision
// ============================================================================

describe('usageMetricSummarySchema — adversarial', () => {
  function createValidSummary(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      metricKey: 'api_requests',
      name: 'API Requests',
      unit: 'requests',
      currentValue: 750,
      limit: 1000,
      percentUsed: 75,
      ...overrides,
    };
  }

  it('accepts percentUsed greater than 100 (over-quota scenario)', () => {
    const result = usageMetricSummarySchema.parse(createValidSummary({ percentUsed: 150 }));
    expect(result.percentUsed).toBe(150);
  });

  it('accepts negative percentUsed (corrective credit scenario)', () => {
    const result = usageMetricSummarySchema.parse(createValidSummary({ percentUsed: -5 }));
    expect(result.percentUsed).toBe(-5);
  });

  it('accepts Infinity as limit (unlimited tier)', () => {
    const result = usageMetricSummarySchema.parse(createValidSummary({ limit: Infinity }));
    expect(result.limit).toBe(Infinity);
  });

  it('rejects currentValue as boolean true (not a number type)', () => {
    expect(() =>
      usageMetricSummarySchema.parse(createValidSummary({ currentValue: true })),
    ).toThrow('currentValue must be a number');
  });

  it('rejects percentUsed as a string that looks numeric', () => {
    expect(() =>
      usageMetricSummarySchema.parse(createValidSummary({ percentUsed: '75%' })),
    ).toThrow('percentUsed must be a number');
  });

  it('rejects when name is an array', () => {
    expect(() =>
      usageMetricSummarySchema.parse(createValidSummary({ name: ['API Requests'] })),
    ).toThrow('name must be a string');
  });
});
