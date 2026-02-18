// main/server/core/src/billing/entitlements.ts
/**
 * Server-Side Entitlement Helpers
 *
 * Bridges database repositories with the shared entitlement resolver.
 * Provides convenience functions for resolving a user's entitlements
 * and checking usage limits against plan constraints.
 *
 * @module billing/entitlements
 */

import { ForbiddenError, resolveEntitlements  } from '@abe-stack/shared';

import type { BillingRepositories } from './types';
import type { ResolvedEntitlements, SubscriptionState } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

/** Callback to retrieve current usage for a metric */
export type UsageCounter = (tenantId: string) => Promise<number>;

// ============================================================================
// Entitlement Resolution
// ============================================================================

/**
 * Resolve entitlements for a user by looking up their subscription and plan.
 *
 * Queries the subscription repository, then the plan repository, and
 * delegates to the shared `resolveEntitlements` function for the actual
 * feature flag/limit calculation.
 *
 * @param repos - Billing repositories for subscription and plan lookups
 * @param userId - User whose entitlements to resolve
 * @returns Resolved entitlements with feature flags and limits
 * @complexity O(1) - two sequential database lookups
 */
export async function resolveEntitlementsForUser(
  repos: BillingRepositories,
  userId: string,
): Promise<ResolvedEntitlements> {
  const subscription = await repos.subscriptions.findActiveByUserId(userId);

  let subscriptionState: SubscriptionState = 'none';
  let planId: string | undefined;
  let planFeatures: Array<{ name: string; included: boolean; limit?: number }> | undefined;

  if (subscription !== null) {
    subscriptionState = subscription.status as SubscriptionState;
    planId = subscription.planId;

    const plan = await repos.plans.findById(subscription.planId);
    if (plan !== null && Array.isArray(plan.features)) {
      planFeatures = plan.features as Array<{
        name: string;
        included: boolean;
        limit?: number;
      }>;
    }
  }

  return resolveEntitlements({
    subscriptionState,
    ...(planId !== undefined ? { planId } : {}),
    ...(planFeatures !== undefined ? { planFeatures } : {}),
  });
}

/**
 * Assert that a tenant's usage for a metric is within their plan limit.
 *
 * Resolves the user's entitlements, then checks whether the current usage
 * (retrieved via the counter callback) is within the plan's limit for
 * the specified metric. Throws ForbiddenError if the limit is exceeded
 * or the feature is not available.
 *
 * @param repos - Billing repositories for subscription and plan lookups
 * @param userId - User whose entitlements to check
 * @param metricKey - Feature key to check (e.g., 'projects:limit')
 * @param tenantId - Tenant whose usage to count
 * @param counter - Callback to retrieve current usage count
 * @throws ForbiddenError if feature is not entitled or limit is exceeded
 * @complexity O(1) - database lookups plus counter callback
 */
export async function assertUsageWithinLimit(
  repos: BillingRepositories,
  userId: string,
  metricKey: string,
  tenantId: string,
  counter: UsageCounter,
): Promise<void> {
  const entitlements = await resolveEntitlementsForUser(repos, userId);
  const feature = entitlements.features[metricKey];

  if (feature?.enabled !== true) {
    throw new ForbiddenError(
      `Feature '${metricKey}' is not available on your plan`,
      'FEATURE_NOT_ENTITLED',
    );
  }

  // If the feature has no limit, access is unlimited
  if (feature.limit === undefined) {
    return;
  }

  const currentUsage = await counter(tenantId);

  if (currentUsage >= feature.limit) {
    throw new ForbiddenError(
      `Limit exceeded for '${metricKey}': ${String(currentUsage)}/${String(feature.limit)}`,
      'LIMIT_EXCEEDED',
    );
  }
}
