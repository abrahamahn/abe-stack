// main/shared/src/domain/billing/billing.entitlements.ts
/**
 * Entitlements System
 *
 * Feature flags and limits based on subscription and role.
 * Provides a single access gate for permission checks.
 *
 * @module Domain/Billing/Entitlements
 */

import { ForbiddenError } from '../../core/errors';

// ============================================================================
// Types
// ============================================================================

/** Subscription state affecting entitlements */
export type SubscriptionState = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';

/** Feature entitlement with optional limits */
export interface FeatureEntitlement {
  /** Whether the feature is enabled */
  enabled: boolean;
  /** Optional usage limit (e.g., max projects, max seats) */
  limit?: number;
  /** Current usage count */
  currentUsage?: number;
}

/** Resolved entitlements for a user/workspace */
export interface ResolvedEntitlements {
  /** Subscription state */
  subscriptionState: SubscriptionState;
  /** Plan identifier (if subscribed) */
  planId?: string;
  /** Feature flags and limits */
  features: Record<string, FeatureEntitlement>;
}

/** Input for resolving entitlements */
export interface EntitlementInput {
  /** Subscription state */
  subscriptionState: SubscriptionState;
  /** Plan ID if subscribed */
  planId?: string;
  /** User's role in workspace */
  role?: 'owner' | 'admin' | 'member' | 'viewer';
  /** Plan features from billing */
  planFeatures?: Array<{ name: string; included: boolean; limit?: number }>;
}

// ============================================================================
// Resolver
// ============================================================================

/** Default free tier features */
const FREE_TIER_FEATURES: Record<string, FeatureEntitlement> = {
  basic_access: { enabled: true },
  max_projects: { enabled: true, limit: 3 },
  max_storage_mb: { enabled: true, limit: 100 },
  api_access: { enabled: false },
  priority_support: { enabled: false },
  ['media:processing']: { enabled: false },
  ['media:max_file_size']: { enabled: true, limit: 10 },
};

/**
 * Resolve entitlements from subscription and role.
 *
 * @param input - Subscription and role information
 * @returns Resolved entitlements with feature flags
 * @complexity O(n) where n = planFeatures.length
 */
export function resolveEntitlements(input: EntitlementInput): ResolvedEntitlements {
  const { subscriptionState, planId, planFeatures } = input;

  // No active subscription -> free tier
  if (subscriptionState === 'none' || subscriptionState === 'canceled') {
    return {
      subscriptionState,
      features: { ...FREE_TIER_FEATURES },
    };
  }

  // Past due -> limited access (read-only)
  if (subscriptionState === 'past_due') {
    const result: ResolvedEntitlements = {
      subscriptionState,
      features: {
        basic_access: { enabled: true },
        read_only: { enabled: true },
      },
    };
    if (planId !== undefined) result.planId = planId;
    return result;
  }

  // Active or trialing -> full plan features
  const features: Record<string, FeatureEntitlement> = {
    basic_access: { enabled: true },
  };

  if (planFeatures !== undefined) {
    for (const feature of planFeatures) {
      const featureEntry: FeatureEntitlement = { enabled: feature.included };
      if (feature.limit !== undefined) featureEntry.limit = feature.limit;
      features[feature.name] = featureEntry;
    }
  }

  const result: ResolvedEntitlements = {
    subscriptionState,
    features,
  };
  if (planId !== undefined) result.planId = planId;
  return result;
}

// ============================================================================
// Guards
// ============================================================================

/**
 * Assert that a feature is entitled.
 * Throws ForbiddenError if the feature is not enabled.
 *
 * @param entitlements - Resolved entitlements
 * @param featureName - Name of the feature to check
 * @param message - Custom error message
 * @throws ForbiddenError if feature is not entitled
 * @complexity O(1)
 */
export function assertEntitled(
  entitlements: ResolvedEntitlements,
  featureName: string,
  message?: string,
): void {
  const feature = entitlements.features[featureName];

  if (feature?.enabled !== true) {
    throw new ForbiddenError(
      message ?? `Feature '${featureName}' is not available on your plan`,
      'FEATURE_NOT_ENTITLED',
    );
  }
}

/**
 * Assert that a feature limit is not exceeded.
 *
 * @param entitlements - Resolved entitlements
 * @param featureName - Name of the feature to check
 * @param currentUsage - Current usage count
 * @throws ForbiddenError if limit is exceeded
 * @complexity O(1)
 */
export function assertWithinLimit(
  entitlements: ResolvedEntitlements,
  featureName: string,
  currentUsage: number,
): void {
  const feature = entitlements.features[featureName];

  if (feature?.enabled !== true) {
    throw new ForbiddenError(
      `Feature '${featureName}' is not available on your plan`,
      'FEATURE_NOT_ENTITLED',
    );
  }

  if (feature.limit !== undefined && currentUsage >= feature.limit) {
    throw new ForbiddenError(
      `Limit exceeded for '${featureName}': ${String(currentUsage)}/${String(feature.limit)}`,
      'LIMIT_EXCEEDED',
    );
  }
}

/**
 * Check if a feature is entitled (non-throwing).
 *
 * @param entitlements - Resolved entitlements
 * @param featureName - Name of the feature to check
 * @returns Whether the feature is enabled
 * @complexity O(1)
 */
export function isEntitled(entitlements: ResolvedEntitlements, featureName: string): boolean {
  const feature = entitlements.features[featureName];
  return feature?.enabled === true;
}

/**
 * Check if subscription allows access (not canceled or past_due).
 *
 * @param entitlements - Resolved entitlements
 * @returns Whether the subscription is active or trialing
 * @complexity O(1)
 */
export function hasActiveSubscription(entitlements: ResolvedEntitlements): boolean {
  return (
    entitlements.subscriptionState === 'active' || entitlements.subscriptionState === 'trialing'
  );
}
