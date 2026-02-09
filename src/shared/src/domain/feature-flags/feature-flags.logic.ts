// src/shared/src/domain/feature-flags/feature-flags.logic.ts

/**
 * @file Feature Flags Logic
 * @description Pure domain logic for feature flag evaluation.
 * @module Domain/FeatureFlags
 */

import type { FeatureFlag } from './feature-flags.schemas';

// ============================================================================
// Utilities
// ============================================================================

/**
 * Simple hash function for percentage rollouts based on an ID.
 */
function getHashValue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash % 100);
}

/**
 * Evaluates a feature flag in a given context.
 * Supports:
 * 1. Global enable/disable
 * 2. Targeted Users/Tenants
 * 3. Percentage Rollouts
 *
 * @param flag - The feature flag definition
 * @param context - Execution context (tenantId, userId)
 */
export function evaluateFlag(
  flag: FeatureFlag,
  context: { tenantId?: string; userId?: string } = {},
): boolean {
  // 1. If globally disabled, it's off.
  if (!flag.isEnabled) return false;

  // 2. Metadata target checks
  const metadata = flag.metadata;
  if (metadata === undefined) return flag.isEnabled;

  // Targeted Lists
  if (context.userId !== undefined && metadata.allowedUserIds?.includes(context.userId) === true) {
    return true;
  }
  if (
    context.tenantId !== undefined &&
    metadata.allowedTenantIds?.includes(context.tenantId) === true
  ) {
    return true;
  }

  // Percentage Rollout
  if (metadata.rolloutPercentage !== undefined) {
    const targetId = context.userId ?? context.tenantId ?? 'anonymous';
    const hash = getHashValue(targetId);
    return hash < metadata.rolloutPercentage;
  }

  // Default to global state
  return flag.isEnabled;
}
