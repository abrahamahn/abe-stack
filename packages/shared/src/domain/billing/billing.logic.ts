// shared/src/domain/billing/billing.logic.ts

/**
 * @file Billing Logic
 * @description Pure business logic for billing entitlements, limits, and plan logic.
 * @module Domain/Billing
 */

import { FEATURE_KEYS, type FeatureKey, type Plan, type Subscription } from './billing.schemas';

// ============================================================================
// Types
// ============================================================================

export interface Entitlements {
  maxProjects: number;
  maxStorageGb: number;
  canInviteMembers: boolean;
  canUseApi: boolean;
  canRemoveBranding: boolean;
}

/**
 * Summary stats for billing (used in admin dashboards)
 */
export interface BillingStats {
  totalRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  mrr: number; // Monthly Recurring Revenue
}

/**
 * Static fees for standard plan types (used for default pricing displays)
 */
export const PLAN_FEES: Record<string, number> = {
  free: 0,
  pro: 2900, // $29.00 in cents
  enterprise: 29900, // $299.00 in cents
};

// ============================================================================
// Entitlements Logic
// ============================================================================

/**
 * Resolves the full set of entitlements for a given plan.
 * Used to normalize feature access across the app.
 *
 * @param plan - The effective pricing plan
 * @returns Entitlements object with normalized limits and flags
 */
export function getEntitlements(plan: Plan): Entitlements {
  return {
    maxProjects: getFeatureValue<number>(plan, FEATURE_KEYS.PROJECTS, 5),
    maxStorageGb: getFeatureValue<number>(plan, FEATURE_KEYS.STORAGE, 10),
    canInviteMembers: getFeatureValue<boolean>(plan, FEATURE_KEYS.TEAM_MEMBERS, false),
    canUseApi: getFeatureValue<boolean>(plan, FEATURE_KEYS.API_ACCESS, false),
    canRemoveBranding: getFeatureValue<boolean>(plan, FEATURE_KEYS.CUSTOM_BRANDING, false),
  };
}

/**
 * Gets the value of a feature from a plan.
 */
export function getFeatureValue<T>(plan: Plan, key: FeatureKey, defaultValue: T): T {
  const feature = plan.features.find((f) => f.key === key);
  if (feature?.included !== true) {
    return defaultValue;
  }

  // If value is explicitly provided, use it.
  if (feature.value !== undefined) {
    return feature.value as unknown as T;
  }

  // Fallback for toggle features that are included but have no explicit value.
  // We only return 'true' if the expected type (defaultValue) is boolean.
  if (typeof defaultValue === 'boolean') {
    return true as unknown as T;
  }

  return defaultValue;
}

/**
 * Checks if a plan includes a specific feature by key or name (for compat).
 *
 * @param plan - The pricing plan object
 * @param featureKey - The key of the feature to check
 * @returns boolean - Whether the feature is included and active in the plan
 */
export function hasFeature(plan: Plan, featureKey: FeatureKey | (string & {})): boolean {
  const feature = plan.features.find(
    (f) => f.key === featureKey || f.name.toLowerCase() === featureKey.toLowerCase(),
  );

  return feature !== undefined ? feature.included : false;
}

// ============================================================================
// Usage Limits
// ============================================================================

/**
 * Checks if a numeric usage limit has been reached or exceeded.
 *
 * @param usage - The current usage count
 * @param limit - The limit allowed (passed from entitlements)
 * @returns boolean - True if the limit is reached or exceeded
 */
export function isOverLimit(usage: number, limit: number): boolean {
  if (limit === -1 || limit === Infinity) return false;
  return usage >= limit;
}

/**
 * Checks if a numeric usage limit has been reached or exceeded.
 * @deprecated Use isOverLimit instead for clarity
 */
export function isLimitReached(usage: number, planLimit: number): boolean {
  return isOverLimit(usage, planLimit);
}

/**
 * Calculates the percentage of a limit currently consumed.
 *
 * @param usage - Current usage count
 * @param limit - Total allowed limit
 * @returns number - Percentage (0-100)
 */
export function getLimitUsagePercentage(usage: number, limit: number): number {
  if (limit === -1 || limit === Infinity) return 0;
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((usage / limit) * 100));
}

// ============================================================================
// Subscription Status Helpers
// ============================================================================

/**
 * Checks if a subscription is in a "billable" or "active" state.
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (subscription === null) return false;
  return ['active', 'trialing'].includes(subscription.status);
}

/**
 * Checks if a subscription is in a "grace period" or "past due" but not yet canceled.
 */
export function isSubscriptionPastDue(subscription: Subscription | null): boolean {
  if (subscription === null) return false;
  return subscription.status === 'past_due';
}

/**
 * Checks if a subscription is fully canceled or expired.
 */
export function isSubscriptionInactive(subscription: Subscription | null): boolean {
  if (subscription === null) return true;
  return ['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status);
}

/**
 * Determines if a user has an active subscription to a specific plan.
 *
 * @param subscription - The user's subscription object
 * @param planId - The ID of the plan to check
 * @returns boolean - True if the user has an active subscription to the plan
 */
export function hasActiveSubscription(subscription: Subscription | null, planId: string): boolean {
  if (!isSubscriptionActive(subscription)) return false;
  return subscription?.planId === planId;
}

/**
 * Gets the effective plan for a user based on their subscription.
 *
 * @param subscription - The user's subscription object
 * @param plans - Available plans
 * @returns Plan | undefined - The effective plan or undefined if none
 */
export function getEffectivePlan(
  subscription: Subscription | null,
  plans: Plan[],
): Plan | undefined {
  if (!isSubscriptionActive(subscription)) {
    return undefined;
  }

  return plans.find((plan) => plan.id === subscription?.planId);
}

// ============================================================================
// Lifecycle Transitions
// ============================================================================

/**
 * Determines if a subscription can be canceled.
 */
export function canCancelSubscription(subscription: Subscription | null): boolean {
  if (subscription === null) return false;
  return isSubscriptionActive(subscription) && !subscription.cancelAtPeriodEnd;
}

/**
 * Determines if a subscription can be resumed (if it's set to cancel at period end).
 */
export function canResumeSubscription(subscription: Subscription | null): boolean {
  if (subscription === null) return false;
  return isSubscriptionActive(subscription) && subscription.cancelAtPeriodEnd;
}

/**
 * Determines if a subscription can be upgraded or changed.
 */
export function canChangePlan(subscription: Subscription | null): boolean {
  if (subscription === null) return true; // Can always buy a new one if none exists
  return !isSubscriptionInactive(subscription);
}

// ============================================================================
// Proration & Math
// ============================================================================

/**
 * Estimates the proration amount when switching plans.
 *
 * @param currentPrice - Current plan price in cents
 * @param newPrice - New plan price in cents
 * @param remainingDays - Days remaining in the current billing cycle
 * @param totalDays - Total days in the current billing cycle
 * @returns number - Amount to charge (or credit if negative) in cents
 */
export function calculateProration(
  currentPrice: number,
  newPrice: number,
  remainingDays: number,
  totalDays: number,
): number {
  if (totalDays <= 0) return newPrice;

  const unusedValue = (currentPrice * remainingDays) / totalDays;
  const newCharge = (newPrice * remainingDays) / totalDays;

  return Math.round(newCharge - unusedValue);
}
