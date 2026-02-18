// main/shared/src/core/billing/billing.entitlements.test.ts

/**
 * @file Billing Entitlements Tests
 * @description Unit tests for entitlements resolution, access guards, and subscription checks.
 * @module Core/Billing/Tests
 */

import { describe, expect, it } from 'vitest';

import { ForbiddenError } from '../../system/errors';

import {
  assertEntitled,
  assertWithinLimit,
  hasActiveSubscription,
  isEntitled,
  resolveEntitlements,
} from './billing.entitlements';

import type { EntitlementInput, ResolvedEntitlements } from './billing.entitlements';

// ============================================================================
// resolveEntitlements
// ============================================================================

describe('resolveEntitlements', () => {
  describe('when subscription state is "none"', () => {
    it('should return free tier features', () => {
      const input: EntitlementInput = { subscriptionState: 'none' };
      const result = resolveEntitlements(input);

      expect(result.subscriptionState).toBe('none');
      expect(result.planId).toBeUndefined();
      expect(result.features['basic_access']).toEqual({ enabled: true });
      expect(result.features['max_projects']).toEqual({ enabled: true, limit: 3 });
      expect(result.features['max_storage_mb']).toEqual({ enabled: true, limit: 100 });
      expect(result.features['api_access']).toEqual({ enabled: false });
      expect(result.features['priority_support']).toEqual({ enabled: false });
    });

    it('should include media features in free tier', () => {
      const input: EntitlementInput = { subscriptionState: 'none' };
      const result = resolveEntitlements(input);

      expect(result.features['media:processing']).toEqual({ enabled: false });
      expect(result.features['media:max_file_size']).toEqual({ enabled: true, limit: 10 });
    });
  });

  describe('when subscription state is "canceled"', () => {
    it('should return free tier features', () => {
      const input: EntitlementInput = { subscriptionState: 'canceled', planId: 'pro' };
      const result = resolveEntitlements(input);

      expect(result.subscriptionState).toBe('canceled');
      expect(result.planId).toBeUndefined();
      expect(result.features['basic_access']).toEqual({ enabled: true });
      expect(result.features['api_access']).toEqual({ enabled: false });
    });
  });

  describe('when subscription state is "past_due"', () => {
    it('should return limited read-only access', () => {
      const input: EntitlementInput = { subscriptionState: 'past_due', planId: 'pro' };
      const result = resolveEntitlements(input);

      expect(result.subscriptionState).toBe('past_due');
      expect(result.planId).toBe('pro');
      expect(result.features['basic_access']).toEqual({ enabled: true });
      expect(result.features['read_only']).toEqual({ enabled: true });
    });

    it('should not include plan features', () => {
      const input: EntitlementInput = {
        subscriptionState: 'past_due',
        planId: 'pro',
        planFeatures: [{ name: 'api_access', included: true }],
      };
      const result = resolveEntitlements(input);

      expect(result.features['api_access']).toBeUndefined();
    });

    it('should omit planId when not provided', () => {
      const input: EntitlementInput = { subscriptionState: 'past_due' };
      const result = resolveEntitlements(input);

      expect(result.planId).toBeUndefined();
    });
  });

  describe('when subscription state is "active"', () => {
    it('should include plan features', () => {
      const input: EntitlementInput = {
        subscriptionState: 'active',
        planId: 'pro',
        planFeatures: [
          { name: 'api_access', included: true },
          { name: 'priority_support', included: true },
          { name: 'max_projects', included: true, limit: 50 },
        ],
      };
      const result = resolveEntitlements(input);

      expect(result.subscriptionState).toBe('active');
      expect(result.planId).toBe('pro');
      expect(result.features['basic_access']).toEqual({ enabled: true });
      expect(result.features['api_access']).toEqual({ enabled: true });
      expect(result.features['priority_support']).toEqual({ enabled: true });
      expect(result.features['max_projects']).toEqual({ enabled: true, limit: 50 });
    });

    it('should handle features with limits', () => {
      const input: EntitlementInput = {
        subscriptionState: 'active',
        planFeatures: [{ name: 'max_storage_mb', included: true, limit: 5000 }],
      };
      const result = resolveEntitlements(input);

      expect(result.features['max_storage_mb']).toEqual({ enabled: true, limit: 5000 });
    });

    it('should handle disabled plan features', () => {
      const input: EntitlementInput = {
        subscriptionState: 'active',
        planFeatures: [{ name: 'beta_feature', included: false }],
      };
      const result = resolveEntitlements(input);

      expect(result.features['beta_feature']).toEqual({ enabled: false });
    });

    it('should default to basic_access only when no plan features', () => {
      const input: EntitlementInput = { subscriptionState: 'active', planId: 'basic' };
      const result = resolveEntitlements(input);

      expect(result.features).toEqual({ basic_access: { enabled: true } });
    });
  });

  describe('when subscription state is "trialing"', () => {
    it('should behave same as active', () => {
      const input: EntitlementInput = {
        subscriptionState: 'trialing',
        planId: 'pro',
        planFeatures: [{ name: 'api_access', included: true }],
      };
      const result = resolveEntitlements(input);

      expect(result.subscriptionState).toBe('trialing');
      expect(result.planId).toBe('pro');
      expect(result.features['api_access']).toEqual({ enabled: true });
    });
  });
});

// ============================================================================
// assertEntitled
// ============================================================================

describe('assertEntitled', () => {
  const activeEntitlements: ResolvedEntitlements = {
    subscriptionState: 'active',
    features: {
      api_access: { enabled: true },
      beta_feature: { enabled: false },
    },
  };

  it('should not throw when feature is enabled', () => {
    expect(() => {
      assertEntitled(activeEntitlements, 'api_access');
    }).not.toThrow();
  });

  it('should throw ForbiddenError when feature is disabled', () => {
    expect(() => {
      assertEntitled(activeEntitlements, 'beta_feature');
    }).toThrow(ForbiddenError);
  });

  it('should throw ForbiddenError when feature does not exist', () => {
    expect(() => {
      assertEntitled(activeEntitlements, 'nonexistent');
    }).toThrow(ForbiddenError);
  });

  it('should use default error message', () => {
    expect(() => {
      assertEntitled(activeEntitlements, 'nonexistent');
    }).toThrow("Feature 'nonexistent' is not available on your plan");
  });

  it('should use custom error message when provided', () => {
    expect(() => {
      assertEntitled(activeEntitlements, 'nonexistent', 'Upgrade to unlock');
    }).toThrow('Upgrade to unlock');
  });
});

// ============================================================================
// assertWithinLimit
// ============================================================================

describe('assertWithinLimit', () => {
  const entitlements: ResolvedEntitlements = {
    subscriptionState: 'active',
    features: {
      max_projects: { enabled: true, limit: 5 },
      unlimited_feature: { enabled: true },
      disabled_feature: { enabled: false },
    },
  };

  it('should not throw when usage is below limit', () => {
    expect(() => {
      assertWithinLimit(entitlements, 'max_projects', 3);
    }).not.toThrow();
  });

  it('should throw ForbiddenError when usage equals limit', () => {
    expect(() => {
      assertWithinLimit(entitlements, 'max_projects', 5);
    }).toThrow(ForbiddenError);
  });

  it('should throw ForbiddenError when usage exceeds limit', () => {
    expect(() => {
      assertWithinLimit(entitlements, 'max_projects', 10);
    }).toThrow(ForbiddenError);
  });

  it('should include usage details in error message', () => {
    expect(() => {
      assertWithinLimit(entitlements, 'max_projects', 5);
    }).toThrow("Limit exceeded for 'max_projects': 5/5");
  });

  it('should not throw when feature has no limit', () => {
    expect(() => {
      assertWithinLimit(entitlements, 'unlimited_feature', 999);
    }).not.toThrow();
  });

  it('should throw when feature is disabled', () => {
    expect(() => {
      assertWithinLimit(entitlements, 'disabled_feature', 0);
    }).toThrow(ForbiddenError);
  });

  it('should throw when feature does not exist', () => {
    expect(() => {
      assertWithinLimit(entitlements, 'nonexistent', 0);
    }).toThrow(ForbiddenError);
  });
});

// ============================================================================
// isEntitled
// ============================================================================

describe('isEntitled', () => {
  const entitlements: ResolvedEntitlements = {
    subscriptionState: 'active',
    features: {
      api_access: { enabled: true },
      beta_feature: { enabled: false },
    },
  };

  it('should return true for enabled feature', () => {
    expect(isEntitled(entitlements, 'api_access')).toBe(true);
  });

  it('should return false for disabled feature', () => {
    expect(isEntitled(entitlements, 'beta_feature')).toBe(false);
  });

  it('should return false for nonexistent feature', () => {
    expect(isEntitled(entitlements, 'nonexistent')).toBe(false);
  });
});

// ============================================================================
// hasActiveSubscription
// ============================================================================

describe('hasActiveSubscription', () => {
  it('should return true for "active"', () => {
    const entitlements: ResolvedEntitlements = {
      subscriptionState: 'active',
      features: {},
    };
    expect(hasActiveSubscription(entitlements)).toBe(true);
  });

  it('should return true for "trialing"', () => {
    const entitlements: ResolvedEntitlements = {
      subscriptionState: 'trialing',
      features: {},
    };
    expect(hasActiveSubscription(entitlements)).toBe(true);
  });

  it('should return false for "past_due"', () => {
    const entitlements: ResolvedEntitlements = {
      subscriptionState: 'past_due',
      features: {},
    };
    expect(hasActiveSubscription(entitlements)).toBe(false);
  });

  it('should return false for "canceled"', () => {
    const entitlements: ResolvedEntitlements = {
      subscriptionState: 'canceled',
      features: {},
    };
    expect(hasActiveSubscription(entitlements)).toBe(false);
  });

  it('should return false for "none"', () => {
    const entitlements: ResolvedEntitlements = {
      subscriptionState: 'none',
      features: {},
    };
    expect(hasActiveSubscription(entitlements)).toBe(false);
  });
});
