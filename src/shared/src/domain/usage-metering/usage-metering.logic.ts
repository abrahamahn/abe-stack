// packages/shared/src/domain/usage-metering/usage-metering.logic.ts
/**
 * @file Usage Metering Logic
 * @description Pure functions for aggregating usage events and checking limits.
 * @module Domain/UsageMetering
 */

import type { UsageSnapshot } from './usage-metering.schemas';

// ============================================================================
// Aggregation
// ============================================================================

export type AggregationType = 'sum' | 'max' | 'last';

/**
 * Aggregates a series of values based on the specied aggregation type.
 *
 * @param values - Array of numeric values to aggregate
 * @param type - The aggregation strategy ('sum', 'max', 'last')
 * @returns number - The aggregated value
 */
export function aggregateValues(values: number[], type: AggregationType): number {
  if (values.length === 0) return 0;

  switch (type) {
    case 'sum':
      return values.reduce((acc, val) => acc + val, 0);
    case 'max':
      return Math.max(...values);
    case 'last':
      return values[values.length - 1] ?? 0;
    default:
      return 0;
  }
}

/**
 * Convenience helper to aggregate from snapshots.
 */
export function aggregateSnapshots(snapshots: UsageSnapshot[], type: AggregationType): number {
  return aggregateValues(
    snapshots.map((s) => s.value),
    type,
  );
}

// ============================================================================
// Quota Logic
// ============================================================================

/**
 * Checks if current usage has exceeded a given limit.
 *
 * @param currentUsage - Calculated usage value
 * @param limit - The limit to check against (Infinity for unlimited)
 * @returns boolean
 */
export function isOverQuota(currentUsage: number, limit: number): boolean {
  if (limit === Infinity || limit === -1) return false;
  return currentUsage >= limit;
}
