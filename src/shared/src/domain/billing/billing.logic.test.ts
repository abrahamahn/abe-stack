// src/shared/src/domain/billing/billing.logic.test.ts
import { describe, expect, it } from 'vitest';

import { parsePlanId, parseUserId } from '../../types/ids';

import {
  calculateProration,
  canCancelSubscription,
  canChangePlan,
  canResumeSubscription,
  getEffectivePlan,
  getEntitlements,
  getFeatureValue,
  getLimitUsagePercentage,
  hasActiveSubscription,
  hasFeature,
  isOverLimit,
  isSubscriptionActive,
  isSubscriptionInactive,
  isSubscriptionPastDue,
  PLAN_FEES,
} from './billing.logic';
import { FEATURE_KEYS, type Plan, type Subscription } from './billing.schemas';

describe('billing.logic', () => {
  // ==========================================================================
  // Test Data
  // ==========================================================================
  const mockPlan: Plan = {
    id: parsePlanId('plan_pro'),
    name: 'Pro',
    description: 'Pro plan',
    interval: 'month',
    priceInCents: 2900,
    currency: 'USD',
    trialDays: 14,
    isActive: true,
    sortOrder: 1,
    features: [
      {
        key: FEATURE_KEYS.PROJECTS,
        name: 'Projects',
        included: true,
        value: 10,
      },
      {
        key: FEATURE_KEYS.CUSTOM_BRANDING,
        name: 'Branding',
        included: true,
      },
      {
        key: FEATURE_KEYS.STORAGE,
        name: 'Storage',
        included: false,
        value: 100,
      },
    ],
  };

  const freePlan: Plan = {
    id: parsePlanId('plan_free'),
    name: 'Free',
    description: 'Free plan',
    interval: 'month',
    priceInCents: 0,
    currency: 'USD',
    trialDays: 0,
    isActive: true,
    sortOrder: 0,
    features: [
      {
        key: FEATURE_KEYS.PROJECTS,
        name: 'Projects',
        included: true,
        value: 5,
      },
      {
        key: FEATURE_KEYS.STORAGE,
        name: 'Storage',
        included: true,
        value: 10,
      },
      {
        key: FEATURE_KEYS.TEAM_MEMBERS,
        name: 'Team Members',
        included: false,
      },
      {
        key: FEATURE_KEYS.API_ACCESS,
        name: 'API Access',
        included: false,
      },
      {
        key: FEATURE_KEYS.CUSTOM_BRANDING,
        name: 'Branding',
        included: false,
      },
    ],
  };

  function createSubscription(overrides: Partial<Subscription> = {}): Subscription {
    return {
      id: 'sub_123',
      userId: parseUserId('550e8400-e29b-41d4-a716-446655440000'),
      planId: parsePlanId('plan_pro'),
      plan: mockPlan,
      provider: 'stripe',
      status: 'active',
      currentPeriodStart: '2026-01-01T00:00:00Z',
      currentPeriodEnd: '2026-02-01T00:00:00Z',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialEnd: null,
      createdAt: '2026-01-01T00:00:00Z',
      ...overrides,
    } as Subscription;
  }

  // ==========================================================================
  // PLAN_FEES
  // ==========================================================================
  describe('PLAN_FEES', () => {
    it('contains expected plan fee entries', () => {
      expect(PLAN_FEES['free']).toBe(0);
      expect(PLAN_FEES['pro']).toBe(2900);
      expect(PLAN_FEES['enterprise']).toBe(29900);
    });

    it('returns undefined for unknown plans', () => {
      expect(PLAN_FEES['nonexistent']).toBeUndefined();
    });
  });

  // ==========================================================================
  // getFeatureValue
  // ==========================================================================
  describe('getFeatureValue', () => {
    it('returns the numeric value for limit features', () => {
      const value = getFeatureValue(mockPlan, FEATURE_KEYS.PROJECTS, 0);
      expect(value).toBe(10);
      expect(typeof value).toBe('number');
    });

    it('returns true for included toggle features with no explicit value', () => {
      const value = getFeatureValue(mockPlan, FEATURE_KEYS.CUSTOM_BRANDING, false);
      expect(value).toBe(true);
      expect(typeof value).toBe('boolean');
    });

    it('returns defaultValue if feature is not included', () => {
      const value = getFeatureValue(mockPlan, FEATURE_KEYS.STORAGE, 50);
      expect(value).toBe(50);
    });

    it('returns defaultValue for a feature key not present in the plan', () => {
      const value = getFeatureValue(mockPlan, FEATURE_KEYS.API_ACCESS, false);
      expect(value).toBe(false);
    });

    it('returns true for included feature when value is undefined (nullish coalescing)', () => {
      const planWithMissingValue: Plan = {
        ...mockPlan,
        features: [
          {
            key: FEATURE_KEYS.PROJECTS,
            name: 'Projects',
            included: true,
            value: undefined,
          } as Plan['features'][number],
        ],
      };

      // When included=true and value is undefined, `feature.value ?? true` returns true
      const value = getFeatureValue(planWithMissingValue, FEATURE_KEYS.PROJECTS, 100);
      expect(value).toBe(true);
    });
  });

  // ==========================================================================
  // getEntitlements
  // ==========================================================================
  describe('getEntitlements', () => {
    it('resolves entitlements from a feature-rich plan', () => {
      const entitlements = getEntitlements(mockPlan);
      expect(entitlements.maxProjects).toBe(10);
      expect(entitlements.canRemoveBranding).toBe(true);
      // Storage is not included in mockPlan, so falls back to default
      expect(entitlements.maxStorageGb).toBe(10);
      expect(entitlements.canInviteMembers).toBe(false);
      expect(entitlements.canUseApi).toBe(false);
    });

    it('resolves entitlements from a free plan with limited features', () => {
      const entitlements = getEntitlements(freePlan);
      expect(entitlements.maxProjects).toBe(5);
      expect(entitlements.maxStorageGb).toBe(10);
      expect(entitlements.canInviteMembers).toBe(false);
      expect(entitlements.canUseApi).toBe(false);
      expect(entitlements.canRemoveBranding).toBe(false);
    });
  });

  // ==========================================================================
  // hasFeature
  // ==========================================================================
  describe('hasFeature', () => {
    it('returns true for an included feature by key', () => {
      expect(hasFeature(mockPlan, FEATURE_KEYS.PROJECTS)).toBe(true);
    });

    it('returns false for a non-included feature by key', () => {
      expect(hasFeature(mockPlan, FEATURE_KEYS.STORAGE)).toBe(false);
    });

    it('returns false for a feature not in the plan', () => {
      expect(hasFeature(mockPlan, FEATURE_KEYS.API_ACCESS)).toBe(false);
    });

    it('matches feature by name (case-insensitive)', () => {
      expect(hasFeature(mockPlan, 'PROJECTS')).toBe(true);
      expect(hasFeature(mockPlan, 'projects')).toBe(true);
    });

    it('returns false for unknown feature name', () => {
      expect(hasFeature(mockPlan, 'nonexistent')).toBe(false);
    });
  });

  // ==========================================================================
  // isOverLimit
  // ==========================================================================
  describe('isOverLimit', () => {
    it('returns true when usage meets the limit', () => {
      expect(isOverLimit(10, 10)).toBe(true);
    });

    it('returns true when usage exceeds the limit', () => {
      expect(isOverLimit(15, 10)).toBe(true);
    });

    it('returns false when usage is below the limit', () => {
      expect(isOverLimit(5, 10)).toBe(false);
    });

    it('returns false for unlimited (-1)', () => {
      expect(isOverLimit(999999, -1)).toBe(false);
    });

    it('returns false for Infinity limit', () => {
      expect(isOverLimit(999999, Infinity)).toBe(false);
    });

    it('returns true for zero limit with any usage', () => {
      expect(isOverLimit(0, 0)).toBe(true);
    });
  });

  // ==========================================================================
  // getLimitUsagePercentage
  // ==========================================================================
  describe('getLimitUsagePercentage', () => {
    it('calculates percentage correctly', () => {
      expect(getLimitUsagePercentage(5, 10)).toBe(50);
      expect(getLimitUsagePercentage(10, 10)).toBe(100);
      expect(getLimitUsagePercentage(0, 10)).toBe(0);
    });

    it('caps at 100 when over limit', () => {
      expect(getLimitUsagePercentage(15, 10)).toBe(100);
    });

    it('returns 0 for unlimited (-1)', () => {
      expect(getLimitUsagePercentage(100, -1)).toBe(0);
    });

    it('returns 0 for Infinity limit', () => {
      expect(getLimitUsagePercentage(100, Infinity)).toBe(0);
    });

    it('returns 0 for zero limit', () => {
      expect(getLimitUsagePercentage(5, 0)).toBe(0);
    });

    it('returns 0 for negative limit', () => {
      expect(getLimitUsagePercentage(5, -5)).toBe(0);
    });

    it('rounds to nearest integer', () => {
      expect(getLimitUsagePercentage(1, 3)).toBe(33);
      expect(getLimitUsagePercentage(2, 3)).toBe(67);
    });
  });

  // ==========================================================================
  // isSubscriptionActive
  // ==========================================================================
  describe('isSubscriptionActive', () => {
    it('returns true for active subscription', () => {
      expect(isSubscriptionActive(createSubscription({ status: 'active' }))).toBe(true);
    });

    it('returns true for trialing subscription', () => {
      expect(isSubscriptionActive(createSubscription({ status: 'trialing' }))).toBe(true);
    });

    it('returns false for canceled subscription', () => {
      expect(isSubscriptionActive(createSubscription({ status: 'canceled' }))).toBe(false);
    });

    it('returns false for past_due subscription', () => {
      expect(isSubscriptionActive(createSubscription({ status: 'past_due' }))).toBe(false);
    });

    it('returns false for null subscription', () => {
      expect(isSubscriptionActive(null)).toBe(false);
    });
  });

  // ==========================================================================
  // isSubscriptionPastDue
  // ==========================================================================
  describe('isSubscriptionPastDue', () => {
    it('returns true for past_due subscription', () => {
      expect(isSubscriptionPastDue(createSubscription({ status: 'past_due' }))).toBe(true);
    });

    it('returns false for active subscription', () => {
      expect(isSubscriptionPastDue(createSubscription({ status: 'active' }))).toBe(false);
    });

    it('returns false for null subscription', () => {
      expect(isSubscriptionPastDue(null)).toBe(false);
    });
  });

  // ==========================================================================
  // isSubscriptionInactive
  // ==========================================================================
  describe('isSubscriptionInactive', () => {
    it('returns true for canceled subscription', () => {
      expect(isSubscriptionInactive(createSubscription({ status: 'canceled' }))).toBe(true);
    });

    it('returns true for unpaid subscription', () => {
      expect(isSubscriptionInactive(createSubscription({ status: 'unpaid' }))).toBe(true);
    });

    it('returns true for incomplete_expired subscription', () => {
      expect(isSubscriptionInactive(createSubscription({ status: 'incomplete_expired' }))).toBe(
        true,
      );
    });

    it('returns true for null subscription', () => {
      expect(isSubscriptionInactive(null)).toBe(true);
    });

    it('returns false for active subscription', () => {
      expect(isSubscriptionInactive(createSubscription({ status: 'active' }))).toBe(false);
    });

    it('returns false for trialing subscription', () => {
      expect(isSubscriptionInactive(createSubscription({ status: 'trialing' }))).toBe(false);
    });

    it('returns false for past_due subscription', () => {
      expect(isSubscriptionInactive(createSubscription({ status: 'past_due' }))).toBe(false);
    });
  });

  // ==========================================================================
  // hasActiveSubscription
  // ==========================================================================
  describe('hasActiveSubscription', () => {
    it('returns true when active subscription matches planId', () => {
      expect(hasActiveSubscription(createSubscription(), 'plan_pro')).toBe(true);
    });

    it('returns false when active subscription has different planId', () => {
      expect(hasActiveSubscription(createSubscription(), 'plan_enterprise')).toBe(false);
    });

    it('returns false when subscription is not active', () => {
      expect(hasActiveSubscription(createSubscription({ status: 'canceled' }), 'plan_pro')).toBe(
        false,
      );
    });

    it('returns false for null subscription', () => {
      expect(hasActiveSubscription(null, 'plan_pro')).toBe(false);
    });
  });

  // ==========================================================================
  // getEffectivePlan
  // ==========================================================================
  describe('getEffectivePlan', () => {
    const plans = [freePlan, mockPlan];

    it('returns matching plan for active subscription', () => {
      const result = getEffectivePlan(
        createSubscription({ planId: parsePlanId('plan_pro') }),
        plans,
      );
      expect(result).toBe(mockPlan);
    });

    it('returns undefined when subscription is not active', () => {
      const result = getEffectivePlan(
        createSubscription({ status: 'canceled', planId: parsePlanId('plan_pro') }),
        plans,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined for null subscription', () => {
      expect(getEffectivePlan(null, plans)).toBeUndefined();
    });

    it('returns undefined when planId does not match any plan', () => {
      const result = getEffectivePlan(
        createSubscription({ planId: parsePlanId('plan_unknown') }),
        plans,
      );
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // canCancelSubscription
  // ==========================================================================
  describe('canCancelSubscription', () => {
    it('returns true for active subscription not set to cancel', () => {
      expect(canCancelSubscription(createSubscription())).toBe(true);
    });

    it('returns false when already set to cancel at period end', () => {
      expect(canCancelSubscription(createSubscription({ cancelAtPeriodEnd: true }))).toBe(false);
    });

    it('returns false for canceled subscription', () => {
      expect(canCancelSubscription(createSubscription({ status: 'canceled' }))).toBe(false);
    });

    it('returns false for null subscription', () => {
      expect(canCancelSubscription(null)).toBe(false);
    });
  });

  // ==========================================================================
  // canResumeSubscription
  // ==========================================================================
  describe('canResumeSubscription', () => {
    it('returns true for active subscription set to cancel at period end', () => {
      expect(canResumeSubscription(createSubscription({ cancelAtPeriodEnd: true }))).toBe(true);
    });

    it('returns false for active subscription not set to cancel', () => {
      expect(canResumeSubscription(createSubscription())).toBe(false);
    });

    it('returns false for canceled subscription even with cancelAtPeriodEnd', () => {
      expect(
        canResumeSubscription(createSubscription({ status: 'canceled', cancelAtPeriodEnd: true })),
      ).toBe(false);
    });

    it('returns false for null subscription', () => {
      expect(canResumeSubscription(null)).toBe(false);
    });
  });

  // ==========================================================================
  // canChangePlan
  // ==========================================================================
  describe('canChangePlan', () => {
    it('returns true for null subscription (can buy a new plan)', () => {
      expect(canChangePlan(null)).toBe(true);
    });

    it('returns true for active subscription', () => {
      expect(canChangePlan(createSubscription())).toBe(true);
    });

    it('returns true for past_due subscription', () => {
      expect(canChangePlan(createSubscription({ status: 'past_due' }))).toBe(true);
    });

    it('returns false for canceled subscription', () => {
      expect(canChangePlan(createSubscription({ status: 'canceled' }))).toBe(false);
    });

    it('returns false for unpaid subscription', () => {
      expect(canChangePlan(createSubscription({ status: 'unpaid' }))).toBe(false);
    });
  });

  // ==========================================================================
  // calculateProration
  // ==========================================================================
  describe('calculateProration', () => {
    it('calculates upgrade proration correctly', () => {
      // Upgrading from $29 to $99, 15 of 30 days remaining
      const result = calculateProration(2900, 9900, 15, 30);
      // unused = 2900 * 15/30 = 1450, new = 9900 * 15/30 = 4950, charge = 4950 - 1450 = 3500
      expect(result).toBe(3500);
    });

    it('calculates downgrade proration as negative (credit)', () => {
      // Downgrading from $99 to $29, 15 of 30 days remaining
      const result = calculateProration(9900, 2900, 15, 30);
      // unused = 9900 * 15/30 = 4950, new = 2900 * 15/30 = 1450, charge = 1450 - 4950 = -3500
      expect(result).toBe(-3500);
    });

    it('returns 0 for same price plan', () => {
      expect(calculateProration(2900, 2900, 15, 30)).toBe(0);
    });

    it('returns full new price when totalDays is 0', () => {
      expect(calculateProration(2900, 9900, 15, 0)).toBe(9900);
    });

    it('returns 0 when no remaining days', () => {
      expect(calculateProration(2900, 9900, 0, 30)).toBe(0);
    });

    it('rounds result to nearest integer', () => {
      // 1000 * 10/30 = 333.33..., 2000 * 10/30 = 666.66..., diff = 333.33... → 333
      expect(calculateProration(1000, 2000, 10, 30)).toBe(333);
    });
  });
});
