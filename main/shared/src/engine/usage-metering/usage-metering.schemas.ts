// main/shared/src/engine/usage-metering/usage-metering.schemas.ts

/**
 * @file Usage Metering Contracts
 * @description Types for tracking resource usage (metrics, snapshots) for billing.
 * @module Domain/UsageMetering
 */

import { createEnumSchema, createSchema, parseNumber, parseString } from '../../primitives/schema';
import { isoDateTimeSchema } from '../../primitives/schema';
import { tenantIdSchema } from '../../primitives/schema/ids';

import type { Schema } from '../../primitives/api';
import type { TenantId } from '../../primitives/schema/ids';

// ============================================================================
// Types
// ============================================================================

/** Aggregation strategies for usage metrics */
const AGGREGATION_TYPES = ['sum', 'max', 'last'] as const;

/** Definition of a trackable usage metric */
export interface UsageMetric {
  key: string;
  name: string;
  unit: string;
  aggregationType: (typeof AGGREGATION_TYPES)[number];
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
