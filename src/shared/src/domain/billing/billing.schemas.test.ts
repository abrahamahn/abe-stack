// shared/src/domain/billing/billing.schemas.test.ts

/**
 * @file Billing Schemas Unit Tests
 * @description Comprehensive tests for billing schemas: plans, subscriptions, invoices, and payment methods.
 * Tests validate parsing logic, type constraints, enum validation, and edge cases.
 * @module Domain/Billing/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  cancelSubscriptionRequestSchema,
  checkoutRequestSchema,
  invoiceSchema,
  planFeatureSchema,
  planSchema,
  subscriptionSchema,
} from './billing.schemas';

import type {
  CancelSubscriptionRequest,
  CheckoutRequest,
  Invoice,
  Plan,
  PlanFeature,
  Subscription,
} from './billing.schemas';

// ============================================================================
// Test Data Helpers
// ============================================================================

const VALID_USER_ID = '00000000-0000-0000-0000-000000000001';
const VALID_PLAN_ID = 'pro_monthly';
const VALID_SUBSCRIPTION_ID = 'sub_123';

/**
 * Create a valid limit feature for testing.
 * @returns Valid limit-type feature with projects limit
 */
function createValidLimitFeature(): PlanFeature {
  return {
    key: 'projects:limit',
    name: 'Projects',
    included: true,
    value: 10,
    description: 'Maximum number of projects',
  };
}

/**
 * Create a valid toggle feature for testing.
 * @returns Valid toggle-type feature with team invite
 */
function createValidToggleFeature(): PlanFeature {
  return {
    key: 'team:invite',
    name: 'Team Members',
    included: true,
    value: true,
    description: 'Invite team members',
  };
}

/**
 * Create a valid plan for testing.
 * @returns Complete valid Plan object
 */
function createValidPlan(): Plan {
  return {
    id: VALID_PLAN_ID as Plan['id'],
    name: 'Pro Plan',
    description: 'Professional plan with advanced features',
    interval: 'month',
    priceInCents: 2999,
    currency: 'USD',
    features: [createValidLimitFeature(), createValidToggleFeature()],
    trialDays: 14,
    isActive: true,
    sortOrder: 1,
  };
}

/**
 * Create a valid subscription for testing.
 * @returns Complete valid Subscription object
 */
function createValidSubscription(): Subscription {
  return {
    id: VALID_SUBSCRIPTION_ID as Subscription['id'],
    userId: VALID_USER_ID as Subscription['userId'],
    planId: VALID_PLAN_ID as Subscription['planId'],
    plan: createValidPlan(),
    provider: 'stripe',
    status: 'active',
    currentPeriodStart: '2024-01-01T00:00:00Z',
    currentPeriodEnd: '2024-02-01T00:00:00Z',
    cancelAtPeriodEnd: false,
    canceledAt: null,
    trialEnd: null,
    createdAt: '2024-01-01T00:00:00Z',
  };
}

/**
 * Create a valid invoice for testing.
 * @returns Complete valid Invoice object
 */
function createValidInvoice(): Invoice {
  return {
    id: 'inv_123',
    status: 'paid',
    amountDue: 2999,
    amountPaid: 2999,
    currency: 'USD',
    periodStart: '2024-01-01T00:00:00Z',
    periodEnd: '2024-02-01T00:00:00Z',
    paidAt: '2024-01-01T00:00:00Z',
    invoicePdfUrl: 'https://example.com/invoice.pdf',
    createdAt: '2024-01-01T00:00:00Z',
  };
}

// ============================================================================
// planFeatureSchema Tests
// ============================================================================

describe('planFeatureSchema', () => {
  describe('limit features', () => {
    it('should parse valid projects limit feature', () => {
      const input: PlanFeature = {
        key: 'projects:limit',
        name: 'Projects',
        included: true,
        value: 10,
      };

      const result = planFeatureSchema.parse(input);

      expect(result).toEqual(input);
      expect(result.key).toBe('projects:limit');
      expect(result.value).toBe(10);
    });

    it('should parse valid storage limit feature', () => {
      const input: PlanFeature = {
        key: 'storage:limit',
        name: 'Storage',
        included: true,
        value: 100,
        description: '100GB storage',
      };

      const result = planFeatureSchema.parse(input);

      expect(result).toEqual(input);
      expect(result.key).toBe('storage:limit');
      expect(result.value).toBe(100);
    });

    it('should parse limit feature with description', () => {
      const input = createValidLimitFeature();

      const result = planFeatureSchema.parse(input);

      expect(result.description).toBe('Maximum number of projects');
    });

    it('should reject limit feature without numeric value', () => {
      const input = {
        key: 'projects:limit',
        name: 'Projects',
        included: true,
        value: 'not-a-number',
      };

      expect(() => planFeatureSchema.parse(input)).toThrow('value must be a number');
    });

    it('should reject limit feature with boolean value', () => {
      const input = {
        key: 'projects:limit',
        name: 'Projects',
        included: true,
        value: true,
      };

      expect(() => planFeatureSchema.parse(input)).toThrow('value must be a number');
    });
  });

  describe('toggle features', () => {
    it('should parse valid team invite toggle feature', () => {
      const input: PlanFeature = {
        key: 'team:invite',
        name: 'Team Members',
        included: true,
        value: true,
      };

      const result = planFeatureSchema.parse(input);

      expect(result).toEqual(input);
      expect(result.key).toBe('team:invite');
      expect(result.value).toBe(true);
    });

    it('should parse valid API access toggle feature', () => {
      const input: PlanFeature = {
        key: 'api:access',
        name: 'API Access',
        included: true,
        value: false,
      };

      const result = planFeatureSchema.parse(input);

      expect(result.key).toBe('api:access');
      expect(result.value).toBe(false);
    });

    it('should parse valid custom branding toggle feature', () => {
      const input: PlanFeature = {
        key: 'branding:custom',
        name: 'Custom Branding',
        included: false,
        value: undefined,
      };

      const result = planFeatureSchema.parse(input);

      expect(result.key).toBe('branding:custom');
      expect(result.value).toBeUndefined();
    });

    it('should parse toggle feature without value', () => {
      const input: PlanFeature = {
        key: 'team:invite',
        name: 'Team Members',
        included: true,
      };

      const result = planFeatureSchema.parse(input);

      expect(result.value).toBeUndefined();
    });

    it('should parse toggle feature with description', () => {
      const input = createValidToggleFeature();

      const result = planFeatureSchema.parse(input);

      expect(result.description).toBe('Invite team members');
    });
  });

  describe('validation errors', () => {
    it('should reject feature with unknown key', () => {
      const input = {
        key: 'unknown:feature',
        name: 'Unknown',
        included: true,
        value: 10,
      };

      expect(() => planFeatureSchema.parse(input)).toThrow();
    });

    it('should reject feature without key', () => {
      const input = {
        name: 'Projects',
        included: true,
        value: 10,
      };

      expect(() => planFeatureSchema.parse(input)).toThrow();
    });

    it('should reject feature without name', () => {
      const input = {
        key: 'projects:limit',
        included: true,
        value: 10,
      };

      expect(() => planFeatureSchema.parse(input)).toThrow('name must be a string');
    });

    it('should reject feature without included flag', () => {
      const input = {
        key: 'projects:limit',
        name: 'Projects',
        value: 10,
      };

      expect(() => planFeatureSchema.parse(input)).toThrow('included must be a boolean');
    });

    it('should reject feature with invalid included type', () => {
      const input = {
        key: 'projects:limit',
        name: 'Projects',
        included: 'yes',
        value: 10,
      };

      expect(() => planFeatureSchema.parse(input)).toThrow('included must be a boolean');
    });

    it('should reject non-object input', () => {
      expect(() => planFeatureSchema.parse(null)).toThrow();
      expect(() => planFeatureSchema.parse('string')).toThrow();
      expect(() => planFeatureSchema.parse(123)).toThrow();
    });
  });
});

// ============================================================================
// planSchema Tests
// ============================================================================

describe('planSchema', () => {
  describe('valid plans', () => {
    it('should parse valid monthly plan', () => {
      const input = createValidPlan();

      const result = planSchema.parse(input);

      expect(result).toEqual(input);
      expect(result.id).toBe(VALID_PLAN_ID);
      expect(result.interval).toBe('month');
    });

    it('should parse valid yearly plan', () => {
      const input: Plan = {
        ...createValidPlan(),
        interval: 'year',
        priceInCents: 29990,
      };

      const result = planSchema.parse(input);

      expect(result.interval).toBe('year');
      expect(result.priceInCents).toBe(29990);
    });

    it('should parse plan with null description', () => {
      const input: Plan = {
        ...createValidPlan(),
        description: null,
      };

      const result = planSchema.parse(input);

      expect(result.description).toBeNull();
    });

    it('should parse plan with empty features array', () => {
      const input: Plan = {
        ...createValidPlan(),
        features: [],
      };

      const result = planSchema.parse(input);

      expect(result.features).toEqual([]);
    });

    it('should parse plan with zero trial days', () => {
      const input: Plan = {
        ...createValidPlan(),
        trialDays: 0,
      };

      const result = planSchema.parse(input);

      expect(result.trialDays).toBe(0);
    });

    it('should parse inactive plan', () => {
      const input: Plan = {
        ...createValidPlan(),
        isActive: false,
      };

      const result = planSchema.parse(input);

      expect(result.isActive).toBe(false);
    });

    it('should parse free plan with zero price', () => {
      const input: Plan = {
        ...createValidPlan(),
        priceInCents: 0,
      };

      const result = planSchema.parse(input);

      expect(result.priceInCents).toBe(0);
    });

    it('should parse plan with multiple features', () => {
      const input: Plan = {
        ...createValidPlan(),
        features: [
          { key: 'projects:limit', name: 'Projects', included: true, value: 10 },
          { key: 'storage:limit', name: 'Storage', included: true, value: 100 },
          { key: 'team:invite', name: 'Team', included: true, value: true },
          { key: 'api:access', name: 'API', included: false, value: false },
          { key: 'branding:custom', name: 'Branding', included: false },
        ],
      };

      const result = planSchema.parse(input);

      expect(result.features).toHaveLength(5);
    });
  });

  describe('validation errors', () => {
    it('should reject plan with negative price', () => {
      const input = {
        ...createValidPlan(),
        priceInCents: -100,
      };

      expect(() => planSchema.parse(input)).toThrow('priceInCents must be at least 0');
    });

    it('should reject plan with invalid currency length', () => {
      const input = {
        ...createValidPlan(),
        currency: 'US',
      };

      expect(() => planSchema.parse(input)).toThrow('currency must be exactly 3 characters');
    });

    it('should reject plan with too long currency', () => {
      const input = {
        ...createValidPlan(),
        currency: 'USDD',
      };

      expect(() => planSchema.parse(input)).toThrow('currency must be exactly 3 characters');
    });

    it('should reject plan with invalid interval', () => {
      const input = {
        ...createValidPlan(),
        interval: 'week',
      };

      expect(() => planSchema.parse(input)).toThrow();
    });

    it('should reject plan with non-array features', () => {
      const input = {
        ...createValidPlan(),
        features: 'not-an-array',
      };

      expect(() => planSchema.parse(input)).toThrow('features must be an array');
    });

    it('should reject plan with invalid feature in array', () => {
      const input = {
        ...createValidPlan(),
        features: [{ key: 'invalid:key', name: 'Invalid', included: true }],
      };

      expect(() => planSchema.parse(input)).toThrow();
    });

    it('should reject plan with negative trial days', () => {
      const input = {
        ...createValidPlan(),
        trialDays: -5,
      };

      expect(() => planSchema.parse(input)).toThrow('trialDays must be at least 0');
    });

    it('should reject plan without required fields', () => {
      expect(() => planSchema.parse({})).toThrow();
    });

    it('should reject plan with invalid id type', () => {
      const input = {
        ...createValidPlan(),
        id: 123,
      };

      expect(() => planSchema.parse(input)).toThrow();
    });

    it('should reject plan with empty string id', () => {
      const input = {
        ...createValidPlan(),
        id: '',
      };

      expect(() => planSchema.parse(input)).toThrow();
    });

    it('should reject non-object input', () => {
      expect(() => planSchema.parse(null)).toThrow();
      expect(() => planSchema.parse('string')).toThrow();
      expect(() => planSchema.parse([])).toThrow();
    });
  });
});

// ============================================================================
// subscriptionSchema Tests
// ============================================================================

describe('subscriptionSchema', () => {
  describe('valid subscriptions', () => {
    it('should parse valid active subscription', () => {
      const input = createValidSubscription();

      const result = subscriptionSchema.parse(input);

      expect(result).toEqual(input);
      expect(result.id).toBe(VALID_SUBSCRIPTION_ID);
      expect(result.status).toBe('active');
    });

    it('should parse subscription with nested plan', () => {
      const input = createValidSubscription();

      const result = subscriptionSchema.parse(input);

      expect(result.plan).toEqual(input.plan);
      expect(result.plan.id).toBe(VALID_PLAN_ID);
    });

    it('should parse subscription with all status values', () => {
      const statuses = [
        'active',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'past_due',
        'paused',
        'trialing',
        'unpaid',
      ] as const;

      statuses.forEach((status) => {
        const input: Subscription = {
          ...createValidSubscription(),
          status,
        };

        const result = subscriptionSchema.parse(input);
        expect(result.status).toBe(status);
      });
    });

    it('should parse subscription with stripe provider', () => {
      const input: Subscription = {
        ...createValidSubscription(),
        provider: 'stripe',
      };

      const result = subscriptionSchema.parse(input);

      expect(result.provider).toBe('stripe');
    });

    it('should parse subscription with paypal provider', () => {
      const input: Subscription = {
        ...createValidSubscription(),
        provider: 'paypal',
      };

      const result = subscriptionSchema.parse(input);

      expect(result.provider).toBe('paypal');
    });

    it('should parse subscription with canceledAt timestamp', () => {
      const input: Subscription = {
        ...createValidSubscription(),
        status: 'canceled',
        canceledAt: '2024-01-15T00:00:00Z',
      };

      const result = subscriptionSchema.parse(input);

      expect(result.canceledAt).toBe('2024-01-15T00:00:00Z');
    });

    it('should parse subscription with null canceledAt', () => {
      const input = createValidSubscription();

      const result = subscriptionSchema.parse(input);

      expect(result.canceledAt).toBeNull();
    });

    it('should parse subscription with trialEnd timestamp', () => {
      const input: Subscription = {
        ...createValidSubscription(),
        status: 'trialing',
        trialEnd: '2024-01-15T00:00:00Z',
      };

      const result = subscriptionSchema.parse(input);

      expect(result.trialEnd).toBe('2024-01-15T00:00:00Z');
    });

    it('should parse subscription with null trialEnd', () => {
      const input = createValidSubscription();

      const result = subscriptionSchema.parse(input);

      expect(result.trialEnd).toBeNull();
    });

    it('should parse subscription with cancelAtPeriodEnd true', () => {
      const input: Subscription = {
        ...createValidSubscription(),
        cancelAtPeriodEnd: true,
      };

      const result = subscriptionSchema.parse(input);

      expect(result.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('should reject subscription with invalid status', () => {
      const input = {
        ...createValidSubscription(),
        status: 'invalid_status',
      };

      expect(() => subscriptionSchema.parse(input)).toThrow();
    });

    it('should reject subscription with invalid provider', () => {
      const input = {
        ...createValidSubscription(),
        provider: 'unknown',
      };

      expect(() => subscriptionSchema.parse(input)).toThrow();
    });

    it('should reject subscription with invalid userId', () => {
      const input = {
        ...createValidSubscription(),
        userId: 'not-a-uuid',
      };

      expect(() => subscriptionSchema.parse(input)).toThrow();
    });

    it('should reject subscription with empty userId', () => {
      const input = {
        ...createValidSubscription(),
        userId: '',
      };

      expect(() => subscriptionSchema.parse(input)).toThrow();
    });

    it('should reject subscription with invalid planId', () => {
      const input = {
        ...createValidSubscription(),
        planId: '',
      };

      expect(() => subscriptionSchema.parse(input)).toThrow();
    });

    it('should reject subscription with invalid subscriptionId', () => {
      const input = {
        ...createValidSubscription(),
        id: '',
      };

      expect(() => subscriptionSchema.parse(input)).toThrow();
    });

    it('should reject subscription with invalid date format', () => {
      const input = {
        ...createValidSubscription(),
        currentPeriodStart: 'not-a-date',
      };

      expect(() => subscriptionSchema.parse(input)).toThrow();
    });

    it('should reject subscription with invalid nested plan', () => {
      const input = {
        ...createValidSubscription(),
        plan: { id: 'invalid' },
      };

      expect(() => subscriptionSchema.parse(input)).toThrow();
    });

    it('should reject subscription without required fields', () => {
      expect(() => subscriptionSchema.parse({})).toThrow();
    });

    it('should reject non-object input', () => {
      expect(() => subscriptionSchema.parse(null)).toThrow();
      expect(() => subscriptionSchema.parse('string')).toThrow();
    });
  });
});

// ============================================================================
// checkoutRequestSchema Tests
// ============================================================================

describe('checkoutRequestSchema', () => {
  describe('valid requests', () => {
    it('should parse checkout request with only planId', () => {
      const input: CheckoutRequest = {
        planId: VALID_PLAN_ID as CheckoutRequest['planId'],
      };

      const result = checkoutRequestSchema.parse(input);

      expect(result).toEqual(input);
      expect(result.planId).toBe(VALID_PLAN_ID);
      expect(result.successUrl).toBeUndefined();
      expect(result.cancelUrl).toBeUndefined();
    });

    it('should parse checkout request with successUrl', () => {
      const input: CheckoutRequest = {
        planId: VALID_PLAN_ID as CheckoutRequest['planId'],
        successUrl: 'https://example.com/success',
      };

      const result = checkoutRequestSchema.parse(input);

      expect(result.successUrl).toBe('https://example.com/success');
    });

    it('should parse checkout request with cancelUrl', () => {
      const input: CheckoutRequest = {
        planId: VALID_PLAN_ID as CheckoutRequest['planId'],
        cancelUrl: 'https://example.com/cancel',
      };

      const result = checkoutRequestSchema.parse(input);

      expect(result.cancelUrl).toBe('https://example.com/cancel');
    });

    it('should parse checkout request with both URLs', () => {
      const input: CheckoutRequest = {
        planId: VALID_PLAN_ID as CheckoutRequest['planId'],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const result = checkoutRequestSchema.parse(input);

      expect(result.successUrl).toBe('https://example.com/success');
      expect(result.cancelUrl).toBe('https://example.com/cancel');
    });

    it('should parse checkout request with undefined URLs', () => {
      const input: CheckoutRequest = {
        planId: VALID_PLAN_ID as CheckoutRequest['planId'],
        successUrl: undefined,
        cancelUrl: undefined,
      };

      const result = checkoutRequestSchema.parse(input);

      expect(result.successUrl).toBeUndefined();
      expect(result.cancelUrl).toBeUndefined();
    });
  });

  describe('validation errors', () => {
    it('should reject checkout request without planId', () => {
      const input = {};

      expect(() => checkoutRequestSchema.parse(input)).toThrow();
    });

    it('should reject checkout request with empty planId', () => {
      const input = {
        planId: '',
      };

      expect(() => checkoutRequestSchema.parse(input)).toThrow();
    });

    it('should reject checkout request with invalid successUrl type', () => {
      const input = {
        planId: VALID_PLAN_ID,
        successUrl: 123,
      };

      expect(() => checkoutRequestSchema.parse(input)).toThrow();
    });

    it('should reject checkout request with invalid cancelUrl type', () => {
      const input = {
        planId: VALID_PLAN_ID,
        cancelUrl: false,
      };

      expect(() => checkoutRequestSchema.parse(input)).toThrow();
    });

    it('should reject non-object input', () => {
      expect(() => checkoutRequestSchema.parse(null)).toThrow();
      expect(() => checkoutRequestSchema.parse('string')).toThrow();
    });
  });
});

// ============================================================================
// cancelSubscriptionRequestSchema Tests
// ============================================================================

describe('cancelSubscriptionRequestSchema', () => {
  describe('valid requests', () => {
    it('should parse cancel request with immediately true', () => {
      const input: CancelSubscriptionRequest = {
        immediately: true,
      };

      const result = cancelSubscriptionRequestSchema.parse(input);

      expect(result.immediately).toBe(true);
    });

    it('should parse cancel request with immediately false', () => {
      const input: CancelSubscriptionRequest = {
        immediately: false,
      };

      const result = cancelSubscriptionRequestSchema.parse(input);

      expect(result.immediately).toBe(false);
    });

    it('should default immediately to false when undefined', () => {
      const input = {};

      const result = cancelSubscriptionRequestSchema.parse(input);

      expect(result.immediately).toBe(false);
    });

    it('should default immediately to false when field missing', () => {
      const input = { someOtherField: 'value' };

      const result = cancelSubscriptionRequestSchema.parse(input);

      expect(result.immediately).toBe(false);
    });
  });

  describe('validation errors', () => {
    it('should reject cancel request with non-boolean immediately', () => {
      const input = {
        immediately: 'yes',
      };

      expect(() => cancelSubscriptionRequestSchema.parse(input)).toThrow(
        'immediately must be a boolean',
      );
    });

    it('should reject cancel request with numeric immediately', () => {
      const input = {
        immediately: 1,
      };

      expect(() => cancelSubscriptionRequestSchema.parse(input)).toThrow(
        'immediately must be a boolean',
      );
    });

    it('should handle null as empty object and default immediately', () => {
      const result = cancelSubscriptionRequestSchema.parse(null);
      expect(result.immediately).toBe(false);
    });

    it('should handle string input as empty object and default immediately', () => {
      const result = cancelSubscriptionRequestSchema.parse('string');
      expect(result.immediately).toBe(false);
    });

    it('should handle primitive inputs as empty objects and default immediately', () => {
      expect(cancelSubscriptionRequestSchema.parse(123).immediately).toBe(false);
      expect(cancelSubscriptionRequestSchema.parse(true).immediately).toBe(false);
    });
  });
});

// ============================================================================
// invoiceSchema Tests
// ============================================================================

describe('invoiceSchema', () => {
  describe('valid invoices', () => {
    it('should parse valid paid invoice', () => {
      const input = createValidInvoice();

      const result = invoiceSchema.parse(input);

      expect(result).toEqual(input);
      expect(result.id).toBe('inv_123');
      expect(result.status).toBe('paid');
    });

    it('should parse invoice with all status values', () => {
      const statuses = ['draft', 'open', 'paid', 'void', 'uncollectible'] as const;

      statuses.forEach((status) => {
        const input: Invoice = {
          ...createValidInvoice(),
          status,
        };

        const result = invoiceSchema.parse(input);
        expect(result.status).toBe(status);
      });
    });

    it('should parse invoice with null paidAt', () => {
      const input: Invoice = {
        ...createValidInvoice(),
        status: 'open',
        paidAt: null,
      };

      const result = invoiceSchema.parse(input);

      expect(result.paidAt).toBeNull();
    });

    it('should parse invoice with null invoicePdfUrl', () => {
      const input: Invoice = {
        ...createValidInvoice(),
        invoicePdfUrl: null,
      };

      const result = invoiceSchema.parse(input);

      expect(result.invoicePdfUrl).toBeNull();
    });

    it('should parse invoice with zero amounts', () => {
      const input: Invoice = {
        ...createValidInvoice(),
        amountDue: 0,
        amountPaid: 0,
      };

      const result = invoiceSchema.parse(input);

      expect(result.amountDue).toBe(0);
      expect(result.amountPaid).toBe(0);
    });

    it('should parse invoice with different currencies', () => {
      const currencies = ['USD', 'EUR', 'GBP', 'JPY'];

      currencies.forEach((currency) => {
        const input: Invoice = {
          ...createValidInvoice(),
          currency,
        };

        const result = invoiceSchema.parse(input);
        expect(result.currency).toBe(currency);
      });
    });

    it('should parse invoice with partial payment', () => {
      const input: Invoice = {
        ...createValidInvoice(),
        status: 'open',
        amountDue: 2999,
        amountPaid: 1500,
      };

      const result = invoiceSchema.parse(input);

      expect(result.amountDue).toBe(2999);
      expect(result.amountPaid).toBe(1500);
    });
  });

  describe('validation errors', () => {
    it('should reject invoice with invalid status', () => {
      const input = {
        ...createValidInvoice(),
        status: 'invalid_status',
      };

      expect(() => invoiceSchema.parse(input)).toThrow();
    });

    it('should reject invoice with invalid currency length', () => {
      const input = {
        ...createValidInvoice(),
        currency: 'US',
      };

      expect(() => invoiceSchema.parse(input)).toThrow('currency must be exactly 3 characters');
    });

    it('should reject invoice with invalid date format', () => {
      const input = {
        ...createValidInvoice(),
        periodStart: 'not-a-date',
      };

      expect(() => invoiceSchema.parse(input)).toThrow();
    });

    it('should reject invoice with invalid amountDue type', () => {
      const input = {
        ...createValidInvoice(),
        amountDue: 'not-a-number',
      };

      expect(() => invoiceSchema.parse(input)).toThrow('amountDue must be a number');
    });

    it('should reject invoice with invalid amountPaid type', () => {
      const input = {
        ...createValidInvoice(),
        amountPaid: true,
      };

      expect(() => invoiceSchema.parse(input)).toThrow('amountPaid must be a number');
    });

    it('should reject invoice without id', () => {
      const input = {
        ...createValidInvoice(),
        id: undefined,
      };

      expect(() => invoiceSchema.parse(input)).toThrow();
    });

    it('should accept invoice with empty string id', () => {
      const input = {
        ...createValidInvoice(),
        id: '',
      };

      const result = invoiceSchema.parse(input);

      expect(result.id).toBe('');
    });

    it('should reject invoice without required fields', () => {
      expect(() => invoiceSchema.parse({})).toThrow();
    });

    it('should reject non-object input', () => {
      expect(() => invoiceSchema.parse(null)).toThrow();
      expect(() => invoiceSchema.parse('string')).toThrow();
      expect(() => invoiceSchema.parse([])).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle very large amounts', () => {
      const input: Invoice = {
        ...createValidInvoice(),
        amountDue: 999999999,
        amountPaid: 999999999,
      };

      const result = invoiceSchema.parse(input);

      expect(result.amountDue).toBe(999999999);
      expect(result.amountPaid).toBe(999999999);
    });

    it('should handle negative amounts for refunds', () => {
      const input: Invoice = {
        ...createValidInvoice(),
        amountDue: -2999,
        amountPaid: -2999,
      };

      const result = invoiceSchema.parse(input);

      expect(result.amountDue).toBe(-2999);
      expect(result.amountPaid).toBe(-2999);
    });

    it('should parse invoice with both nullable fields as null', () => {
      const input: Invoice = {
        ...createValidInvoice(),
        paidAt: null,
        invoicePdfUrl: null,
      };

      const result = invoiceSchema.parse(input);

      expect(result.paidAt).toBeNull();
      expect(result.invoicePdfUrl).toBeNull();
    });
  });
});
