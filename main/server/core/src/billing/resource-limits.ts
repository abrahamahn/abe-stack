// main/server/core/src/billing/resource-limits.ts
/**
 * Storage / Resource Limit Enforcement
 *
 * Enforces storage quotas and resource limits per workspace plan.
 * Bridges the entitlement system with current storage usage to
 * prevent exceeding plan allowances. Called as a preHandler check
 * before file uploads and resource-intensive operations.
 *
 * @module billing/resource-limits
 */

import { FEATURE_KEYS, ForbiddenError } from '@bslt/shared';

import { resolveEntitlementsForUser } from './entitlements';

import type { BillingRepositories } from './types';

// ============================================================================
// Types
// ============================================================================

/** Callback to retrieve current storage usage in bytes for a tenant */
export type StorageUsageCounter = (tenantId: string) => Promise<number>;

/** Storage usage information for display */
export interface StorageUsage {
  /** Current storage used in bytes */
  readonly currentBytes: number;
  /** Maximum storage allowed in bytes (undefined = unlimited) */
  readonly maxBytes: number | undefined;
  /** Percentage of storage used (0-100, or 0 if unlimited) */
  readonly percentUsed: number;
  /** Whether the workspace is at or over its storage limit */
  readonly atLimit: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Bytes per megabyte for converting plan limits (stored in MB) to bytes */
const BYTES_PER_MB = 1024 * 1024;

// ============================================================================
// Storage Limit Functions
// ============================================================================

/**
 * Assert that a tenant can store additional bytes without exceeding
 * their plan's storage limit.
 *
 * Resolves the user's entitlements and checks the `storage:limit`
 * feature. Plan limits are stored in megabytes and converted to bytes
 * for comparison. Throws `ForbiddenError` if the upload would exceed
 * the storage quota.
 *
 * @param repos - Billing repositories for subscription and plan lookups
 * @param userId - User performing the upload (subscription owner)
 * @param tenantId - Tenant/workspace whose storage to check
 * @param additionalBytes - Number of bytes the user wants to store
 * @param counter - Callback to retrieve current storage usage in bytes
 * @throws ForbiddenError if the `storage:limit` feature is not entitled
 * @throws ForbiddenError if the storage limit would be exceeded
 * @complexity O(1) - two database lookups plus counter callback
 */
export async function assertStorageLimit(
  repos: BillingRepositories,
  userId: string,
  tenantId: string,
  additionalBytes: number,
  counter: StorageUsageCounter,
): Promise<void> {
  const entitlements = await resolveEntitlementsForUser(repos, userId);
  const feature = entitlements.features[FEATURE_KEYS.STORAGE];

  if (feature?.enabled !== true) {
    throw new ForbiddenError(
      `Feature '${FEATURE_KEYS.STORAGE}' is not available on your plan`,
      'FEATURE_NOT_ENTITLED',
    );
  }

  // No numeric limit -- unlimited storage
  if (feature.limit === undefined) {
    return;
  }

  const maxBytes = feature.limit * BYTES_PER_MB;
  const currentBytes = await counter(tenantId);
  const projectedBytes = currentBytes + additionalBytes;

  if (projectedBytes > maxBytes) {
    const currentMb = Math.round(currentBytes / BYTES_PER_MB);
    const limitMb = feature.limit;

    throw new ForbiddenError(
      `Storage limit exceeded: ${String(currentMb)}MB/${String(limitMb)}MB used. Upgrade your plan for more storage.`,
      'STORAGE_LIMIT_EXCEEDED',
    );
  }
}

/**
 * Get current storage usage for a workspace.
 *
 * Returns the current storage consumption in bytes, the plan's
 * maximum in bytes, the percentage used, and whether the workspace
 * is at its limit. Suitable for rendering storage gauges in the UI.
 *
 * @param repos - Billing repositories for subscription and plan lookups
 * @param userId - User whose plan to check (subscription owner)
 * @param tenantId - Tenant/workspace whose storage to measure
 * @param counter - Callback to retrieve current storage usage in bytes
 * @returns Storage usage with current bytes, max bytes, percentage, and at-limit flag
 * @complexity O(1) - two database lookups plus counter callback
 */
export async function getStorageUsage(
  repos: BillingRepositories,
  userId: string,
  tenantId: string,
  counter: StorageUsageCounter,
): Promise<StorageUsage> {
  const entitlements = await resolveEntitlementsForUser(repos, userId);
  const feature = entitlements.features[FEATURE_KEYS.STORAGE];

  const currentBytes = await counter(tenantId);

  // Feature not available or not enabled -- report as at limit
  if (feature?.enabled !== true) {
    return {
      currentBytes,
      maxBytes: 0,
      percentUsed: 100,
      atLimit: true,
    };
  }

  // No numeric limit -- unlimited storage
  if (feature.limit === undefined) {
    return {
      currentBytes,
      maxBytes: undefined,
      percentUsed: 0,
      atLimit: false,
    };
  }

  const maxBytes = feature.limit * BYTES_PER_MB;
  const percentUsed = maxBytes > 0 ? Math.min(100, Math.round((currentBytes / maxBytes) * 100)) : 0;

  return {
    currentBytes,
    maxBytes,
    percentUsed,
    atLimit: currentBytes >= maxBytes,
  };
}
