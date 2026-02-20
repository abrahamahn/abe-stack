// main/server/core/src/billing/usage-metering.ts
/**
 * Usage Metering Service
 *
 * Pure business logic for tracking and querying resource usage.
 * Provides atomic increment, period-based aggregation, snapshot
 * creation, and entitlement limit enforcement.
 *
 * All functions accept repositories as explicit parameters
 * for testability and decoupled architecture.
 *
 * @module billing/usage-metering
 */

import { aggregateSnapshots, isOverQuota } from '@bslt/shared';

import type {
  UsageMetricRepository,
  UsageSnapshotRepository,
  UsageSnapshot,
} from '../../../db/src';

// ============================================================================
// Types
// ============================================================================

/** Summary of a single metric's current usage against its quota */
export interface MetricUsageSummary {
  readonly metricKey: string;
  readonly name: string;
  readonly unit: string;
  readonly currentValue: number;
  readonly limit: number;
  readonly percentUsed: number;
}

/** Full usage summary response for a tenant */
export interface TenantUsageSummary {
  readonly metrics: MetricUsageSummary[];
  readonly periodStart: string;
  readonly periodEnd: string;
}

/** Repositories needed by the usage metering service */
export interface UsageMeteringRepositories {
  readonly usageMetrics: UsageMetricRepository;
  readonly usageSnapshots: UsageSnapshotRepository;
}

/** Options for recording usage */
export interface RecordUsageOptions {
  /** The metric key (e.g., "api_calls", "storage_gb") */
  readonly metricKey: string;
  /** The tenant to record usage for */
  readonly tenantId: string;
  /** The delta to add (positive for increment, negative for decrement) */
  readonly delta: number;
  /** Period start (defaults to current billing period start) */
  readonly periodStart?: Date;
  /** Period end (defaults to current billing period end) */
  readonly periodEnd?: Date;
}

/** Limit configuration for a metric (typically from plan features) */
export interface MetricLimit {
  readonly metricKey: string;
  readonly limit: number;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get the start of the current monthly billing period.
 * Uses the first day of the current month in UTC.
 *
 * @returns Date set to the first millisecond of the current month
 * @complexity O(1)
 */
function getCurrentPeriodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Get the end of the current monthly billing period.
 * Uses the first day of the next month in UTC.
 *
 * @returns Date set to the first millisecond of the next month
 * @complexity O(1)
 */
function getCurrentPeriodEnd(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * Calculate percentage used, capped at 100.
 *
 * @param current - Current usage value
 * @param limit - Maximum allowed value (-1 = unlimited)
 * @returns Percentage used (0-100), or 0 if unlimited
 * @complexity O(1)
 */
function calculatePercentUsed(current: number, limit: number): number {
  if (limit <= 0 || limit === Infinity) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

// ============================================================================
// Record Usage
// ============================================================================

/**
 * Record (increment) usage for a tenant on a specific metric.
 *
 * Creates or updates the usage snapshot for the current billing period
 * using an atomic upsert. The delta is added to the existing value
 * for 'sum' aggregation metrics, or replaces it for 'max'/'last'.
 *
 * @param repos - Usage metering repositories
 * @param options - Recording options (metricKey, tenantId, delta)
 * @returns The updated usage snapshot
 * @throws Error if the metric key does not exist
 * @complexity O(1) - single upsert operation
 */
export async function recordUsage(
  repos: UsageMeteringRepositories,
  options: RecordUsageOptions,
): Promise<UsageSnapshot> {
  const { metricKey, tenantId, delta } = options;
  const periodStart = options.periodStart ?? getCurrentPeriodStart();
  const periodEnd = options.periodEnd ?? getCurrentPeriodEnd();

  // Validate the metric exists
  const metric = await repos.usageMetrics.findByKey(metricKey);
  if (metric === null) {
    throw new Error(`Usage metric not found: ${metricKey}`);
  }

  // Check for existing snapshot in this period
  const existing = await repos.usageSnapshots.findByTenantAndMetric(tenantId, metricKey, 1);
  const currentSnapshot =
    existing.length > 0 && existing[0] !== undefined
      ? isSnapshotInPeriod(existing[0], periodStart, periodEnd)
        ? existing[0]
        : null
      : null;

  // Calculate new value based on aggregation type
  let newValue: number;
  if (currentSnapshot !== null) {
    switch (metric.aggregationType) {
      case 'sum':
        newValue = Math.max(0, currentSnapshot.value + delta);
        break;
      case 'max':
        newValue = Math.max(currentSnapshot.value, delta);
        break;
      case 'last':
        newValue = delta;
        break;
      default:
        newValue = Math.max(0, currentSnapshot.value + delta);
    }
  } else {
    newValue = Math.max(0, delta);
  }

  // Upsert the snapshot
  return repos.usageSnapshots.upsert({
    tenantId,
    metricKey,
    value: newValue,
    periodStart,
    periodEnd,
    updatedAt: new Date(),
  });
}

/**
 * Check if a snapshot falls within a given billing period.
 *
 * @param snapshot - The snapshot to check
 * @param periodStart - Period start date
 * @param periodEnd - Period end date
 * @returns True if snapshot is within the period
 * @complexity O(1)
 */
function isSnapshotInPeriod(snapshot: UsageSnapshot, periodStart: Date, periodEnd: Date): boolean {
  const snapshotStart =
    snapshot.periodStart instanceof Date
      ? snapshot.periodStart
      : new Date(snapshot.periodStart as unknown as string);
  const snapshotEnd =
    snapshot.periodEnd instanceof Date
      ? snapshot.periodEnd
      : new Date(snapshot.periodEnd as unknown as string);

  return (
    snapshotStart.getTime() === periodStart.getTime() &&
    snapshotEnd.getTime() === periodEnd.getTime()
  );
}

// ============================================================================
// Query Usage
// ============================================================================

/**
 * Get current usage for a specific metric and tenant in the current period.
 *
 * Fetches the most recent snapshot for the metric/tenant combination
 * and returns the aggregated value. Returns 0 if no usage is recorded.
 *
 * @param repos - Usage metering repositories
 * @param metricKey - The metric key to query
 * @param tenantId - The tenant to query for
 * @param periodStart - Optional period start (defaults to current)
 * @param periodEnd - Optional period end (defaults to current)
 * @returns The current usage value for the metric
 * @complexity O(1) - single database query
 */
export async function getUsage(
  repos: UsageMeteringRepositories,
  metricKey: string,
  tenantId: string,
  periodStart?: Date,
  periodEnd?: Date,
): Promise<number> {
  const start = periodStart ?? getCurrentPeriodStart();
  const end = periodEnd ?? getCurrentPeriodEnd();

  // Retrieve the metric to get its aggregation type
  const metric = await repos.usageMetrics.findByKey(metricKey);
  if (metric === null) {
    return 0;
  }

  const snapshots = await repos.usageSnapshots.findByTenantAndMetric(tenantId, metricKey, 100);

  // Filter to current period
  const periodSnapshots = snapshots.filter((s) => isSnapshotInPeriod(s, start, end));

  if (periodSnapshots.length === 0) return 0;

  return aggregateSnapshots(
    periodSnapshots.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      metricKey: s.metricKey,
      value: s.value,
      periodStart:
        s.periodStart instanceof Date ? s.periodStart.toISOString() : String(s.periodStart),
      periodEnd: s.periodEnd instanceof Date ? s.periodEnd.toISOString() : String(s.periodEnd),
      updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
    })),
    metric.aggregationType,
  );
}

// ============================================================================
// Usage Summary
// ============================================================================

/**
 * Get a full usage summary for a tenant across all defined metrics.
 *
 * Fetches all metric definitions, then for each metric retrieves
 * the current period snapshot. Returns a summary including the
 * current value, limit, and percentage used.
 *
 * @param repos - Usage metering repositories
 * @param tenantId - The tenant to summarize usage for
 * @param limits - Array of metric limits (from plan features)
 * @returns Full usage summary with all metrics
 * @complexity O(n) where n is the number of defined metrics
 */
export async function getUsageSummary(
  repos: UsageMeteringRepositories,
  tenantId: string,
  limits: MetricLimit[],
): Promise<TenantUsageSummary> {
  const periodStart = getCurrentPeriodStart();
  const periodEnd = getCurrentPeriodEnd();

  // Get all metric definitions
  const metrics = await repos.usageMetrics.findAll();

  // Build limit lookup
  const limitMap = new Map<string, number>();
  for (const l of limits) {
    limitMap.set(l.metricKey, l.limit);
  }

  // Get snapshots for tenant in current period
  const allSnapshots = await repos.usageSnapshots.findByTenantId(tenantId, 500);
  const periodSnapshots = allSnapshots.filter((s) => isSnapshotInPeriod(s, periodStart, periodEnd));

  // Build snapshot lookup by metric key
  const snapshotMap = new Map<string, UsageSnapshot>();
  for (const s of periodSnapshots) {
    // Keep the most recent for each metric
    if (!snapshotMap.has(s.metricKey)) {
      snapshotMap.set(s.metricKey, s);
    }
  }

  // Build summary
  const summaryMetrics: MetricUsageSummary[] = metrics.map((metric) => {
    const snapshot = snapshotMap.get(metric.key);
    const currentValue = snapshot?.value ?? 0;
    const limit = limitMap.get(metric.key) ?? -1;
    const percentUsed = calculatePercentUsed(currentValue, limit);

    return {
      metricKey: metric.key,
      name: metric.name,
      unit: metric.unit,
      currentValue,
      limit,
      percentUsed,
    };
  });

  return {
    metrics: summaryMetrics,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

// ============================================================================
// Snapshots
// ============================================================================

/**
 * Create a usage snapshot for a tenant, capturing the current state
 * of all metrics at a point in time. Used by the cron job for
 * historical tracking and billing reconciliation.
 *
 * @param repos - Usage metering repositories
 * @param tenantId - The tenant to snapshot
 * @returns Array of created/updated snapshots
 * @complexity O(n) where n is the number of defined metrics
 */
export async function createUsageSnapshot(
  repos: UsageMeteringRepositories,
  tenantId: string,
): Promise<UsageSnapshot[]> {
  const periodStart = getCurrentPeriodStart();
  const periodEnd = getCurrentPeriodEnd();

  const metrics = await repos.usageMetrics.findAll();
  const snapshots: UsageSnapshot[] = [];

  for (const metric of metrics) {
    const currentValue = await getUsage(repos, metric.key, tenantId, periodStart, periodEnd);

    const snapshot = await repos.usageSnapshots.upsert({
      tenantId,
      metricKey: metric.key,
      value: currentValue,
      periodStart,
      periodEnd,
      updatedAt: new Date(),
    });

    snapshots.push(snapshot);
  }

  return snapshots;
}

// ============================================================================
// Entitlement Integration
// ============================================================================

/**
 * Assert that a tenant's usage for a given metric is within their plan limit.
 *
 * Checks the current usage against the provided limit. Throws an error
 * if the tenant has reached or exceeded the limit. A limit of -1 indicates
 * unlimited usage.
 *
 * @param repos - Usage metering repositories
 * @param metricKey - The metric to check (e.g., "storage_gb", "api_calls")
 * @param tenantId - The tenant to check
 * @param limit - The maximum allowed value (-1 for unlimited)
 * @throws Error if usage exceeds the limit
 * @complexity O(1) - single usage lookup
 */
export async function assertWithinUsageLimit(
  repos: UsageMeteringRepositories,
  metricKey: string,
  tenantId: string,
  limit: number,
): Promise<void> {
  // Unlimited
  if (limit === -1 || limit === Infinity) return;

  const currentUsage = await getUsage(repos, metricKey, tenantId);

  if (isOverQuota(currentUsage, limit)) {
    throw new Error(
      `Usage limit exceeded for '${metricKey}': ${String(currentUsage)}/${String(limit)}`,
    );
  }
}
