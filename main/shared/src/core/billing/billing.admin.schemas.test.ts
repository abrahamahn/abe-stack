// main/shared/src/core/billing/billing.admin.schemas.test.ts

/**
 * @file Billing Admin Schemas Tests
 * @description Comprehensive unit tests for admin-specific billing schemas.
 * @module Core/Billing/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  adminBillingStatsSchema,
  adminPlanResponseSchema,
  adminPlansListResponseSchema,
  adminPlanSchema,
  createPlanRequestSchema,
  syncStripeResponseSchema,
  updatePlanRequestSchema,
  type AdminBillingStats,
  type AdminPlan,
  type CreatePlanRequest,
  type SyncStripeResponse,
  type UpdatePlanRequest,
} from './billing.admin.schemas';

import type { PlanId } from '../../primitives/schema/ids';

// ============================================================================
// Test Fixtures
// ============================================================================

/** Valid base plan for extending with admin fields */
const validBasePlan = {
  id: 'pro_monthly' as PlanId,
  name: 'Pro Monthly',
  description: null,
  interval: 'month' as const,
  priceInCents: 999,
  currency: 'usd',
  features: [],
  trialDays: 0,
  isActive: true,
  sortOrder: 1,
};

/** Valid admin plan with provider IDs and timestamps */
const validAdminPlan: AdminPlan = {
  ...validBasePlan,
  stripePriceId: 'price_abc123',
  stripeProductId: 'prod_xyz789',
  paypalPlanId: 'P-1234567890',
  createdAt: '2024-01-15T10:30:00.000Z',
  updatedAt: '2024-01-20T14:45:00.000Z',
};

/** Valid limit-type plan feature */
const validLimitFeature = {
  key: 'projects:limit' as const,
  name: 'Project Limit',
  included: true,
  value: 10,
  description: 'Maximum number of projects',
};

/** Valid toggle-type plan feature */
const validToggleFeature = {
  key: 'api:access' as const,
  name: 'API Access',
  included: true,
  value: true,
  description: 'Access to REST API',
};

// ============================================================================
// adminPlanSchema Tests
// ============================================================================

describe('adminPlanSchema', () => {
  describe('when given valid admin plan', () => {
    it('should parse successfully with all provider IDs', () => {
      const result = adminPlanSchema.parse(validAdminPlan);

      expect(result).toEqual(validAdminPlan);
      expect(result.stripePriceId).toBe('price_abc123');
      expect(result.stripeProductId).toBe('prod_xyz789');
      expect(result.paypalPlanId).toBe('P-1234567890');
      expect(result.createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(result.updatedAt).toBe('2024-01-20T14:45:00.000Z');
    });

    it('should parse with null provider IDs', () => {
      const planWithNullProviders = {
        ...validBasePlan,
        stripePriceId: null,
        stripeProductId: null,
        paypalPlanId: null,
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      };

      const result = adminPlanSchema.parse(planWithNullProviders);

      expect(result.stripePriceId).toBeNull();
      expect(result.stripeProductId).toBeNull();
      expect(result.paypalPlanId).toBeNull();
    });

    it('should parse with description as string', () => {
      const planWithDescription = {
        ...validAdminPlan,
        description: 'Best plan for professionals',
      };

      const result = adminPlanSchema.parse(planWithDescription);

      expect(result.description).toBe('Best plan for professionals');
    });

    it('should parse with features array', () => {
      const planWithFeatures = {
        ...validAdminPlan,
        features: [validLimitFeature, validToggleFeature],
      };

      const result = adminPlanSchema.parse(planWithFeatures);

      expect(result.features).toHaveLength(2);
      expect(result.features[0]).toEqual(validLimitFeature);
      expect(result.features[1]).toEqual(validToggleFeature);
    });
  });

  describe('when given invalid input', () => {
    it('should reject missing required base plan fields', () => {
      const invalidPlan = {
        stripePriceId: 'price_abc123',
        stripeProductId: 'prod_xyz789',
        paypalPlanId: null,
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      };

      expect(() => adminPlanSchema.parse(invalidPlan)).toThrow();
    });

    it('should reject invalid createdAt timestamp', () => {
      const planWithInvalidDate = {
        ...validBasePlan,
        stripePriceId: null,
        stripeProductId: null,
        paypalPlanId: null,
        createdAt: 'not-a-date',
        updatedAt: '2024-01-15T10:30:00.000Z',
      };

      expect(() => adminPlanSchema.parse(planWithInvalidDate)).toThrow();
    });

    it('should reject invalid updatedAt timestamp', () => {
      const planWithInvalidDate = {
        ...validBasePlan,
        stripePriceId: null,
        stripeProductId: null,
        paypalPlanId: null,
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: 12345,
      };

      expect(() => adminPlanSchema.parse(planWithInvalidDate)).toThrow();
    });

    it('should reject non-string provider IDs', () => {
      const planWithInvalidProviderId = {
        ...validBasePlan,
        stripePriceId: 123,
        stripeProductId: null,
        paypalPlanId: null,
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      };

      expect(() => adminPlanSchema.parse(planWithInvalidProviderId)).toThrow();
    });
  });
});

// ============================================================================
// adminPlansListResponseSchema Tests
// ============================================================================

describe('adminPlansListResponseSchema', () => {
  describe('when given valid plans list', () => {
    it('should parse successfully with multiple plans', () => {
      const input = {
        plans: [
          validAdminPlan,
          {
            ...validAdminPlan,
            id: 'enterprise_yearly' as PlanId,
            name: 'Enterprise Yearly',
          },
        ],
      };

      const result = adminPlansListResponseSchema.parse(input);

      expect(result.plans).toHaveLength(2);
      expect(result.plans[0].id).toBe('pro_monthly');
      expect(result.plans[1].id).toBe('enterprise_yearly');
    });

    it('should parse successfully with empty plans array', () => {
      const input = { plans: [] };

      const result = adminPlansListResponseSchema.parse(input);

      expect(result.plans).toEqual([]);
    });
  });

  describe('when given invalid input', () => {
    it('should reject non-array plans field', () => {
      const input = { plans: 'not-an-array' };

      expect(() => adminPlansListResponseSchema.parse(input)).toThrow('plans must be an array');
    });

    it('should reject missing plans field', () => {
      const input = {};

      expect(() => adminPlansListResponseSchema.parse(input)).toThrow('plans must be an array');
    });

    it('should reject invalid plan in array', () => {
      const input = {
        plans: [{ invalid: 'plan' }],
      };

      expect(() => adminPlansListResponseSchema.parse(input)).toThrow();
    });
  });
});

// ============================================================================
// createPlanRequestSchema Tests
// ============================================================================

describe('createPlanRequestSchema', () => {
  describe('when given valid input', () => {
    it('should parse complete request with all fields', () => {
      const input: CreatePlanRequest = {
        name: 'Premium Plan',
        description: 'Our best plan for power users',
        interval: 'year',
        priceInCents: 9999,
        currency: 'usd',
        features: [validLimitFeature, validToggleFeature],
        trialDays: 14,
        isActive: true,
        sortOrder: 10,
      };

      const result = createPlanRequestSchema.parse(input);

      expect(result).toEqual(input);
    });

    it('should default features to empty array when omitted', () => {
      const input = {
        name: 'Basic Plan',
        interval: 'month',
        priceInCents: 499,
      };

      const result = createPlanRequestSchema.parse(input);

      expect(result.features).toEqual([]);
      expect(result.name).toBe('Basic Plan');
    });

    it('should default trialDays to 0 when omitted', () => {
      const input = {
        name: 'No Trial Plan',
        interval: 'month',
        priceInCents: 999,
      };

      const result = createPlanRequestSchema.parse(input);

      expect(result.trialDays).toBe(0);
    });

    it('should parse with optional fields omitted', () => {
      const input = {
        name: 'Simple Plan',
        interval: 'month',
        priceInCents: 599,
      };

      const result = createPlanRequestSchema.parse(input);

      expect(result.name).toBe('Simple Plan');
      expect(result.description).toBeUndefined();
      expect(result.currency).toBeUndefined();
      expect(result.isActive).toBeUndefined();
      expect(result.sortOrder).toBeUndefined();
    });

    it('should parse with currency exactly 3 characters', () => {
      const input = {
        name: 'Euro Plan',
        interval: 'month',
        priceInCents: 999,
        currency: 'eur',
      };

      const result = createPlanRequestSchema.parse(input);

      expect(result.currency).toBe('eur');
    });

    it('should parse with priceInCents at 0', () => {
      const input = {
        name: 'Free Plan',
        interval: 'month',
        priceInCents: 0,
      };

      const result = createPlanRequestSchema.parse(input);

      expect(result.priceInCents).toBe(0);
    });
  });

  describe('when given invalid input', () => {
    it('should reject missing name', () => {
      const input = {
        interval: 'month',
        priceInCents: 999,
      };

      expect(() => createPlanRequestSchema.parse(input)).toThrow();
    });

    it('should reject empty string name', () => {
      const input = {
        name: '',
        interval: 'month',
        priceInCents: 999,
      };

      expect(() => createPlanRequestSchema.parse(input)).toThrow();
    });

    it('should reject negative priceInCents', () => {
      const input = {
        name: 'Invalid Plan',
        interval: 'month',
        priceInCents: -100,
      };

      expect(() => createPlanRequestSchema.parse(input)).toThrow();
    });

    it('should reject invalid interval', () => {
      const input = {
        name: 'Invalid Plan',
        interval: 'weekly',
        priceInCents: 999,
      };

      expect(() => createPlanRequestSchema.parse(input)).toThrow();
    });

    it('should reject currency not exactly 3 characters', () => {
      const input = {
        name: 'Invalid Plan',
        interval: 'month',
        priceInCents: 999,
        currency: 'us',
      };

      expect(() => createPlanRequestSchema.parse(input)).toThrow();
    });

    it('should reject non-array features', () => {
      const input = {
        name: 'Invalid Plan',
        interval: 'month',
        priceInCents: 999,
        features: 'not-an-array',
      };

      expect(() => createPlanRequestSchema.parse(input)).toThrow('features must be an array');
    });

    it('should reject invalid feature in features array', () => {
      const input = {
        name: 'Invalid Plan',
        interval: 'month',
        priceInCents: 999,
        features: [{ invalid: 'feature' }],
      };

      expect(() => createPlanRequestSchema.parse(input)).toThrow();
    });
  });
});

// ============================================================================
// updatePlanRequestSchema Tests
// ============================================================================

describe('updatePlanRequestSchema', () => {
  describe('when given valid input', () => {
    it('should parse with all fields provided', () => {
      const input: UpdatePlanRequest = {
        name: 'Updated Plan',
        description: 'Updated description',
        interval: 'year',
        priceInCents: 7999,
        currency: 'eur',
        features: [validLimitFeature],
        trialDays: 30,
        isActive: false,
        sortOrder: 5,
      };

      const result = updatePlanRequestSchema.parse(input);

      expect(result).toEqual(input);
    });

    it('should parse with empty object (all fields optional)', () => {
      const input = {};

      const result = updatePlanRequestSchema.parse(input);

      expect(result).toEqual({});
    });

    it('should parse with null description explicitly', () => {
      const input = {
        description: null,
      };

      const result = updatePlanRequestSchema.parse(input);

      expect(result.description).toBeNull();
    });

    it('should parse with description as string', () => {
      const input = {
        description: 'New description',
      };

      const result = updatePlanRequestSchema.parse(input);

      expect(result.description).toBe('New description');
    });

    it('should parse with features array provided', () => {
      const input = {
        features: [validLimitFeature, validToggleFeature],
      };

      const result = updatePlanRequestSchema.parse(input);

      expect(result.features).toHaveLength(2);
    });

    it('should parse with empty features array', () => {
      const input = {
        features: [],
      };

      const result = updatePlanRequestSchema.parse(input);

      expect(result.features).toEqual([]);
    });

    it('should parse partial update with only name', () => {
      const input = {
        name: 'New Name',
      };

      const result = updatePlanRequestSchema.parse(input);

      expect(result.name).toBe('New Name');
      expect(result.description).toBeUndefined();
    });

    it('should parse partial update with only priceInCents', () => {
      const input = {
        priceInCents: 1299,
      };

      const result = updatePlanRequestSchema.parse(input);

      expect(result.priceInCents).toBe(1299);
    });
  });

  describe('when given invalid input', () => {
    it('should reject empty string name', () => {
      const input = {
        name: '',
      };

      expect(() => updatePlanRequestSchema.parse(input)).toThrow();
    });

    it('should reject negative priceInCents', () => {
      const input = {
        priceInCents: -500,
      };

      expect(() => updatePlanRequestSchema.parse(input)).toThrow();
    });

    it('should reject invalid interval', () => {
      const input = {
        interval: 'daily',
      };

      expect(() => updatePlanRequestSchema.parse(input)).toThrow();
    });

    it('should reject currency not exactly 3 characters', () => {
      const input = {
        currency: 'usda',
      };

      expect(() => updatePlanRequestSchema.parse(input)).toThrow();
    });

    it('should reject non-array features', () => {
      const input = {
        features: 'invalid',
      };

      expect(() => updatePlanRequestSchema.parse(input)).toThrow('features must be an array');
    });

    it('should reject invalid feature in features array', () => {
      const input = {
        features: [{ key: 'invalid:key', name: 'test', included: true }],
      };

      expect(() => updatePlanRequestSchema.parse(input)).toThrow();
    });
  });
});

// ============================================================================
// adminPlanResponseSchema Tests
// ============================================================================

describe('adminPlanResponseSchema', () => {
  describe('when given valid input', () => {
    it('should parse successfully with valid plan', () => {
      const input = {
        plan: validAdminPlan,
      };

      const result = adminPlanResponseSchema.parse(input);

      expect(result.plan).toEqual(validAdminPlan);
    });
  });

  describe('when given invalid input', () => {
    it('should reject missing plan field', () => {
      const input = {};

      expect(() => adminPlanResponseSchema.parse(input)).toThrow();
    });

    it('should reject invalid plan object', () => {
      const input = {
        plan: { invalid: 'plan' },
      };

      expect(() => adminPlanResponseSchema.parse(input)).toThrow();
    });
  });
});

// ============================================================================
// syncStripeResponseSchema Tests
// ============================================================================

describe('syncStripeResponseSchema', () => {
  describe('when given valid input', () => {
    it('should parse successfully with all fields', () => {
      const input: SyncStripeResponse = {
        success: true,
        stripePriceId: 'price_abc123',
        stripeProductId: 'prod_xyz789',
      };

      const result = syncStripeResponseSchema.parse(input);

      expect(result).toEqual(input);
      expect(result.success).toBe(true);
      expect(result.stripePriceId).toBe('price_abc123');
      expect(result.stripeProductId).toBe('prod_xyz789');
    });

    it('should parse with success false', () => {
      const input = {
        success: false,
        stripePriceId: 'price_123',
        stripeProductId: 'prod_456',
      };

      const result = syncStripeResponseSchema.parse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('when given invalid input', () => {
    it('should reject missing success field', () => {
      const input = {
        stripePriceId: 'price_abc123',
        stripeProductId: 'prod_xyz789',
      };

      expect(() => syncStripeResponseSchema.parse(input)).toThrow();
    });

    it('should reject non-boolean success', () => {
      const input = {
        success: 'true',
        stripePriceId: 'price_abc123',
        stripeProductId: 'prod_xyz789',
      };

      expect(() => syncStripeResponseSchema.parse(input)).toThrow();
    });

    it('should reject missing stripePriceId', () => {
      const input = {
        success: true,
        stripeProductId: 'prod_xyz789',
      };

      expect(() => syncStripeResponseSchema.parse(input)).toThrow();
    });

    it('should reject missing stripeProductId', () => {
      const input = {
        success: true,
        stripePriceId: 'price_abc123',
      };

      expect(() => syncStripeResponseSchema.parse(input)).toThrow();
    });

    it('should reject non-string stripePriceId', () => {
      const input = {
        success: true,
        stripePriceId: 123,
        stripeProductId: 'prod_xyz789',
      };

      expect(() => syncStripeResponseSchema.parse(input)).toThrow();
    });
  });
});

// ============================================================================
// adminBillingStatsSchema Tests
// ============================================================================

describe('adminBillingStatsSchema', () => {
  describe('when given valid input', () => {
    it('should parse successfully with all numeric fields', () => {
      const input: AdminBillingStats = {
        totalRevenue: 125000.5,
        activeSubscriptions: 342,
        churnRate: 2.5,
        mrr: 12500.0,
      };

      const result = adminBillingStatsSchema.parse(input);

      expect(result).toEqual(input);
      expect(result.totalRevenue).toBe(125000.5);
      expect(result.activeSubscriptions).toBe(342);
      expect(result.churnRate).toBe(2.5);
      expect(result.mrr).toBe(12500.0);
    });

    it('should parse with zero values', () => {
      const input = {
        totalRevenue: 0,
        activeSubscriptions: 0,
        churnRate: 0,
        mrr: 0,
      };

      const result = adminBillingStatsSchema.parse(input);

      expect(result.totalRevenue).toBe(0);
      expect(result.activeSubscriptions).toBe(0);
      expect(result.churnRate).toBe(0);
      expect(result.mrr).toBe(0);
    });

    it('should parse with negative churnRate', () => {
      const input = {
        totalRevenue: 100000,
        activeSubscriptions: 500,
        churnRate: -1.2,
        mrr: 10000,
      };

      const result = adminBillingStatsSchema.parse(input);

      expect(result.churnRate).toBe(-1.2);
    });

    it('should parse with large numbers', () => {
      const input = {
        totalRevenue: 9999999.99,
        activeSubscriptions: 10000,
        churnRate: 99.99,
        mrr: 999999.99,
      };

      const result = adminBillingStatsSchema.parse(input);

      expect(result.totalRevenue).toBe(9999999.99);
      expect(result.activeSubscriptions).toBe(10000);
    });
  });

  describe('when given invalid input', () => {
    it('should reject missing totalRevenue', () => {
      const input = {
        activeSubscriptions: 100,
        churnRate: 2.5,
        mrr: 5000,
      };

      expect(() => adminBillingStatsSchema.parse(input)).toThrow();
    });

    it('should reject non-number totalRevenue', () => {
      const input = {
        totalRevenue: '100000',
        activeSubscriptions: 100,
        churnRate: 2.5,
        mrr: 5000,
      };

      expect(() => adminBillingStatsSchema.parse(input)).toThrow();
    });

    it('should reject non-number activeSubscriptions', () => {
      const input = {
        totalRevenue: 100000,
        activeSubscriptions: '100',
        churnRate: 2.5,
        mrr: 5000,
      };

      expect(() => adminBillingStatsSchema.parse(input)).toThrow();
    });

    it('should reject non-number churnRate', () => {
      const input = {
        totalRevenue: 100000,
        activeSubscriptions: 100,
        churnRate: null,
        mrr: 5000,
      };

      expect(() => adminBillingStatsSchema.parse(input)).toThrow();
    });

    it('should reject non-number mrr', () => {
      const input = {
        totalRevenue: 100000,
        activeSubscriptions: 100,
        churnRate: 2.5,
        mrr: undefined,
      };

      expect(() => adminBillingStatsSchema.parse(input)).toThrow();
    });

    it('should reject missing multiple fields', () => {
      const input = {
        totalRevenue: 100000,
      };

      expect(() => adminBillingStatsSchema.parse(input)).toThrow();
    });

    it('should reject empty object', () => {
      const input = {};

      expect(() => adminBillingStatsSchema.parse(input)).toThrow();
    });
  });
});
