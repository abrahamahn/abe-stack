// packages/shared/src/contracts/billing/billing.test.ts
/**
 * Billing Contract Schema Tests
 *
 * Comprehensive validation tests for billing schemas including plans,
 * subscriptions, invoices, payment methods, and admin operations.
 */

import { describe, expect, it } from 'vitest';

import {
  addPaymentMethodRequestSchema,
  adminPlanResponseSchema,
  adminPlanSchema,
  adminPlansListResponseSchema,
  cancelSubscriptionRequestSchema,
  checkoutRequestSchema,
  checkoutResponseSchema,
  createPlanRequestSchema,
  emptyBillingBodySchema,
  invoiceSchema,
  invoicesListResponseSchema,
  paymentMethodResponseSchema,
  paymentMethodSchema,
  paymentMethodsListResponseSchema,
  planSchema,
  plansListResponseSchema,
  setupIntentResponseSchema,
  subscriptionActionResponseSchema,
  subscriptionResponseSchema,
  subscriptionSchema,
  syncStripeResponseSchema,
  updatePlanRequestSchema,
  updateSubscriptionRequestSchema,
} from './billing';

describe('planSchema', () => {
  const validPlan = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Pro Plan',
    description: 'Professional tier',
    interval: 'month' as const,
    priceInCents: 1999,
    currency: 'usd',
    features: [{ name: 'Feature 1', included: true }],
    trialDays: 14,
    isActive: true,
    sortOrder: 1,
  };

  it('should validate a complete plan', () => {
    const result = planSchema.parse(validPlan);
    expect(result).toEqual(validPlan);
  });

  it('should accept null description', () => {
    const plan = { ...validPlan, description: null };
    const result = planSchema.parse(plan);
    expect(result.description).toBeNull();
  });

  it('should validate year interval', () => {
    const plan = { ...validPlan, interval: 'year' as const };
    const result = planSchema.parse(plan);
    expect(result.interval).toBe('year');
  });

  it('should reject invalid plan interval', () => {
    const plan = { ...validPlan, interval: 'daily' };
    expect(() => planSchema.parse(plan)).toThrow('Invalid plan interval');
  });

  it('should reject negative price', () => {
    const plan = { ...validPlan, priceInCents: -100 };
    expect(() => planSchema.parse(plan)).toThrow('priceInCents must be a non-negative number');
  });

  it('should accept zero price for free tier', () => {
    const plan = { ...validPlan, priceInCents: 0 };
    const result = planSchema.parse(plan);
    expect(result.priceInCents).toBe(0);
  });

  it('should reject negative trial days', () => {
    const plan = { ...validPlan, trialDays: -1 };
    expect(() => planSchema.parse(plan)).toThrow('trialDays must be a non-negative number');
  });

  it('should reject missing required fields', () => {
    expect(() => planSchema.parse({})).toThrow();
    expect(() => planSchema.parse({ name: 'Plan' })).toThrow();
  });

  it('should reject non-boolean isActive', () => {
    const plan = { ...validPlan, isActive: 'true' };
    expect(() => planSchema.parse(plan)).toThrow('isActive must be a boolean');
  });

  it('should reject non-number sortOrder', () => {
    const plan = { ...validPlan, sortOrder: '1' };
    expect(() => planSchema.parse(plan)).toThrow('sortOrder must be a number');
  });
});

describe('plansListResponseSchema', () => {
  it('should validate empty plans list', () => {
    const response = { plans: [] };
    const result = plansListResponseSchema.parse(response);
    expect(result.plans).toEqual([]);
  });

  it('should validate list with multiple plans', () => {
    const plans = [
      {
        id: 'plan-1',
        name: 'Free',
        description: null,
        interval: 'month' as const,
        priceInCents: 0,
        currency: 'usd',
        features: [],
        trialDays: 0,
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 'plan-2',
        name: 'Pro',
        description: 'Pro tier',
        interval: 'month' as const,
        priceInCents: 1999,
        currency: 'usd',
        features: [],
        trialDays: 14,
        isActive: true,
        sortOrder: 2,
      },
    ];
    const result = plansListResponseSchema.parse({ plans });
    expect(result.plans).toHaveLength(2);
  });

  it('should reject non-array plans', () => {
    expect(() => plansListResponseSchema.parse({ plans: 'not-array' })).toThrow(
      'plans must be an array',
    );
  });

  it('should reject invalid plan in array', () => {
    const response = { plans: [{ invalid: 'plan' }] };
    expect(() => plansListResponseSchema.parse(response)).toThrow();
  });
});

describe('subscriptionSchema', () => {
  const validSubscription = {
    id: 'sub_123',
    userId: 'user_123',
    planId: 'plan_123',
    plan: {
      id: 'plan_123',
      name: 'Pro',
      description: 'Pro plan',
      interval: 'month' as const,
      priceInCents: 1999,
      currency: 'usd',
      features: [],
      trialDays: 14,
      isActive: true,
      sortOrder: 1,
    },
    provider: 'stripe' as const,
    status: 'active' as const,
    currentPeriodStart: '2024-01-01T00:00:00Z',
    currentPeriodEnd: '2024-02-01T00:00:00Z',
    cancelAtPeriodEnd: false,
    canceledAt: null,
    trialEnd: null,
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('should validate active subscription', () => {
    const result = subscriptionSchema.parse(validSubscription);
    expect(result.status).toBe('active');
  });

  it('should validate all subscription statuses', () => {
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

    for (const status of statuses) {
      const sub = { ...validSubscription, status };
      const result = subscriptionSchema.parse(sub);
      expect(result.status).toBe(status);
    }
  });

  it('should validate both billing providers', () => {
    const stripeSub = { ...validSubscription, provider: 'stripe' as const };
    expect(subscriptionSchema.parse(stripeSub).provider).toBe('stripe');

    const paypalSub = { ...validSubscription, provider: 'paypal' as const };
    expect(subscriptionSchema.parse(paypalSub).provider).toBe('paypal');
  });

  it('should reject invalid provider', () => {
    const sub = { ...validSubscription, provider: 'invalid' };
    expect(() => subscriptionSchema.parse(sub)).toThrow('Invalid billing provider');
  });

  it('should reject invalid status', () => {
    const sub = { ...validSubscription, status: 'expired' };
    expect(() => subscriptionSchema.parse(sub)).toThrow('Invalid subscription status');
  });

  it('should validate subscription with canceledAt', () => {
    const sub = {
      ...validSubscription,
      status: 'canceled' as const,
      canceledAt: '2024-01-15T00:00:00Z',
    };
    const result = subscriptionSchema.parse(sub);
    expect(result.canceledAt).toBe('2024-01-15T00:00:00Z');
  });

  it('should validate subscription with trialEnd', () => {
    const sub = {
      ...validSubscription,
      status: 'trialing' as const,
      trialEnd: '2024-01-15T00:00:00Z',
    };
    const result = subscriptionSchema.parse(sub);
    expect(result.trialEnd).toBe('2024-01-15T00:00:00Z');
  });
});

describe('subscriptionResponseSchema', () => {
  it('should validate response with null subscription', () => {
    const result = subscriptionResponseSchema.parse({ subscription: null });
    expect(result.subscription).toBeNull();
  });

  it('should validate response with valid subscription', () => {
    const subscription = {
      id: 'sub_123',
      userId: 'user_123',
      planId: 'plan_123',
      plan: {
        id: 'plan_123',
        name: 'Pro',
        description: null,
        interval: 'month' as const,
        priceInCents: 1999,
        currency: 'usd',
        features: [],
        trialDays: 14,
        isActive: true,
        sortOrder: 1,
      },
      provider: 'stripe' as const,
      status: 'active' as const,
      currentPeriodStart: '2024-01-01T00:00:00Z',
      currentPeriodEnd: '2024-02-01T00:00:00Z',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialEnd: null,
      createdAt: '2024-01-01T00:00:00Z',
    };
    const result = subscriptionResponseSchema.parse({ subscription });
    expect(result.subscription).toBeDefined();
  });
});

describe('checkoutRequestSchema', () => {
  it('should validate minimal checkout request', () => {
    const request = { planId: '123e4567-e89b-12d3-a456-426614174000' };
    const result = checkoutRequestSchema.parse(request);
    expect(result.planId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(result.successUrl).toBeUndefined();
    expect(result.cancelUrl).toBeUndefined();
  });

  it('should validate checkout request with URLs', () => {
    const request = {
      planId: '123e4567-e89b-12d3-a456-426614174000',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };
    const result = checkoutRequestSchema.parse(request);
    expect(result.successUrl).toBe('https://example.com/success');
    expect(result.cancelUrl).toBe('https://example.com/cancel');
  });

  it('should reject invalid UUID for planId', () => {
    const request = { planId: 'not-a-uuid' };
    expect(() => checkoutRequestSchema.parse(request)).toThrow();
  });
});

describe('checkoutResponseSchema', () => {
  it('should validate checkout response', () => {
    const response = {
      sessionId: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    };
    const result = checkoutResponseSchema.parse(response);
    expect(result.sessionId).toBe('cs_test_123');
    expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
  });

  it('should reject missing sessionId', () => {
    const response = { url: 'https://example.com' };
    expect(() => checkoutResponseSchema.parse(response)).toThrow('sessionId must be a string');
  });

  it('should reject missing url', () => {
    const response = { sessionId: 'cs_123' };
    expect(() => checkoutResponseSchema.parse(response)).toThrow('url must be a string');
  });
});

describe('cancelSubscriptionRequestSchema', () => {
  it('should default immediately to false', () => {
    const result = cancelSubscriptionRequestSchema.parse({});
    expect(result.immediately).toBe(false);
  });

  it('should accept immediately true', () => {
    const result = cancelSubscriptionRequestSchema.parse({ immediately: true });
    expect(result.immediately).toBe(true);
  });

  it('should accept immediately false explicitly', () => {
    const result = cancelSubscriptionRequestSchema.parse({ immediately: false });
    expect(result.immediately).toBe(false);
  });

  it('should handle null/undefined as empty', () => {
    expect(cancelSubscriptionRequestSchema.parse(null).immediately).toBe(false);
    expect(cancelSubscriptionRequestSchema.parse(undefined).immediately).toBe(false);
  });
});

describe('subscriptionActionResponseSchema', () => {
  it('should validate success response', () => {
    const response = { success: true, message: 'Subscription canceled' };
    const result = subscriptionActionResponseSchema.parse(response);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Subscription canceled');
  });

  it('should validate error response', () => {
    const response = { success: false, message: 'No active subscription' };
    const result = subscriptionActionResponseSchema.parse(response);
    expect(result.success).toBe(false);
  });

  it('should reject non-boolean success', () => {
    const response = { success: 'true', message: 'Done' };
    expect(() => subscriptionActionResponseSchema.parse(response)).toThrow(
      'success must be a boolean',
    );
  });
});

describe('updateSubscriptionRequestSchema', () => {
  it('should validate plan update request', () => {
    const request = { planId: '123e4567-e89b-12d3-a456-426614174000' };
    const result = updateSubscriptionRequestSchema.parse(request);
    expect(result.planId).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('should reject invalid UUID', () => {
    const request = { planId: 'not-uuid' };
    expect(() => updateSubscriptionRequestSchema.parse(request)).toThrow();
  });
});

describe('invoiceSchema', () => {
  const validInvoice = {
    id: 'in_123',
    status: 'paid' as const,
    amountDue: 1999,
    amountPaid: 1999,
    currency: 'usd',
    periodStart: '2024-01-01T00:00:00Z',
    periodEnd: '2024-02-01T00:00:00Z',
    paidAt: '2024-01-01T00:05:00Z',
    invoicePdfUrl: 'https://example.com/invoice.pdf',
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('should validate paid invoice', () => {
    const result = invoiceSchema.parse(validInvoice);
    expect(result.status).toBe('paid');
    expect(result.amountPaid).toBe(1999);
  });

  it('should validate all invoice statuses', () => {
    const statuses = ['draft', 'open', 'paid', 'void', 'uncollectible'] as const;
    for (const status of statuses) {
      const invoice = { ...validInvoice, status };
      expect(invoiceSchema.parse(invoice).status).toBe(status);
    }
  });

  it('should accept null paidAt for unpaid invoice', () => {
    const invoice = { ...validInvoice, status: 'open' as const, paidAt: null, amountPaid: 0 };
    const result = invoiceSchema.parse(invoice);
    expect(result.paidAt).toBeNull();
  });

  it('should accept null invoicePdfUrl', () => {
    const invoice = { ...validInvoice, invoicePdfUrl: null };
    const result = invoiceSchema.parse(invoice);
    expect(result.invoicePdfUrl).toBeNull();
  });

  it('should reject invalid status', () => {
    const invoice = { ...validInvoice, status: 'invalid' };
    expect(() => invoiceSchema.parse(invoice)).toThrow('Invalid invoice status');
  });

  it('should reject non-number amounts', () => {
    const invoice = { ...validInvoice, amountDue: '1999' };
    expect(() => invoiceSchema.parse(invoice)).toThrow('amountDue must be a number');
  });
});

describe('invoicesListResponseSchema', () => {
  it('should validate empty invoices list', () => {
    const response = { invoices: [], hasMore: false };
    const result = invoicesListResponseSchema.parse(response);
    expect(result.invoices).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it('should validate list with pagination', () => {
    const response = {
      invoices: [
        {
          id: 'in_1',
          status: 'paid' as const,
          amountDue: 1999,
          amountPaid: 1999,
          currency: 'usd',
          periodStart: '2024-01-01T00:00:00Z',
          periodEnd: '2024-02-01T00:00:00Z',
          paidAt: '2024-01-01T00:05:00Z',
          invoicePdfUrl: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
      hasMore: true,
    };
    const result = invoicesListResponseSchema.parse(response);
    expect(result.hasMore).toBe(true);
  });

  it('should reject non-boolean hasMore', () => {
    const response = { invoices: [], hasMore: 'false' };
    expect(() => invoicesListResponseSchema.parse(response)).toThrow('hasMore must be a boolean');
  });
});

describe('paymentMethodSchema', () => {
  it('should validate card payment method', () => {
    const pm = {
      id: 'pm_123',
      type: 'card' as const,
      isDefault: true,
      cardDetails: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025,
      },
      createdAt: '2024-01-01T00:00:00Z',
    };
    const result = paymentMethodSchema.parse(pm);
    expect(result.type).toBe('card');
    expect(result.cardDetails?.last4).toBe('4242');
  });

  it('should validate payment method with null cardDetails', () => {
    const pm = {
      id: 'pm_123',
      type: 'bank_account' as const,
      isDefault: false,
      cardDetails: null,
      createdAt: '2024-01-01T00:00:00Z',
    };
    const result = paymentMethodSchema.parse(pm);
    expect(result.cardDetails).toBeNull();
  });

  it('should validate all payment method types', () => {
    const types = ['card', 'bank_account', 'paypal'] as const;
    for (const type of types) {
      const pm = {
        id: 'pm_123',
        type,
        isDefault: false,
        cardDetails: null,
        createdAt: '2024-01-01T00:00:00Z',
      };
      expect(paymentMethodSchema.parse(pm).type).toBe(type);
    }
  });

  it('should reject invalid payment method type', () => {
    const pm = {
      id: 'pm_123',
      type: 'crypto',
      isDefault: false,
      cardDetails: null,
      createdAt: '2024-01-01T00:00:00Z',
    };
    expect(() => paymentMethodSchema.parse(pm)).toThrow('Invalid payment method type');
  });

  it('should reject invalid card details', () => {
    const pm = {
      id: 'pm_123',
      type: 'card' as const,
      isDefault: false,
      cardDetails: { brand: 'visa', last4: 4242 },
      createdAt: '2024-01-01T00:00:00Z',
    };
    expect(() => paymentMethodSchema.parse(pm)).toThrow('Invalid card details');
  });
});

describe('paymentMethodsListResponseSchema', () => {
  it('should validate empty payment methods list', () => {
    const result = paymentMethodsListResponseSchema.parse({ paymentMethods: [] });
    expect(result.paymentMethods).toEqual([]);
  });

  it('should validate list with multiple payment methods', () => {
    const response = {
      paymentMethods: [
        {
          id: 'pm_1',
          type: 'card' as const,
          isDefault: true,
          cardDetails: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2025 },
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'pm_2',
          type: 'card' as const,
          isDefault: false,
          cardDetails: { brand: 'mastercard', last4: '5555', expMonth: 6, expYear: 2026 },
          createdAt: '2024-01-02T00:00:00Z',
        },
      ],
    };
    const result = paymentMethodsListResponseSchema.parse(response);
    expect(result.paymentMethods).toHaveLength(2);
  });
});

describe('addPaymentMethodRequestSchema', () => {
  it('should validate payment method ID', () => {
    const result = addPaymentMethodRequestSchema.parse({ paymentMethodId: 'pm_123' });
    expect(result.paymentMethodId).toBe('pm_123');
  });

  it('should reject non-string paymentMethodId', () => {
    expect(() => addPaymentMethodRequestSchema.parse({ paymentMethodId: 123 })).toThrow(
      'paymentMethodId must be a string',
    );
  });
});

describe('paymentMethodResponseSchema', () => {
  it('should validate payment method response', () => {
    const response = {
      paymentMethod: {
        id: 'pm_123',
        type: 'card' as const,
        isDefault: true,
        cardDetails: null,
        createdAt: '2024-01-01T00:00:00Z',
      },
    };
    const result = paymentMethodResponseSchema.parse(response);
    expect(result.paymentMethod.id).toBe('pm_123');
  });
});

describe('setupIntentResponseSchema', () => {
  it('should validate setup intent response', () => {
    const response = { clientSecret: 'seti_123_secret_456' };
    const result = setupIntentResponseSchema.parse(response);
    expect(result.clientSecret).toBe('seti_123_secret_456');
  });

  it('should reject non-string clientSecret', () => {
    expect(() => setupIntentResponseSchema.parse({ clientSecret: 123 })).toThrow(
      'clientSecret must be a string',
    );
  });
});

describe('adminPlanSchema', () => {
  const validAdminPlan = {
    id: 'plan_123',
    name: 'Pro',
    description: 'Pro plan',
    interval: 'month' as const,
    priceInCents: 1999,
    currency: 'usd',
    features: [],
    trialDays: 14,
    isActive: true,
    sortOrder: 1,
    stripePriceId: 'price_123',
    stripeProductId: 'prod_123',
    paypalPlanId: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should validate admin plan with provider IDs', () => {
    const result = adminPlanSchema.parse(validAdminPlan);
    expect(result.stripePriceId).toBe('price_123');
    expect(result.stripeProductId).toBe('prod_123');
  });

  it('should accept null provider IDs', () => {
    const plan = { ...validAdminPlan, stripePriceId: null, stripeProductId: null };
    const result = adminPlanSchema.parse(plan);
    expect(result.stripePriceId).toBeNull();
  });

  it('should reject non-string provider IDs', () => {
    const plan = { ...validAdminPlan, stripePriceId: 123 };
    expect(() => adminPlanSchema.parse(plan)).toThrow();
  });
});

describe('adminPlansListResponseSchema', () => {
  it('should validate admin plans list', () => {
    const response = {
      plans: [
        {
          id: 'plan_1',
          name: 'Free',
          description: null,
          interval: 'month' as const,
          priceInCents: 0,
          currency: 'usd',
          features: [],
          trialDays: 0,
          isActive: true,
          sortOrder: 1,
          stripePriceId: null,
          stripeProductId: null,
          paypalPlanId: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
    };
    const result = adminPlansListResponseSchema.parse(response);
    expect(result.plans).toHaveLength(1);
  });
});

describe('createPlanRequestSchema', () => {
  it('should validate minimal plan creation', () => {
    const request = {
      name: 'New Plan',
      interval: 'month' as const,
      priceInCents: 999,
    };
    const result = createPlanRequestSchema.parse(request);
    expect(result.name).toBe('New Plan');
    expect(result.currency).toBeUndefined();
  });

  it('should validate complete plan creation', () => {
    const request = {
      name: 'Pro Plan',
      description: 'Professional tier',
      interval: 'year' as const,
      priceInCents: 9900,
      currency: 'usd',
      features: [{ name: 'Feature 1', included: true }],
      trialDays: 30,
      isActive: true,
      sortOrder: 2,
    };
    const result = createPlanRequestSchema.parse(request);
    expect(result.description).toBe('Professional tier');
    expect(result.trialDays).toBe(30);
  });

  it('should trim plan name', () => {
    const request = {
      name: '  Spaced Plan  ',
      interval: 'month' as const,
      priceInCents: 999,
    };
    const result = createPlanRequestSchema.parse(request);
    expect(result.name).toBe('Spaced Plan');
  });

  it('should reject empty plan name', () => {
    const request = { name: '', interval: 'month' as const, priceInCents: 999 };
    expect(() => createPlanRequestSchema.parse(request)).toThrow('Plan name is required');
  });

  it('should reject negative price', () => {
    const request = { name: 'Plan', interval: 'month' as const, priceInCents: -100 };
    expect(() => createPlanRequestSchema.parse(request)).toThrow(
      'priceInCents must be a non-negative number',
    );
  });
});

describe('updatePlanRequestSchema', () => {
  it('should validate partial plan update', () => {
    const request = { name: 'Updated Name' };
    const result = updatePlanRequestSchema.parse(request);
    expect(result.name).toBe('Updated Name');
  });

  it('should validate description update to null', () => {
    const request = { description: null };
    const result = updatePlanRequestSchema.parse(request);
    expect(result.description).toBeNull();
  });

  it('should validate multiple field updates', () => {
    const request = {
      name: 'Updated',
      priceInCents: 2999,
      isActive: false,
    };
    const result = updatePlanRequestSchema.parse(request);
    expect(result.name).toBe('Updated');
    expect(result.priceInCents).toBe(2999);
    expect(result.isActive).toBe(false);
  });

  it('should trim updated name', () => {
    const request = { name: '  Trimmed  ' };
    const result = updatePlanRequestSchema.parse(request);
    expect(result.name).toBe('Trimmed');
  });

  it('should reject empty name update', () => {
    const request = { name: '   ' };
    expect(() => updatePlanRequestSchema.parse(request)).toThrow('Plan name cannot be empty');
  });

  it('should reject negative price update', () => {
    const request = { priceInCents: -50 };
    expect(() => updatePlanRequestSchema.parse(request)).toThrow(
      'priceInCents must be non-negative',
    );
  });

  it('should reject negative trial days', () => {
    const request = { trialDays: -5 };
    expect(() => updatePlanRequestSchema.parse(request)).toThrow('trialDays must be non-negative');
  });
});

describe('adminPlanResponseSchema', () => {
  it('should validate admin plan response', () => {
    const response = {
      plan: {
        id: 'plan_123',
        name: 'Pro',
        description: null,
        interval: 'month' as const,
        priceInCents: 1999,
        currency: 'usd',
        features: [],
        trialDays: 14,
        isActive: true,
        sortOrder: 1,
        stripePriceId: 'price_123',
        stripeProductId: 'prod_123',
        paypalPlanId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    const result = adminPlanResponseSchema.parse(response);
    expect(result.plan.id).toBe('plan_123');
  });
});

describe('syncStripeResponseSchema', () => {
  it('should validate sync response', () => {
    const response = {
      success: true,
      stripePriceId: 'price_123',
      stripeProductId: 'prod_123',
    };
    const result = syncStripeResponseSchema.parse(response);
    expect(result.success).toBe(true);
    expect(result.stripePriceId).toBe('price_123');
  });

  it('should reject missing fields', () => {
    expect(() => syncStripeResponseSchema.parse({ success: true })).toThrow();
  });

  it('should reject non-boolean success', () => {
    const response = {
      success: 'true',
      stripePriceId: 'price_123',
      stripeProductId: 'prod_123',
    };
    expect(() => syncStripeResponseSchema.parse(response)).toThrow('success must be a boolean');
  });
});

describe('emptyBillingBodySchema', () => {
  it('should accept empty object', () => {
    const result = emptyBillingBodySchema.parse({});
    expect(result).toEqual({});
  });

  it('should accept undefined', () => {
    const result = emptyBillingBodySchema.parse(undefined);
    expect(result).toEqual({});
  });

  it('should accept null', () => {
    const result = emptyBillingBodySchema.parse(null);
    expect(result).toEqual({});
  });

  it('should accept any object and return empty', () => {
    const result = emptyBillingBodySchema.parse({ ignored: 'data' });
    expect(result).toEqual({});
  });
});
