// main/server/core/src/billing/dunning.ts
/**
 * Dunning / Failed Payment Service
 *
 * Manages the subscription dunning lifecycle: transitioning subscriptions
 * to `past_due` on payment failure, tracking grace periods, restoring
 * active status on successful retry, and canceling subscriptions that
 * exceed the grace period.
 *
 * Designed to be invoked from webhook handlers (payment failure/success
 * events) and a scheduled cron job (grace period expiry checks).
 *
 * @module billing/dunning
 */

import { MS_PER_DAY } from '@bslt/shared';

import { transitionSubscriptionState } from './subscription-lifecycle';

import type { BillingRepositories } from './types';
import type { Subscription } from '../../../db/src';
import type { BillingService } from '@bslt/shared';

// ============================================================================
// Constants
// ============================================================================

/** Default grace period in days before a past_due subscription is canceled */
export const DUNNING_GRACE_PERIOD_DAYS = 14;

// ============================================================================
// Types
// ============================================================================

/** Grace period status for a subscription */
export interface GracePeriodStatus {
  /** Whether the subscription is currently in a grace period */
  readonly inGracePeriod: boolean;
  /** Number of whole days remaining in the grace period (0 if not in grace period) */
  readonly daysRemaining: number;
  /** Date when the grace period expires (null if not in grace period) */
  readonly expiresAt: Date | null;
  /** Whether the grace period has expired */
  readonly expired: boolean;
}

/** Result of processing a payment failure */
export interface PaymentFailureResult {
  /** Whether the failure was processed successfully */
  readonly processed: boolean;
  /** Previous subscription status */
  readonly previousStatus: string;
  /** New subscription status */
  readonly newStatus: string;
  /** Message describing what happened */
  readonly message: string;
}

/** Result of processing a payment success */
export interface PaymentSuccessResult {
  /** Whether the success was processed */
  readonly processed: boolean;
  /** Previous subscription status */
  readonly previousStatus: string;
  /** New subscription status */
  readonly newStatus: string;
  /** Message describing what happened */
  readonly message: string;
}

/** Result of processing grace period expiry for a batch of subscriptions */
export interface GracePeriodExpiryResult {
  /** Total past_due subscriptions checked */
  readonly checked: number;
  /** Number of subscriptions canceled due to grace period expiry */
  readonly canceled: number;
  /** Number of subscriptions still within grace period */
  readonly stillInGracePeriod: number;
  /** Subscription IDs that were canceled */
  readonly canceledIds: string[];
}

// ============================================================================
// Grace Period Helpers
// ============================================================================

/**
 * Get the grace period status for a subscription.
 *
 * Calculates the remaining grace period based on when the subscription
 * entered the `past_due` state (tracked via `updatedAt`). A subscription
 * that is not `past_due` is reported as not in a grace period.
 *
 * @param subscription - The subscription to check
 * @param gracePeriodDays - Grace period duration in days (default: 14)
 * @param now - Current time for testability (default: new Date())
 * @returns Grace period status with remaining days and expiry info
 * @complexity O(1)
 */
export function getGracePeriodStatus(
  subscription: Subscription,
  gracePeriodDays: number = DUNNING_GRACE_PERIOD_DAYS,
  now?: Date,
): GracePeriodStatus {
  if (subscription.status !== 'past_due') {
    return {
      inGracePeriod: false,
      daysRemaining: 0,
      expiresAt: null,
      expired: false,
    };
  }

  const currentTime = now ?? new Date();
  const pastDueSince = subscription.updatedAt;
  const gracePeriodMs = gracePeriodDays * MS_PER_DAY;
  const expiresAt = new Date(pastDueSince.getTime() + gracePeriodMs);
  const remainingMs = expiresAt.getTime() - currentTime.getTime();

  if (remainingMs <= 0) {
    return {
      inGracePeriod: false,
      daysRemaining: 0,
      expiresAt,
      expired: true,
    };
  }

  return {
    inGracePeriod: true,
    daysRemaining: Math.floor(remainingMs / MS_PER_DAY),
    expiresAt,
    expired: false,
  };
}

// ============================================================================
// Dunning Service Functions
// ============================================================================

/**
 * Handle a payment failure event from a webhook.
 *
 * Looks up the subscription by its provider subscription ID, transitions
 * it to `past_due` using the lifecycle state machine, and records the
 * transition timestamp in the subscription metadata for grace period tracking.
 *
 * If the subscription is already `past_due`, the failure is acknowledged
 * but no state change occurs (idempotent for retry webhooks).
 *
 * @param repos - Billing repositories for subscription lookups and updates
 * @param subscriptionId - Provider subscription ID from the webhook event
 * @param provider - Billing provider identifier ('stripe' | 'paypal')
 * @returns Result indicating what happened
 * @complexity O(1) - database lookup and conditional update
 */
export async function handlePaymentFailure(
  repos: BillingRepositories,
  subscriptionId: string,
  provider: 'stripe' | 'paypal',
): Promise<PaymentFailureResult> {
  const subscription = await repos.subscriptions.findByProviderSubscriptionId(
    provider,
    subscriptionId,
  );

  if (subscription === null) {
    return {
      processed: false,
      previousStatus: 'unknown',
      newStatus: 'unknown',
      message: `Subscription not found for provider ID: ${subscriptionId}`,
    };
  }

  // Already past_due -- idempotent handling for duplicate webhooks
  if (subscription.status === 'past_due') {
    return {
      processed: true,
      previousStatus: 'past_due',
      newStatus: 'past_due',
      message: 'Subscription is already past_due; no state change needed',
    };
  }

  // Attempt state transition via the lifecycle state machine
  const currentStatus = subscription.status as 'trialing' | 'active' | 'past_due' | 'canceled';
  const event = currentStatus === 'trialing' ? 'trial_end_payment_failure' : 'payment_failure';
  const transition = transitionSubscriptionState(currentStatus, event);

  if (!transition.valid) {
    return {
      processed: false,
      previousStatus: subscription.status,
      newStatus: subscription.status,
      message: `Invalid transition from '${subscription.status}' via '${event}'`,
    };
  }

  // Update subscription to past_due with metadata tracking the failure time
  await repos.subscriptions.update(subscription.id, {
    status: 'past_due',
    metadata: {
      ...subscription.metadata,
      dunningStartedAt: new Date().toISOString(),
      lastPaymentFailureAt: new Date().toISOString(),
    },
  });

  return {
    processed: true,
    previousStatus: subscription.status,
    newStatus: 'past_due',
    message: `Subscription transitioned from '${subscription.status}' to 'past_due'`,
  };
}

/**
 * Handle a successful payment retry event from a webhook.
 *
 * Looks up the subscription by its provider subscription ID. If it is
 * currently `past_due`, transitions it back to `active` and clears
 * dunning metadata. If the subscription is already active, the event
 * is acknowledged idempotently.
 *
 * @param repos - Billing repositories for subscription lookups and updates
 * @param subscriptionId - Provider subscription ID from the webhook event
 * @param provider - Billing provider identifier ('stripe' | 'paypal')
 * @returns Result indicating what happened
 * @complexity O(1) - database lookup and conditional update
 */
export async function handlePaymentSuccess(
  repos: BillingRepositories,
  subscriptionId: string,
  provider: 'stripe' | 'paypal',
): Promise<PaymentSuccessResult> {
  const subscription = await repos.subscriptions.findByProviderSubscriptionId(
    provider,
    subscriptionId,
  );

  if (subscription === null) {
    return {
      processed: false,
      previousStatus: 'unknown',
      newStatus: 'unknown',
      message: `Subscription not found for provider ID: ${subscriptionId}`,
    };
  }

  // Already active -- idempotent handling
  if (subscription.status === 'active') {
    return {
      processed: true,
      previousStatus: 'active',
      newStatus: 'active',
      message: 'Subscription is already active; no state change needed',
    };
  }

  // Attempt state transition
  const currentStatus = subscription.status as 'trialing' | 'active' | 'past_due' | 'canceled';
  const transition = transitionSubscriptionState(currentStatus, 'payment_success');

  if (!transition.valid) {
    return {
      processed: false,
      previousStatus: subscription.status,
      newStatus: subscription.status,
      message: `Invalid transition from '${subscription.status}' via 'payment_success'`,
    };
  }

  // Clear dunning metadata and restore active status
  const { dunningStartedAt: _, lastPaymentFailureAt: __, ...cleanMetadata } = subscription.metadata;

  await repos.subscriptions.update(subscription.id, {
    status: 'active',
    metadata: cleanMetadata,
  });

  return {
    processed: true,
    previousStatus: subscription.status,
    newStatus: 'active',
    message: `Subscription restored from '${subscription.status}' to 'active'`,
  };
}

/**
 * Process grace period expiry for all past_due subscriptions.
 *
 * Intended to be called by a scheduled cron job. Fetches all `past_due`
 * subscriptions, checks each against the grace period, and cancels
 * those that have exceeded the allowed dunning window via the billing
 * provider and local database update.
 *
 * @param repos - Billing repositories for subscription queries and updates
 * @param provider - Billing service provider for provider-side cancellation
 * @param gracePeriodDays - Grace period duration in days (default: 14)
 * @param now - Current time for testability (default: new Date())
 * @returns Summary of checked, canceled, and still-in-grace subscriptions
 * @complexity O(n) where n is the number of past_due subscriptions
 */
export async function processGracePeriodExpiry(
  repos: BillingRepositories,
  provider: BillingService,
  gracePeriodDays: number = DUNNING_GRACE_PERIOD_DAYS,
  now?: Date,
): Promise<GracePeriodExpiryResult> {
  const pastDueSubscriptions = await repos.subscriptions.findPastDue();

  const result: GracePeriodExpiryResult = {
    checked: pastDueSubscriptions.length,
    canceled: 0,
    stillInGracePeriod: 0,
    canceledIds: [],
  };

  for (const subscription of pastDueSubscriptions) {
    const status = getGracePeriodStatus(subscription, gracePeriodDays, now);

    if (status.expired) {
      // Cancel via the provider first
      try {
        await provider.cancelSubscription(subscription.providerSubscriptionId, true);
      } catch {
        // Provider cancellation may fail if already canceled on provider side;
        // proceed with local update regardless
      }

      // Update local subscription to canceled
      await repos.subscriptions.update(subscription.id, {
        status: 'canceled',
        canceledAt: now ?? new Date(),
        metadata: {
          ...subscription.metadata,
          cancelReason: 'grace_period_expired',
          canceledByDunning: true,
          gracePeriodExpiredAt: (now ?? new Date()).toISOString(),
        },
      });

      result.canceledIds.push(subscription.id);
      (result as { canceled: number }).canceled += 1;
    } else {
      (result as { stillInGracePeriod: number }).stillInGracePeriod += 1;
    }
  }

  return result;
}
