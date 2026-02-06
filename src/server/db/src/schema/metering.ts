// backend/db/src/schema/metering.ts
/**
 * Usage Metering Schema Types
 *
 * TypeScript interfaces for usage_metrics and usage_snapshots tables.
 * Maps to migration 0007_metering.sql.
 */

// ============================================================================
// Enums
// ============================================================================

/** How metric values are aggregated over compounding periods */
export type AggregationType = 'sum' | 'max' | 'last';

/** All valid aggregation types */
export const AGGREGATION_TYPES = ['sum', 'max', 'last'] as const;

// ============================================================================
// Table Names
// ============================================================================

export const USAGE_METRICS_TABLE = 'usage_metrics';
export const USAGE_SNAPSHOTS_TABLE = 'usage_snapshots';

// ============================================================================
// Usage Metric Types
// ============================================================================

/**
 * Metric definition record (SELECT result).
 * Uses TEXT primary key (e.g., "api_calls", "storage_gb", "seats").
 *
 * @see 0007_metering.sql — key format: `^[a-z][a-z0-9_]+$`, max 100 chars
 */
export interface UsageMetric {
  key: string;
  name: string;
  unit: string;
  aggregationType: AggregationType;
  createdAt: Date;
}

/**
 * Fields for inserting a new usage metric.
 */
export interface NewUsageMetric {
  key: string;
  name: string;
  unit: string;
  aggregationType?: AggregationType;
  createdAt?: Date;
}

/**
 * Fields for updating an existing usage metric.
 * Key is the primary key and cannot be changed.
 */
export interface UpdateUsageMetric {
  name?: string;
  unit?: string;
  aggregationType?: AggregationType;
}

// ============================================================================
// Usage Snapshot Types
// ============================================================================

/**
 * Recorded usage data per tenant per period (SELECT result).
 *
 * @see 0007_metering.sql — UNIQUE(tenant_id, metric_key, period_start),
 *   value >= 0, period_end > period_start
 */
export interface UsageSnapshot {
  id: string;
  tenantId: string;
  metricKey: string;
  value: number;
  periodStart: Date;
  periodEnd: Date;
  updatedAt: Date;
}

/**
 * Fields for inserting a new usage snapshot.
 */
export interface NewUsageSnapshot {
  id?: string;
  tenantId: string;
  metricKey: string;
  value?: number;
  periodStart: Date;
  periodEnd: Date;
  updatedAt?: Date;
}

/**
 * Fields for updating an existing usage snapshot.
 * Only the value and updatedAt change; the unique constraint fields are immutable.
 */
export interface UpdateUsageSnapshot {
  value?: number;
  updatedAt?: Date;
}

// ============================================================================
// Column Name Mappings (camelCase TS → snake_case SQL)
// ============================================================================

export const USAGE_METRIC_COLUMNS = {
  key: 'key',
  name: 'name',
  unit: 'unit',
  aggregationType: 'aggregation_type',
  createdAt: 'created_at',
} as const;

export const USAGE_SNAPSHOT_COLUMNS = {
  id: 'id',
  tenantId: 'tenant_id',
  metricKey: 'metric_key',
  value: 'value',
  periodStart: 'period_start',
  periodEnd: 'period_end',
  updatedAt: 'updated_at',
} as const;
