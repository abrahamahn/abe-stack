// shared/src/contracts/entitlements.test.ts
import { describe, expect, it } from 'vitest';

import { ForbiddenError } from '../core/errors';

import {
  assertEntitled,
  assertWithinLimit,
  hasActiveSubscription,
  isEntitled,
  resolveEntitlements,
  type EntitlementInput,
  type FeatureEntitlement,
  type ResolvedEntitlements,
} from './entitlements';

// ============================================================================
// resolveEntitlements Tests
// ============================================================================

describe('resolveEntitlements', () => {
  describe('when subscription state is "none"', () => {
    it('should return free tier features', () => {
      const input: EntitlementInput = {
        subscriptionState: 'none',
      };

      const result = resolveEntitlements(input);

      expect(result).toEqual({
        subscriptionState: 'none',
        features: {
          basic_access: { enabled: true },
          max_projects: { enabled: true, limit: 3 },
          max_storage_mb: { enabled: true, limit: 100 },
          api_access: { enabled: false },
          priority_support: { enabled: false },
        },
      });
    });

    it('should not include planId even if provided', () => {
      const input: EntitlementInput = {
        subscriptionState: 'none',
        planId: 'plan_123',
      };

      const result = resolveEntitlements(input);

      expect(result.planId).toBeUndefined();
    });
  });

  describe('when subscription state is "canceled"', () => {
    it('should return free tier features', () => {
      const input: EntitlementInput = {
        subscriptionState: 'canceled',
      };

      const result = resolveEntitlements(input);

      expect(result).toEqual({
        subscriptionState: 'canceled',
        features: {
          basic_access: { enabled: true },
          max_projects: { enabled: true, limit: 3 },
          max_storage_mb: { enabled: true, limit: 100 },
          api_access: { enabled: false },
          priority_support: { enabled: false },
        },
      });
    });

    it('should not include planId even if provided', () => {
      const input: EntitlementInput = {
        subscriptionState: 'canceled',
        planId: 'plan_123',
      };

      const result = resolveEntitlements(input);

      expect(result.planId).toBeUndefined();
    });
  });

  describe('when subscription state is "past_due"', () => {
    it('should return limited access features (read-only)', () => {
      const input: EntitlementInput = {
        subscriptionState: 'past_due',
      };

      const result = resolveEntitlements(input);

      expect(result).toEqual({
        subscriptionState: 'past_due',
        features: {
          basic_access: { enabled: true },
          read_only: { enabled: true },
        },
      });
    });

    it('should include planId when provided', () => {
      const input: EntitlementInput = {
        subscriptionState: 'past_due',
        planId: 'plan_pro',
      };

      const result = resolveEntitlements(input);

      expect(result.planId).toBe('plan_pro');
      expect(result.features).toEqual({
        basic_access: { enabled: true },
        read_only: { enabled: true },
      });
    });
  });

  describe('when subscription state is "active"', () => {
    it('should return basic_access plus plan features', () => {
      const input: EntitlementInput = {
        subscriptionState: 'active',
        planId: 'plan_pro',
        planFeatures: [
          { name: 'api_access', included: true },
          { name: 'priority_support', included: true },
          { name: 'max_projects', included: true, limit: 10 },
        ],
      };

      const result = resolveEntitlements(input);

      expect(result).toEqual({
        subscriptionState: 'active',
        planId: 'plan_pro',
        features: {
          basic_access: { enabled: true },
          api_access: { enabled: true },
          priority_support: { enabled: true },
          max_projects: { enabled: true, limit: 10 },
        },
      });
    });

    it('should handle features without limits', () => {
      const input: EntitlementInput = {
        subscriptionState: 'active',
        planId: 'plan_basic',
        planFeatures: [{ name: 'unlimited_storage', included: true }],
      };

      const result = resolveEntitlements(input);

      expect(result.features.unlimited_storage).toEqual({ enabled: true });
    });

    it('should return only basic_access when planFeatures is undefined', () => {
      const input: EntitlementInput = {
        subscriptionState: 'active',
        planId: 'plan_custom',
      };

      const result = resolveEntitlements(input);

      expect(result).toEqual({
        subscriptionState: 'active',
        planId: 'plan_custom',
        features: {
          basic_access: { enabled: true },
        },
      });
    });

    it('should handle empty planFeatures array', () => {
      const input: EntitlementInput = {
        subscriptionState: 'active',
        planId: 'plan_empty',
        planFeatures: [],
      };

      const result = resolveEntitlements(input);

      expect(result).toEqual({
        subscriptionState: 'active',
        planId: 'plan_empty',
        features: {
          basic_access: { enabled: true },
        },
      });
    });

    it('should include planId when provided', () => {
      const input: EntitlementInput = {
        subscriptionState: 'active',
        planId: 'plan_enterprise',
        planFeatures: [{ name: 'custom_feature', included: true }],
      };

      const result = resolveEntitlements(input);

      expect(result.planId).toBe('plan_enterprise');
    });

    it('should handle features with included: false', () => {
      const input: EntitlementInput = {
        subscriptionState: 'active',
        planId: 'plan_basic',
        planFeatures: [
          { name: 'api_access', included: true },
          { name: 'advanced_analytics', included: false },
        ],
      };

      const result = resolveEntitlements(input);

      expect(result.features.api_access).toEqual({ enabled: true });
      expect(result.features.advanced_analytics).toEqual({ enabled: false });
    });
  });

  describe('when subscription state is "trialing"', () => {
    it('should return same features as active subscription', () => {
      const input: EntitlementInput = {
        subscriptionState: 'trialing',
        planId: 'plan_trial',
        planFeatures: [
          { name: 'api_access', included: true },
          { name: 'max_users', included: true, limit: 5 },
        ],
      };

      const result = resolveEntitlements(input);

      expect(result).toEqual({
        subscriptionState: 'trialing',
        planId: 'plan_trial',
        features: {
          basic_access: { enabled: true },
          api_access: { enabled: true },
          max_users: { enabled: true, limit: 5 },
        },
      });
    });

    it('should include planId when provided', () => {
      const input: EntitlementInput = {
        subscriptionState: 'trialing',
        planId: 'plan_trial_pro',
      };

      const result = resolveEntitlements(input);

      expect(result.planId).toBe('plan_trial_pro');
    });
  });

  describe('edge cases', () => {
    it('should handle features with limit of 0', () => {
      const input: EntitlementInput = {
        subscriptionState: 'active',
        planFeatures: [{ name: 'locked_feature', included: true, limit: 0 }],
      };

      const result = resolveEntitlements(input);

      expect(result.features.locked_feature).toEqual({ enabled: true, limit: 0 });
    });

    it('should handle features with very large limits', () => {
      const input: EntitlementInput = {
        subscriptionState: 'active',
        planFeatures: [{ name: 'massive_limit', included: true, limit: 999999 }],
      };

      const result = resolveEntitlements(input);

      expect(result.features.massive_limit).toEqual({ enabled: true, limit: 999999 });
    });

    it('should not mutate the original FREE_TIER_FEATURES', () => {
      const input1: EntitlementInput = { subscriptionState: 'none' };
      const result1 = resolveEntitlements(input1);

      const input2: EntitlementInput = { subscriptionState: 'none' };
      const result2 = resolveEntitlements(input2);

      expect(result1.features).toEqual(result2.features);
      expect(result1.features).not.toBe(result2.features);
    });
  });
});

// ============================================================================
// assertEntitled Tests
// ============================================================================

describe('assertEntitled', () => {
  describe('when feature is enabled', () => {
    it('should not throw error', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          api_access: { enabled: true },
        },
      };

      expect(() => {
        assertEntitled(entitlements, 'api_access');
      }).not.toThrow();
    });
  });

  describe('when feature is disabled', () => {
    it('should throw ForbiddenError with default message', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          api_access: { enabled: false },
        },
      };

      expect(() => {
        assertEntitled(entitlements, 'api_access');
      }).toThrow(ForbiddenError);
      expect(() => {
        assertEntitled(entitlements, 'api_access');
      }).toThrow("Feature 'api_access' is not available on your plan");
    });

    it('should throw ForbiddenError with code FEATURE_NOT_ENTITLED', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          api_access: { enabled: false },
        },
      };

      try {
        assertEntitled(entitlements, 'api_access');
        expect.fail('Expected ForbiddenError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).code).toBe('FEATURE_NOT_ENTITLED');
      }
    });

    it('should throw ForbiddenError with custom message when provided', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          api_access: { enabled: false },
        },
      };

      expect(() => {
        assertEntitled(entitlements, 'api_access', 'Custom message');
      }).toThrow('Custom message');
    });
  });

  describe('when feature does not exist', () => {
    it('should throw ForbiddenError', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {},
      };

      expect(() => {
        assertEntitled(entitlements, 'nonexistent_feature');
      }).toThrow(ForbiddenError);
      expect(() => {
        assertEntitled(entitlements, 'nonexistent_feature');
      }).toThrow("Feature 'nonexistent_feature' is not available on your plan");
    });

    it('should throw ForbiddenError with code FEATURE_NOT_ENTITLED', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {},
      };

      try {
        assertEntitled(entitlements, 'nonexistent_feature');
        expect.fail('Expected ForbiddenError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).code).toBe('FEATURE_NOT_ENTITLED');
      }
    });
  });

  describe('edge cases', () => {
    it('should throw when feature exists but enabled is undefined', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          weird_feature: {} as FeatureEntitlement,
        },
      };

      expect(() => {
        assertEntitled(entitlements, 'weird_feature');
      }).toThrow(ForbiddenError);
    });

    it('should pass when feature has limit (enabled is still true)', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          max_projects: { enabled: true, limit: 5 },
        },
      };

      expect(() => {
        assertEntitled(entitlements, 'max_projects');
      }).not.toThrow();
    });
  });
});

// ============================================================================
// assertWithinLimit Tests
// ============================================================================

describe('assertWithinLimit', () => {
  describe('when feature is disabled', () => {
    it('should throw ForbiddenError with code FEATURE_NOT_ENTITLED', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          max_projects: { enabled: false, limit: 5 },
        },
      };

      try {
        assertWithinLimit(entitlements, 'max_projects', 2);
        expect.fail('Expected ForbiddenError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).code).toBe('FEATURE_NOT_ENTITLED');
        expect((error as ForbiddenError).message).toBe(
          "Feature 'max_projects' is not available on your plan",
        );
      }
    });
  });

  describe('when feature does not exist', () => {
    it('should throw ForbiddenError with code FEATURE_NOT_ENTITLED', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {},
      };

      try {
        assertWithinLimit(entitlements, 'nonexistent', 1);
        expect.fail('Expected ForbiddenError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).code).toBe('FEATURE_NOT_ENTITLED');
      }
    });
  });

  describe('when feature is enabled but has no limit', () => {
    it('should not throw error regardless of usage', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          unlimited_storage: { enabled: true },
        },
      };

      expect(() => {
        assertWithinLimit(entitlements, 'unlimited_storage', 0);
      }).not.toThrow();
      expect(() => {
        assertWithinLimit(entitlements, 'unlimited_storage', 100);
      }).not.toThrow();
      expect(() => {
        assertWithinLimit(entitlements, 'unlimited_storage', 999999);
      }).not.toThrow();
    });
  });

  describe('when current usage is below limit', () => {
    it('should not throw error', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          max_projects: { enabled: true, limit: 5 },
        },
      };

      expect(() => {
        assertWithinLimit(entitlements, 'max_projects', 0);
      }).not.toThrow();
      expect(() => {
        assertWithinLimit(entitlements, 'max_projects', 4);
      }).not.toThrow();
    });
  });

  describe('when current usage equals limit', () => {
    it('should throw ForbiddenError with code LIMIT_EXCEEDED', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          max_projects: { enabled: true, limit: 5 },
        },
      };

      try {
        assertWithinLimit(entitlements, 'max_projects', 5);
        expect.fail('Expected ForbiddenError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).code).toBe('LIMIT_EXCEEDED');
        expect((error as ForbiddenError).message).toBe("Limit exceeded for 'max_projects': 5/5");
      }
    });
  });

  describe('when current usage exceeds limit', () => {
    it('should throw ForbiddenError with code LIMIT_EXCEEDED', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          max_projects: { enabled: true, limit: 5 },
        },
      };

      try {
        assertWithinLimit(entitlements, 'max_projects', 10);
        expect.fail('Expected ForbiddenError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).code).toBe('LIMIT_EXCEEDED');
        expect((error as ForbiddenError).message).toBe("Limit exceeded for 'max_projects': 10/5");
      }
    });
  });

  describe('edge cases', () => {
    it('should handle limit of 0', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          restricted_feature: { enabled: true, limit: 0 },
        },
      };

      expect(() => {
        assertWithinLimit(entitlements, 'restricted_feature', 0);
      }).toThrow(ForbiddenError);
      expect(() => {
        assertWithinLimit(entitlements, 'restricted_feature', 1);
      }).toThrow(ForbiddenError);
    });

    it('should handle very large usage numbers', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          max_records: { enabled: true, limit: 1000000 },
        },
      };

      expect(() => {
        assertWithinLimit(entitlements, 'max_records', 999999);
      }).not.toThrow();
      expect(() => {
        assertWithinLimit(entitlements, 'max_records', 1000000);
      }).toThrow(ForbiddenError);
    });
  });
});

// ============================================================================
// isEntitled Tests
// ============================================================================

describe('isEntitled', () => {
  describe('when feature is enabled', () => {
    it('should return true', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          api_access: { enabled: true },
        },
      };

      expect(isEntitled(entitlements, 'api_access')).toBe(true);
    });

    it('should return true even when feature has a limit', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          max_projects: { enabled: true, limit: 5 },
        },
      };

      expect(isEntitled(entitlements, 'max_projects')).toBe(true);
    });
  });

  describe('when feature is disabled', () => {
    it('should return false', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          api_access: { enabled: false },
        },
      };

      expect(isEntitled(entitlements, 'api_access')).toBe(false);
    });
  });

  describe('when feature does not exist', () => {
    it('should return false', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {},
      };

      expect(isEntitled(entitlements, 'nonexistent_feature')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false when feature exists but enabled is undefined', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          weird_feature: {} as FeatureEntitlement,
        },
      };

      expect(isEntitled(entitlements, 'weird_feature')).toBe(false);
    });

    it('should return false when feature enabled is null', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          null_feature: { enabled: null as unknown as boolean },
        },
      };

      expect(isEntitled(entitlements, 'null_feature')).toBe(false);
    });
  });
});

// ============================================================================
// hasActiveSubscription Tests
// ============================================================================

describe('hasActiveSubscription', () => {
  describe('when subscription state is "active"', () => {
    it('should return true', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {},
      };

      expect(hasActiveSubscription(entitlements)).toBe(true);
    });
  });

  describe('when subscription state is "trialing"', () => {
    it('should return true', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'trialing',
        features: {},
      };

      expect(hasActiveSubscription(entitlements)).toBe(true);
    });
  });

  describe('when subscription state is "none"', () => {
    it('should return false', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'none',
        features: {},
      };

      expect(hasActiveSubscription(entitlements)).toBe(false);
    });
  });

  describe('when subscription state is "canceled"', () => {
    it('should return false', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'canceled',
        features: {},
      };

      expect(hasActiveSubscription(entitlements)).toBe(false);
    });
  });

  describe('when subscription state is "past_due"', () => {
    it('should return false', () => {
      const entitlements: ResolvedEntitlements = {
        subscriptionState: 'past_due',
        features: {},
      };

      expect(hasActiveSubscription(entitlements)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should work regardless of features present', () => {
      const entitlementsEmpty: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {},
      };

      const entitlementsFull: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {
          api_access: { enabled: true },
          priority_support: { enabled: true },
        },
      };

      expect(hasActiveSubscription(entitlementsEmpty)).toBe(true);
      expect(hasActiveSubscription(entitlementsFull)).toBe(true);
    });

    it('should work regardless of planId presence', () => {
      const withoutPlan: ResolvedEntitlements = {
        subscriptionState: 'active',
        features: {},
      };

      const withPlan: ResolvedEntitlements = {
        subscriptionState: 'active',
        planId: 'plan_pro',
        features: {},
      };

      expect(hasActiveSubscription(withoutPlan)).toBe(true);
      expect(hasActiveSubscription(withPlan)).toBe(true);
    });
  });
});
