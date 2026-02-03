// shared/src/domain/usage-metering/usage-metering.schemas.ts

/**
 * @file Usage Metering Contracts
 * @description Types for tracking resource usage (metrics, snapshots) for billing.
 * @module Domain/UsageMetering
 */

import { z } from 'zod';

import { isoDateTimeSchema } from '../../core/schemas';
import { tenantIdSchema } from '../../types/ids';

// ============================================================================
// Schemas
// ============================================================================

/**
 * Definition of a trackable usage metric.
 */
export const usageMetricSchema = z.object({
  key: z.string().describe('Unique identifier e.g. "api_calls"'),
  name: z.string(),
  unit: z.string().describe('Unit of measurement e.g. "gb", "tokens"'),
  aggregationType: z
    .enum(['sum', 'max', 'last'])
    .describe('How values are aggregated over compouding periods'),
});
export type UsageMetric = z.infer<typeof usageMetricSchema>;

/**
 * A snapshot of usage for a specific tenant and metric for a time period.
 */
export const usageSnapshotSchema = z.object({
  tenantId: tenantIdSchema,
  metricKey: z.string(),
  value: z.number(),
  periodStart: isoDateTimeSchema,
  periodEnd: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type UsageSnapshot = z.infer<typeof usageSnapshotSchema>;
