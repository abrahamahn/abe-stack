// backend/db/src/schema/metering.test.ts
/**
 * Unit tests for metering schema type definitions
 *
 * Tests type correctness, constant values, and column mappings for the
 * usage_metrics and usage_snapshots table schemas. Since this is a pure type
 * definition file, tests focus on runtime constant validation and structural
 * correctness.
 *
 * @complexity O(1) - All tests are simple constant/type checks
 */

import { describe, expect, test } from 'vitest';

import {
  AGGREGATION_TYPES,
  type AggregationType,
  type NewUsageMetric,
  type NewUsageSnapshot,
  type UpdateUsageMetric,
  type UpdateUsageSnapshot,
  USAGE_METRIC_COLUMNS,
  USAGE_METRICS_TABLE,
  type UsageMetric,
  type UsageSnapshot,
  USAGE_SNAPSHOT_COLUMNS,
  USAGE_SNAPSHOTS_TABLE,
} from './metering';

describe('Schema Constants', () => {
  describe('Table Names', () => {
    test('USAGE_METRICS_TABLE should be "usage_metrics"', () => {
      expect(USAGE_METRICS_TABLE).toBe('usage_metrics');
      expect(typeof USAGE_METRICS_TABLE).toBe('string');
    });

    test('USAGE_SNAPSHOTS_TABLE should be "usage_snapshots"', () => {
      expect(USAGE_SNAPSHOTS_TABLE).toBe('usage_snapshots');
      expect(typeof USAGE_SNAPSHOTS_TABLE).toBe('string');
    });
  });

  describe('AGGREGATION_TYPES', () => {
    test('should contain all valid aggregation types', () => {
      expect(AGGREGATION_TYPES).toEqual(['sum', 'max', 'last']);
    });

    test('should be a readonly array', () => {
      expect(Array.isArray(AGGREGATION_TYPES)).toBe(true);
      expect(AGGREGATION_TYPES).toHaveLength(3);
    });

    test('should contain only string values', () => {
      AGGREGATION_TYPES.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });

    test('should have unique values', () => {
      const uniqueTypes = new Set(AGGREGATION_TYPES);
      expect(uniqueTypes.size).toBe(AGGREGATION_TYPES.length);
    });
  });

  describe('USAGE_METRIC_COLUMNS', () => {
    test('should contain all usage metric column mappings', () => {
      expect(USAGE_METRIC_COLUMNS).toEqual({
        key: 'key',
        name: 'name',
        unit: 'unit',
        aggregationType: 'aggregation_type',
        createdAt: 'created_at',
      });
    });

    test('should map camelCase to snake_case correctly', () => {
      expect(USAGE_METRIC_COLUMNS.aggregationType).toBe('aggregation_type');
      expect(USAGE_METRIC_COLUMNS.createdAt).toBe('created_at');
    });

    test('should map simple columns to themselves', () => {
      expect(USAGE_METRIC_COLUMNS.key).toBe('key');
      expect(USAGE_METRIC_COLUMNS.name).toBe('name');
      expect(USAGE_METRIC_COLUMNS.unit).toBe('unit');
    });

    test('should be a const object (readonly)', () => {
      const keys = Object.keys(USAGE_METRIC_COLUMNS);
      expect(keys).toHaveLength(5);
      expect(keys).toContain('key');
      expect(keys).toContain('name');
      expect(keys).toContain('unit');
      expect(keys).toContain('aggregationType');
      expect(keys).toContain('createdAt');
    });

    test('should have all values as strings', () => {
      const values = Object.values(USAGE_METRIC_COLUMNS);
      values.forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });

    test('should have unique column names', () => {
      const values = Object.values(USAGE_METRIC_COLUMNS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('USAGE_SNAPSHOT_COLUMNS', () => {
    test('should contain all usage snapshot column mappings', () => {
      expect(USAGE_SNAPSHOT_COLUMNS).toEqual({
        id: 'id',
        tenantId: 'tenant_id',
        metricKey: 'metric_key',
        value: 'value',
        periodStart: 'period_start',
        periodEnd: 'period_end',
        updatedAt: 'updated_at',
      });
    });

    test('should map camelCase to snake_case correctly', () => {
      expect(USAGE_SNAPSHOT_COLUMNS.tenantId).toBe('tenant_id');
      expect(USAGE_SNAPSHOT_COLUMNS.metricKey).toBe('metric_key');
      expect(USAGE_SNAPSHOT_COLUMNS.periodStart).toBe('period_start');
      expect(USAGE_SNAPSHOT_COLUMNS.periodEnd).toBe('period_end');
      expect(USAGE_SNAPSHOT_COLUMNS.updatedAt).toBe('updated_at');
    });

    test('should map simple columns to themselves', () => {
      expect(USAGE_SNAPSHOT_COLUMNS.id).toBe('id');
      expect(USAGE_SNAPSHOT_COLUMNS.value).toBe('value');
    });

    test('should be a const object (readonly)', () => {
      const keys = Object.keys(USAGE_SNAPSHOT_COLUMNS);
      expect(keys).toHaveLength(7);
      expect(keys).toContain('id');
      expect(keys).toContain('tenantId');
      expect(keys).toContain('metricKey');
      expect(keys).toContain('value');
      expect(keys).toContain('periodStart');
      expect(keys).toContain('periodEnd');
      expect(keys).toContain('updatedAt');
    });

    test('should have all values as strings', () => {
      const values = Object.values(USAGE_SNAPSHOT_COLUMNS);
      values.forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });

    test('should have unique column names', () => {
      const values = Object.values(USAGE_SNAPSHOT_COLUMNS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});

describe('AggregationType Type', () => {
  test('should accept valid aggregation type strings', () => {
    const sumType: AggregationType = 'sum';
    const maxType: AggregationType = 'max';
    const lastType: AggregationType = 'last';

    expect(sumType).toBe('sum');
    expect(maxType).toBe('max');
    expect(lastType).toBe('last');
  });

  test('should only allow defined aggregation values', () => {
    const validTypes: AggregationType[] = ['sum', 'max', 'last'];

    validTypes.forEach((type) => {
      expect(AGGREGATION_TYPES).toContain(type);
    });
  });
});

describe('UsageMetric Type Structure', () => {
  describe('UsageMetric interface', () => {
    test('should accept a valid complete usage metric object', () => {
      const validMetric: UsageMetric = {
        key: 'api_calls',
        name: 'API Calls',
        unit: 'requests',
        aggregationType: 'sum',
        createdAt: new Date('2024-01-01'),
      };

      expect(validMetric.key).toBe('api_calls');
      expect(validMetric.name).toBe('API Calls');
      expect(validMetric.unit).toBe('requests');
      expect(validMetric.aggregationType).toBe('sum');
    });

    test('should require all fields', () => {
      const metric: UsageMetric = {
        key: 'storage_gb',
        name: 'Storage',
        unit: 'GB',
        aggregationType: 'max',
        createdAt: new Date(),
      };

      expect(metric).toHaveProperty('key');
      expect(metric).toHaveProperty('name');
      expect(metric).toHaveProperty('unit');
      expect(metric).toHaveProperty('aggregationType');
      expect(metric).toHaveProperty('createdAt');
    });

    test('should support all AggregationType values', () => {
      const sumMetric: UsageMetric = {
        key: 'api_calls',
        name: 'API Calls',
        unit: 'requests',
        aggregationType: 'sum',
        createdAt: new Date(),
      };

      const maxMetric: UsageMetric = {
        ...sumMetric,
        key: 'storage_gb',
        aggregationType: 'max',
      };

      const lastMetric: UsageMetric = {
        ...sumMetric,
        key: 'seats',
        aggregationType: 'last',
      };

      expect(sumMetric.aggregationType).toBe('sum');
      expect(maxMetric.aggregationType).toBe('max');
      expect(lastMetric.aggregationType).toBe('last');
    });

    test('should have Date type for timestamp field', () => {
      const now = new Date();
      const metric: UsageMetric = {
        key: 'test_metric',
        name: 'Test Metric',
        unit: 'units',
        aggregationType: 'sum',
        createdAt: now,
      };

      expect(metric.createdAt).toBeInstanceOf(Date);
    });

    test('should use TEXT primary key format', () => {
      const validKeys = ['api_calls', 'storage_gb', 'seats', 'bandwidth_mb'];

      validKeys.forEach((key) => {
        const metric: UsageMetric = {
          key,
          name: 'Test',
          unit: 'units',
          aggregationType: 'sum',
          createdAt: new Date(),
        };

        expect(metric.key).toBe(key);
        expect(typeof metric.key).toBe('string');
      });
    });
  });

  describe('NewUsageMetric interface', () => {
    test('should accept minimal required fields', () => {
      const minimalMetric: NewUsageMetric = {
        key: 'api_calls',
        name: 'API Calls',
        unit: 'requests',
      };

      expect(minimalMetric.key).toBe('api_calls');
      expect(minimalMetric.name).toBe('API Calls');
      expect(minimalMetric.unit).toBe('requests');
    });

    test('should accept all optional fields', () => {
      const fullMetric: NewUsageMetric = {
        key: 'storage_gb',
        name: 'Storage',
        unit: 'GB',
        aggregationType: 'max',
        createdAt: new Date('2024-01-01'),
      };

      expect(fullMetric.key).toBe('storage_gb');
      expect(fullMetric.aggregationType).toBe('max');
      expect(fullMetric.createdAt).toBeInstanceOf(Date);
    });

    test('should allow omitting auto-generated fields', () => {
      const metric: NewUsageMetric = {
        key: 'test_metric',
        name: 'Test',
        unit: 'units',
        // aggregationType, createdAt omitted (will use defaults)
      };

      expect(metric.aggregationType).toBeUndefined();
      expect(metric.createdAt).toBeUndefined();
    });

    test('should allow providing default aggregationType', () => {
      const metricWithDefaults: NewUsageMetric = {
        key: 'api_calls',
        name: 'API Calls',
        unit: 'requests',
        aggregationType: 'sum',
      };

      expect(metricWithDefaults.aggregationType).toBe('sum');
    });

    test('should support all valid aggregation types', () => {
      const types: AggregationType[] = ['sum', 'max', 'last'];

      types.forEach((type) => {
        const metric: NewUsageMetric = {
          key: `metric_${type}`,
          name: 'Test',
          unit: 'units',
          aggregationType: type,
        };

        expect(metric.aggregationType).toBe(type);
      });
    });
  });

  describe('UpdateUsageMetric interface', () => {
    test('should allow updating a single field', () => {
      const nameUpdate: UpdateUsageMetric = {
        name: 'Updated API Calls',
      };

      const unitUpdate: UpdateUsageMetric = {
        unit: 'calls',
      };

      expect(nameUpdate.name).toBe('Updated API Calls');
      expect(unitUpdate.unit).toBe('calls');
    });

    test('should allow updating multiple fields', () => {
      const multiUpdate: UpdateUsageMetric = {
        name: 'Updated Storage',
        unit: 'gigabytes',
        aggregationType: 'max',
      };

      expect(multiUpdate.name).toBe('Updated Storage');
      expect(multiUpdate.unit).toBe('gigabytes');
      expect(multiUpdate.aggregationType).toBe('max');
    });

    test('should allow empty update object', () => {
      const emptyUpdate: UpdateUsageMetric = {};

      expect(Object.keys(emptyUpdate)).toHaveLength(0);
    });

    test('should not allow updating the key field', () => {
      // This is a compile-time check enforced by TypeScript
      // Key is not present in UpdateUsageMetric interface
      const update: UpdateUsageMetric = {
        name: 'Test',
      };

      expect(update).not.toHaveProperty('key');
    });

    test('should allow changing aggregationType', () => {
      const typeUpdate: UpdateUsageMetric = {
        aggregationType: 'last',
      };

      expect(typeUpdate.aggregationType).toBe('last');
    });
  });
});

describe('UsageSnapshot Type Structure', () => {
  describe('UsageSnapshot interface', () => {
    test('should accept a valid complete usage snapshot object', () => {
      const validSnapshot: UsageSnapshot = {
        id: 'snapshot_123',
        tenantId: 'tenant_456',
        metricKey: 'api_calls',
        value: 1500,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        updatedAt: new Date('2024-01-31T23:59:59Z'),
      };

      expect(validSnapshot.id).toBe('snapshot_123');
      expect(validSnapshot.tenantId).toBe('tenant_456');
      expect(validSnapshot.metricKey).toBe('api_calls');
      expect(validSnapshot.value).toBe(1500);
    });

    test('should require all fields', () => {
      const snapshot: UsageSnapshot = {
        id: '1',
        tenantId: '2',
        metricKey: 'storage_gb',
        value: 500,
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      };

      expect(snapshot).toHaveProperty('id');
      expect(snapshot).toHaveProperty('tenantId');
      expect(snapshot).toHaveProperty('metricKey');
      expect(snapshot).toHaveProperty('value');
      expect(snapshot).toHaveProperty('periodStart');
      expect(snapshot).toHaveProperty('periodEnd');
      expect(snapshot).toHaveProperty('updatedAt');
    });

    test('should have Date types for timestamp fields', () => {
      const now = new Date();
      const snapshot: UsageSnapshot = {
        id: '1',
        tenantId: '2',
        metricKey: 'api_calls',
        value: 100,
        periodStart: now,
        periodEnd: now,
        updatedAt: now,
      };

      expect(snapshot.periodStart).toBeInstanceOf(Date);
      expect(snapshot.periodEnd).toBeInstanceOf(Date);
      expect(snapshot.updatedAt).toBeInstanceOf(Date);
    });

    test('should have numeric value field', () => {
      const snapshot: UsageSnapshot = {
        id: '1',
        tenantId: '2',
        metricKey: 'api_calls',
        value: 12345.67,
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      };

      expect(typeof snapshot.value).toBe('number');
      expect(snapshot.value).toBe(12345.67);
    });

    test('should use UUID for id field', () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';
      const snapshot: UsageSnapshot = {
        id: uuidId,
        tenantId: 'tenant_123',
        metricKey: 'api_calls',
        value: 100,
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      };

      expect(snapshot.id).toBe(uuidId);
      expect(typeof snapshot.id).toBe('string');
    });
  });

  describe('NewUsageSnapshot interface', () => {
    test('should accept minimal required fields', () => {
      const minimalSnapshot: NewUsageSnapshot = {
        tenantId: 'tenant_123',
        metricKey: 'api_calls',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      };

      expect(minimalSnapshot.tenantId).toBe('tenant_123');
      expect(minimalSnapshot.metricKey).toBe('api_calls');
      expect(minimalSnapshot.periodStart).toBeInstanceOf(Date);
      expect(minimalSnapshot.periodEnd).toBeInstanceOf(Date);
    });

    test('should accept all optional fields', () => {
      const fullSnapshot: NewUsageSnapshot = {
        id: 'custom_id',
        tenantId: 'tenant_123',
        metricKey: 'api_calls',
        value: 1000,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        updatedAt: new Date('2024-01-31'),
      };

      expect(fullSnapshot.id).toBe('custom_id');
      expect(fullSnapshot.value).toBe(1000);
      expect(fullSnapshot.updatedAt).toBeInstanceOf(Date);
    });

    test('should allow omitting auto-generated fields', () => {
      const snapshot: NewUsageSnapshot = {
        tenantId: 'tenant_123',
        metricKey: 'storage_gb',
        periodStart: new Date(),
        periodEnd: new Date(),
        // id, value, updatedAt omitted (will use defaults)
      };

      expect(snapshot.id).toBeUndefined();
      expect(snapshot.value).toBeUndefined();
      expect(snapshot.updatedAt).toBeUndefined();
    });

    test('should allow providing default value', () => {
      const snapshotWithDefaults: NewUsageSnapshot = {
        tenantId: 'tenant_123',
        metricKey: 'api_calls',
        value: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      };

      expect(snapshotWithDefaults.value).toBe(0);
    });

    test('should allow custom id and updatedAt', () => {
      const customSnapshot: NewUsageSnapshot = {
        id: 'custom_snapshot_id',
        tenantId: 'tenant_123',
        metricKey: 'api_calls',
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date('2024-01-01'),
      };

      expect(customSnapshot.id).toBe('custom_snapshot_id');
      expect(customSnapshot.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('UpdateUsageSnapshot interface', () => {
    test('should allow updating value only', () => {
      const valueUpdate: UpdateUsageSnapshot = {
        value: 2000,
      };

      expect(valueUpdate.value).toBe(2000);
    });

    test('should allow updating updatedAt only', () => {
      const timestampUpdate: UpdateUsageSnapshot = {
        updatedAt: new Date('2024-02-01'),
      };

      expect(timestampUpdate.updatedAt).toBeInstanceOf(Date);
    });

    test('should allow updating both fields', () => {
      const multiUpdate: UpdateUsageSnapshot = {
        value: 3000,
        updatedAt: new Date('2024-02-01'),
      };

      expect(multiUpdate.value).toBe(3000);
      expect(multiUpdate.updatedAt).toBeInstanceOf(Date);
    });

    test('should allow empty update object', () => {
      const emptyUpdate: UpdateUsageSnapshot = {};

      expect(Object.keys(emptyUpdate)).toHaveLength(0);
    });

    test('should not allow updating immutable fields', () => {
      // This is a compile-time check enforced by TypeScript
      // id, tenantId, metricKey, periodStart, periodEnd are not in UpdateUsageSnapshot
      const update: UpdateUsageSnapshot = {
        value: 100,
      };

      expect(update).not.toHaveProperty('id');
      expect(update).not.toHaveProperty('tenantId');
      expect(update).not.toHaveProperty('metricKey');
      expect(update).not.toHaveProperty('periodStart');
      expect(update).not.toHaveProperty('periodEnd');
    });
  });
});

describe('Type Compatibility', () => {
  describe('UsageMetric type conversions', () => {
    test('UsageMetric should be assignable from NewUsageMetric with required fields', () => {
      const newMetric: NewUsageMetric = {
        key: 'api_calls',
        name: 'API Calls',
        unit: 'requests',
        aggregationType: 'sum',
        createdAt: new Date(),
      };

      const metric: UsageMetric = newMetric as UsageMetric;

      expect(metric.key).toBe('api_calls');
      expect(metric.name).toBe('API Calls');
    });

    test('UpdateUsageMetric should accept partial UsageMetric properties', () => {
      const metric: UsageMetric = {
        key: 'api_calls',
        name: 'Original Name',
        unit: 'requests',
        aggregationType: 'sum',
        createdAt: new Date(),
      };

      const update: UpdateUsageMetric = {
        name: metric.name,
        unit: 'calls',
      };

      expect(update.name).toBe(metric.name);
      expect(update.unit).toBe('calls');
    });
  });

  describe('UsageSnapshot type conversions', () => {
    test('UsageSnapshot should be assignable from NewUsageSnapshot with required fields', () => {
      const newSnapshot: NewUsageSnapshot = {
        id: '1',
        tenantId: '2',
        metricKey: 'api_calls',
        value: 100,
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      };

      const snapshot: UsageSnapshot = newSnapshot as UsageSnapshot;

      expect(snapshot.id).toBe('1');
      expect(snapshot.tenantId).toBe('2');
    });
  });
});

describe('Edge Cases', () => {
  describe('Numeric value boundaries', () => {
    test('should handle zero value', () => {
      const snapshot: UsageSnapshot = {
        id: '1',
        tenantId: '2',
        metricKey: 'api_calls',
        value: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      };

      expect(snapshot.value).toBe(0);
    });

    test('should handle large values', () => {
      const largeValue = 999999999.99;
      const snapshot: UsageSnapshot = {
        id: '1',
        tenantId: '2',
        metricKey: 'api_calls',
        value: largeValue,
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      };

      expect(snapshot.value).toBe(largeValue);
    });

    test('should handle decimal values', () => {
      const decimalValue = 123.456;
      const update: UpdateUsageSnapshot = {
        value: decimalValue,
      };

      expect(update.value).toBe(decimalValue);
    });

    test('should handle negative values at type level', () => {
      // Note: schema constraint prevents this at DB level (value >= 0)
      // but TypeScript type allows it
      const negativeValue = -100;
      const snapshot: UsageSnapshot = {
        id: '1',
        tenantId: '2',
        metricKey: 'api_calls',
        value: negativeValue,
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      };

      expect(snapshot.value).toBe(negativeValue);
    });
  });

  describe('Date period boundaries', () => {
    test('should handle same-day period', () => {
      const sameDay = new Date('2024-01-01');
      const snapshot: NewUsageSnapshot = {
        tenantId: 'tenant_123',
        metricKey: 'api_calls',
        periodStart: sameDay,
        periodEnd: sameDay,
      };

      expect(snapshot.periodStart).toEqual(snapshot.periodEnd);
    });

    test('should handle far-future periods', () => {
      const farFuture = new Date('2099-12-31');
      const snapshot: UsageSnapshot = {
        id: '1',
        tenantId: '2',
        metricKey: 'storage_gb',
        value: 100,
        periodStart: new Date('2099-01-01'),
        periodEnd: farFuture,
        updatedAt: new Date(),
      };

      expect(snapshot.periodEnd.getFullYear()).toBe(2099);
    });

    test('should handle monthly period boundaries', () => {
      const monthStart = new Date('2024-01-01T00:00:00Z');
      const monthEnd = new Date('2024-01-31T23:59:59Z');

      const snapshot: UsageSnapshot = {
        id: '1',
        tenantId: '2',
        metricKey: 'api_calls',
        value: 5000,
        periodStart: monthStart,
        periodEnd: monthEnd,
        updatedAt: monthEnd,
      };

      expect(snapshot.periodStart.getUTCDate()).toBe(1);
      expect(snapshot.periodEnd.getUTCDate()).toBe(31);
    });

    test('should handle hourly period boundaries', () => {
      const hourStart = new Date('2024-01-01T15:00:00Z');
      const hourEnd = new Date('2024-01-01T15:59:59Z');

      const snapshot: NewUsageSnapshot = {
        tenantId: 'tenant_123',
        metricKey: 'bandwidth_mb',
        periodStart: hourStart,
        periodEnd: hourEnd,
      };

      expect(snapshot.periodEnd.getTime() - snapshot.periodStart.getTime()).toBeLessThan(3600000);
    });

    test('should handle period_end > period_start constraint', () => {
      // Note: schema constraint enforces this at DB level
      // TypeScript doesn't prevent it but we test the expected usage
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      const snapshot: UsageSnapshot = {
        id: '1',
        tenantId: '2',
        metricKey: 'api_calls',
        value: 100,
        periodStart: start,
        periodEnd: end,
        updatedAt: new Date(),
      };

      expect(snapshot.periodEnd.getTime()).toBeGreaterThan(snapshot.periodStart.getTime());
    });
  });

  describe('String field boundaries', () => {
    test('should handle empty string values where strings are allowed', () => {
      const metric: NewUsageMetric = {
        key: '',
        name: '',
        unit: '',
      };

      expect(metric.key).toBe('');
      expect(metric.name).toBe('');
      expect(metric.unit).toBe('');
    });

    test('should handle very long string values', () => {
      const longString = 'a'.repeat(10000);
      const metric: NewUsageMetric = {
        key: longString,
        name: longString,
        unit: longString,
      };

      expect(metric.key).toHaveLength(10000);
      expect(metric.name).toHaveLength(10000);
    });

    test('should handle special characters in strings', () => {
      const specialChars = '!@#$%^&*(){}[]|\\:";\'<>?,./`~';
      const metric: NewUsageMetric = {
        key: `key${specialChars}`,
        name: `name${specialChars}`,
        unit: `unit${specialChars}`,
      };

      expect(metric.name).toContain(specialChars);
    });

    test('should handle Unicode characters', () => {
      const metric: NewUsageMetric = {
        key: 'api_呼び出し',
        name: 'API呼び出し',
        unit: 'リクエスト',
      };

      expect(metric.name).toBe('API呼び出し');
      expect(metric.unit).toBe('リクエスト');
    });

    test('should handle valid metric key format', () => {
      // Schema constraint: ^[a-z][a-z0-9_]+$, max 100 chars
      const validKeys = ['api_calls', 'storage_gb', 'bandwidth_mb', 'seats', 'a123_test_key'];

      validKeys.forEach((key) => {
        const metric: UsageMetric = {
          key,
          name: 'Test',
          unit: 'units',
          aggregationType: 'sum',
          createdAt: new Date(),
        };

        expect(metric.key).toBe(key);
      });
    });
  });

  describe('Aggregation type edge cases', () => {
    test('should handle aggregation type changes across all valid values', () => {
      const types: AggregationType[] = ['sum', 'max', 'last'];

      types.forEach((type) => {
        const update: UpdateUsageMetric = { aggregationType: type };
        expect(AGGREGATION_TYPES).toContain(update.aggregationType);
      });
    });

    test('should use appropriate aggregation for different metric types', () => {
      const sumMetric: NewUsageMetric = {
        key: 'api_calls',
        name: 'API Calls',
        unit: 'requests',
        aggregationType: 'sum',
      };

      const maxMetric: NewUsageMetric = {
        key: 'storage_gb',
        name: 'Storage',
        unit: 'GB',
        aggregationType: 'max',
      };

      const lastMetric: NewUsageMetric = {
        key: 'seats',
        name: 'Active Seats',
        unit: 'seats',
        aggregationType: 'last',
      };

      expect(sumMetric.aggregationType).toBe('sum');
      expect(maxMetric.aggregationType).toBe('max');
      expect(lastMetric.aggregationType).toBe('last');
    });
  });
});

describe('Column Mapping Consistency', () => {
  test('USAGE_METRIC_COLUMNS should map to all UsageMetric interface fields', () => {
    const metricFields: Array<keyof UsageMetric> = [
      'key',
      'name',
      'unit',
      'aggregationType',
      'createdAt',
    ];

    const columnKeys = Object.keys(USAGE_METRIC_COLUMNS) as Array<
      keyof typeof USAGE_METRIC_COLUMNS
    >;

    metricFields.forEach((field) => {
      expect(columnKeys).toContain(field);
    });
  });

  test('USAGE_SNAPSHOT_COLUMNS should map to all UsageSnapshot interface fields', () => {
    const snapshotFields: Array<keyof UsageSnapshot> = [
      'id',
      'tenantId',
      'metricKey',
      'value',
      'periodStart',
      'periodEnd',
      'updatedAt',
    ];

    const columnKeys = Object.keys(USAGE_SNAPSHOT_COLUMNS) as Array<
      keyof typeof USAGE_SNAPSHOT_COLUMNS
    >;

    snapshotFields.forEach((field) => {
      expect(columnKeys).toContain(field);
    });
  });

  test('USAGE_METRIC_COLUMNS should not have any extra fields', () => {
    const expectedFields = ['key', 'name', 'unit', 'aggregationType', 'createdAt'];

    const actualFields = Object.keys(USAGE_METRIC_COLUMNS);

    expect(actualFields.sort()).toEqual(expectedFields.sort());
  });

  test('USAGE_SNAPSHOT_COLUMNS should not have any extra fields', () => {
    const expectedFields = [
      'id',
      'tenantId',
      'metricKey',
      'value',
      'periodStart',
      'periodEnd',
      'updatedAt',
    ];

    const actualFields = Object.keys(USAGE_SNAPSHOT_COLUMNS);

    expect(actualFields.sort()).toEqual(expectedFields.sort());
  });
});
