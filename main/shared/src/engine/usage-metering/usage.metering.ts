// main/shared/src/engine/usage-metering/usage.metering.ts

/**
 * @file Usage Metering
 * @description Types, schemas, and pure functions for tracking resource usage
 * (metrics, snapshots) and checking quota limits for billing.
 * @module Domain/UsageMetering
 */

import { createEnumSchema, createSchema, parseNumber, parseString, isoDateTimeSchema  } from '../../primitives/schema';
import { tenantIdSchema } from '../../primitives/schema/ids';

import type { Schema } from '../../primitives/api';
import type { TenantId } from '../../primitives/schema/ids';

// ============================================================================
// Types
// ============================================================================

/** Aggregation strategies for usage metrics */
export type AggregationType = 'sum' | 'max' | 'last';

/** Definition of a trackable usage metric */
export interface UsageMetric {
  key: string;
  name: string;
  unit: string;
  aggregationType: AggregationType;
}

/** A snapshot of usage for a specific tenant and metric for a time period */
export interface UsageSnapshot {
  id: string;
  tenantId: TenantId;
  metricKey: string;
  value: number;
  periodStart: string;
  periodEnd: string;
  updatedAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const AGGREGATION_TYPES = ['sum', 'max', 'last'] as const;

// ============================================================================
// Schemas
// ============================================================================

/** Aggregation type enum schema */
const aggregationTypeSchema = createEnumSchema(AGGREGATION_TYPES, 'aggregation type');

/**
 * Definition of a trackable usage metric.
 */
export const usageMetricSchema: Schema<UsageMetric> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    key: parseString(obj['key'], 'key'),
    name: parseString(obj['name'], 'name'),
    unit: parseString(obj['unit'], 'unit'),
    aggregationType: aggregationTypeSchema.parse(obj['aggregationType']),
  };
});

/**
 * A snapshot of usage for a specific tenant and metric for a time period.
 */
export const usageSnapshotSchema: Schema<UsageSnapshot> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: parseString(obj['id'], 'id'),
    tenantId: tenantIdSchema.parse(obj['tenantId']),
    metricKey: parseString(obj['metricKey'], 'metricKey'),
    value: parseNumber(obj['value'], 'value'),
    periodStart: isoDateTimeSchema.parse(obj['periodStart']),
    periodEnd: isoDateTimeSchema.parse(obj['periodEnd']),
    updatedAt: isoDateTimeSchema.parse(obj['updatedAt']),
  };
});

// ============================================================================
// Response Schemas
// ============================================================================

/** Summary of a single metric's usage against its quota */
export interface UsageMetricSummary {
  metricKey: string;
  name: string;
  unit: string;
  currentValue: number;
  limit: number;
  percentUsed: number;
}

/** Response for the usage summary endpoint */
export interface UsageSummaryResponse {
  metrics: UsageMetricSummary[];
  periodStart: string;
  periodEnd: string;
}

export const usageMetricSummarySchema: Schema<UsageMetricSummary> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      metricKey: parseString(obj['metricKey'], 'metricKey'),
      name: parseString(obj['name'], 'name'),
      unit: parseString(obj['unit'], 'unit'),
      currentValue: parseNumber(obj['currentValue'], 'currentValue'),
      limit: parseNumber(obj['limit'], 'limit'),
      percentUsed: parseNumber(obj['percentUsed'], 'percentUsed'),
    };
  },
);

export const usageSummaryResponseSchema: Schema<UsageSummaryResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    if (!Array.isArray(obj['metrics'])) throw new Error('metrics must be an array');

    return {
      metrics: obj['metrics'].map((item) => usageMetricSummarySchema.parse(item)),
      periodStart: isoDateTimeSchema.parse(obj['periodStart']),
      periodEnd: isoDateTimeSchema.parse(obj['periodEnd']),
    };
  },
);

// ============================================================================
// Functions
// ============================================================================

/**
 * Aggregates a series of values based on the specified aggregation type.
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
    case 'max': {
      // Iterative loop avoids stack overflow from Math.max(...largeArray)
      // which spreads into function arguments and hits call stack limits (~65K+).
      let max = values[0] ?? 0;
      for (let i = 1; i < values.length; i++) {
        const v = values[i];
        if (v !== undefined && v > max) max = v;
      }
      return max;
    }
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
