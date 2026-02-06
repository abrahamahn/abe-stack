// packages/shared/src/domain/usage-metering/usage-metering.logic.test.ts
import { describe, expect, it } from 'vitest';

import { aggregateSnapshots, aggregateValues, isOverQuota } from './usage-metering.logic';

import type { UsageSnapshot } from './usage-metering.schemas';

describe('usage-metering.logic', () => {
  // ==========================================================================
  // aggregateValues
  // ==========================================================================
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

  // ==========================================================================
  // aggregateSnapshots
  // ==========================================================================
  describe('aggregateSnapshots', () => {
    it('aggregates snapshot values', () => {
      const snapshots: UsageSnapshot[] = [
        {
          tenantId: 'tenant-1' as UsageSnapshot['tenantId'],
          metricKey: 'api_calls',
          value: 100,
          periodStart: '2023-01-01T00:00:00Z',
          periodEnd: '2023-01-31T23:59:59Z',
          updatedAt: '2023-01-15T12:00:00Z',
        },
        {
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

  // ==========================================================================
  // isOverQuota
  // ==========================================================================
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
});
