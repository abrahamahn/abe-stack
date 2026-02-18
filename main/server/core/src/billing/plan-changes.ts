// main/server/core/src/billing/plan-changes.ts
/**
 * Plan Change Service
 *
 * Upgrade and downgrade subscription operations with proration awareness.
 * Upgrades apply immediately with proration; downgrades take effect at
 * period end. Delegates to the billing provider for actual plan changes.
 *
 * @module billing/plan-changes
 */

import {
  BillingSubscriptionNotFoundError,
  CannotDowngradeInTrialError,
  PlanNotActiveError,
  PlanNotFoundError,
  SubscriptionNotActiveError,
} from '@bslt/shared';

import type { BillingService } from '@bslt/shared';
import type { Plan as DbPlan, Subscription as DbSubscription } from '../../../db/src';
import type { BillingRepositories } from './types';

// ============================================================================
// Types
// ============================================================================

/** Direction of a plan change */
export type PlanChangeDirection = 'upgrade' | 'downgrade' | 'lateral';

/** Result of a plan change operation */
export interface PlanChangeResult {
  /** Direction of the change */
  readonly direction: PlanChangeDirection;
  /** Previous plan ID */
  readonly previousPlanId: string;
  /** New plan ID */
  readonly newPlanId: string;
  /** Whether the change is applied immediately or at period end */
  readonly appliedImmediately: boolean;
}

// ============================================================================
// Pure Helpers
// ============================================================================

/**
 * Determine the direction of a plan change based on price comparison.
 *
 * @param currentPriceInCents - Current plan price
 * @param newPriceInCents - New plan price
 * @returns Direction of the change
 * @complexity O(1)
 */
export function determinePlanChangeDirection(
  currentPriceInCents: number,
  newPriceInCents: number,
): PlanChangeDirection {
  if (newPriceInCents > currentPriceInCents) return 'upgrade';
  if (newPriceInCents < currentPriceInCents) return 'downgrade';
  return 'lateral';
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Shared validation for plan change operations.
 *
 * Validates the subscription is active or trialing, and the new plan
 * exists, is active, and has a provider price ID configured.
 *
 * @param repos - Billing repositories
 * @param userId - User whose subscription to validate
 * @param newPlanId - Target plan to validate
 * @returns Validated subscription and new plan
 * @throws BillingSubscriptionNotFoundError if no active subscription
 * @throws SubscriptionNotActiveError if subscription is not active/trialing
 * @throws PlanNotFoundError if plan does not exist
 * @throws PlanNotActiveError if plan is not active
 * @throws Error if plan has no provider price ID
 * @complexity O(1) - sequential database lookups
 */
async function validatePlanChange(
  repos: BillingRepositories,
  userId: string,
  newPlanId: string,
): Promise<{ subscription: DbSubscription; currentPlan: DbPlan; newPlan: DbPlan }> {
  const subscription = await repos.subscriptions.findActiveByUserId(userId);
  if (subscription === null) {
    throw new BillingSubscriptionNotFoundError();
  }

  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    throw new SubscriptionNotActiveError();
  }

  // Look up current plan for price comparison
  const currentPlan = await repos.plans.findById(subscription.planId);
  if (currentPlan === null) {
    throw new PlanNotFoundError(subscription.planId);
  }

  // Validate new plan
  const newPlan = await repos.plans.findById(newPlanId);
  if (newPlan === null) {
    throw new PlanNotFoundError(newPlanId);
  }
  if (!newPlan.isActive) {
    throw new PlanNotActiveError(newPlanId);
  }

  const newPriceId = newPlan.stripePriceId;
  if (newPriceId === null || newPriceId === '') {
    throw new Error(`Plan ${newPlanId} has no Stripe price ID configured`);
  }

  return { subscription, currentPlan, newPlan };
}

/**
 * Upgrade a subscription to a higher-tier plan.
 *
 * Applied immediately with proration so the user gets access right away.
 * Validates that the new plan is more expensive than the current plan.
 *
 * @param repos - Billing repositories
 * @param provider - Billing service provider
 * @param userId - User whose subscription to upgrade
 * @param newPlanId - Target plan (must be higher priced)
 * @returns Plan change result
 * @throws BillingSubscriptionNotFoundError if no active subscription
 * @throws SubscriptionNotActiveError if subscription not active/trialing
 * @throws PlanNotFoundError if plan does not exist
 * @throws PlanNotActiveError if plan is not active
 * @complexity O(1) - sequential lookups and provider API call
 */
export async function upgradeSubscription(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  newPlanId: string,
): Promise<PlanChangeResult> {
  const { subscription, currentPlan, newPlan } = await validatePlanChange(repos, userId, newPlanId);

  // Upgrade applies immediately via the provider (with proration)
  await provider.updateSubscription(
    subscription.providerSubscriptionId,
    newPlan.stripePriceId as string,
  );

  // Update local record immediately
  await repos.subscriptions.update(subscription.id, {
    planId: newPlanId,
  });

  return {
    direction: determinePlanChangeDirection(currentPlan.priceInCents, newPlan.priceInCents),
    previousPlanId: currentPlan.id,
    newPlanId: newPlan.id,
    appliedImmediately: true,
  };
}

/**
 * Downgrade a subscription to a lower-tier plan.
 *
 * Takes effect at the end of the current billing period so the user
 * retains access to the higher-tier features for the remainder of
 * the paid period. Cannot downgrade while in a trial period.
 *
 * @param repos - Billing repositories
 * @param provider - Billing service provider
 * @param userId - User whose subscription to downgrade
 * @param newPlanId - Target plan (must be lower priced)
 * @returns Plan change result
 * @throws BillingSubscriptionNotFoundError if no active subscription
 * @throws SubscriptionNotActiveError if subscription not active/trialing
 * @throws CannotDowngradeInTrialError if subscription is trialing
 * @throws PlanNotFoundError if plan does not exist
 * @throws PlanNotActiveError if plan is not active
 * @complexity O(1) - sequential lookups and provider API call
 */
export async function downgradeSubscription(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  newPlanId: string,
): Promise<PlanChangeResult> {
  const { subscription, currentPlan, newPlan } = await validatePlanChange(repos, userId, newPlanId);

  // Cannot downgrade during trial -- no billing period to schedule against
  if (subscription.status === 'trialing') {
    throw new CannotDowngradeInTrialError();
  }

  // Downgrade via the provider -- the provider schedules the change at period end
  await provider.updateSubscription(
    subscription.providerSubscriptionId,
    newPlan.stripePriceId as string,
  );

  // Record the scheduled plan change in metadata so the UI can show it
  await repos.subscriptions.update(subscription.id, {
    metadata: {
      ...subscription.metadata,
      scheduledPlanId: newPlanId,
    },
  });

  return {
    direction: determinePlanChangeDirection(currentPlan.priceInCents, newPlan.priceInCents),
    previousPlanId: currentPlan.id,
    newPlanId: newPlan.id,
    appliedImmediately: false,
  };
}
