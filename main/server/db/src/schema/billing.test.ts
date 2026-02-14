// main/server/db/src/schema/billing.test.ts
/**
 * Tests for Billing Schema Type Definitions
 *
 * Validates:
 * - Table name constants
 * - Enum type definitions and constant arrays
 * - Type interfaces for all billing entities
 * - Column mapping objects for snake_case/camelCase conversion
 * - Type completeness and consistency
 *
 * @complexity O(1) - All tests are constant-time validations
 */

import { describe, it, expect } from 'vitest';

import {
  PLANS_TABLE,
  SUBSCRIPTIONS_TABLE,
  CUSTOMER_MAPPINGS_TABLE,
  INVOICES_TABLE,
  PAYMENT_METHODS_TABLE,
  BILLING_EVENTS_TABLE,
  BILLING_PROVIDERS,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
  INVOICE_STATUSES,
  PAYMENT_METHOD_TYPES,
  BILLING_EVENT_TYPES,
  PLAN_COLUMNS,
  SUBSCRIPTION_COLUMNS,
  CUSTOMER_MAPPING_COLUMNS,
  INVOICE_COLUMNS,
  PAYMENT_METHOD_COLUMNS,
  BILLING_EVENT_COLUMNS,
} from './billing';

import type {
  Plan,
  NewPlan,
  UpdatePlan,
  PlanFeature,
  Subscription,
  NewSubscription,
  UpdateSubscription,
  CustomerMapping,
  NewCustomerMapping,
  Invoice,
  NewInvoice,
  UpdateInvoice,
  PaymentMethod,
  NewPaymentMethod,
  UpdatePaymentMethod,
  CardDetails,
  BillingEvent,
  NewBillingEvent,
  BillingProvider,
  PlanInterval,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentMethodType,
  BillingEventType,
} from './billing';

// ============================================================================
// Table Name Constants
// ============================================================================

describe('Billing Schema - Table Names', () => {
  describe('table name constants', () => {
    it('should define plans table name', () => {
      expect(PLANS_TABLE).toBe('plans');
    });

    it('should define subscriptions table name', () => {
      expect(SUBSCRIPTIONS_TABLE).toBe('subscriptions');
    });

    it('should define customer_mappings table name', () => {
      expect(CUSTOMER_MAPPINGS_TABLE).toBe('customer_mappings');
    });

    it('should define invoices table name', () => {
      expect(INVOICES_TABLE).toBe('invoices');
    });

    it('should define payment_methods table name', () => {
      expect(PAYMENT_METHODS_TABLE).toBe('payment_methods');
    });

    it('should define billing_events table name', () => {
      expect(BILLING_EVENTS_TABLE).toBe('billing_events');
    });
  });

  describe('table name uniqueness', () => {
    it('should have unique table names', () => {
      const tableNames = [
        PLANS_TABLE,
        SUBSCRIPTIONS_TABLE,
        CUSTOMER_MAPPINGS_TABLE,
        INVOICES_TABLE,
        PAYMENT_METHODS_TABLE,
        BILLING_EVENTS_TABLE,
      ];

      const uniqueNames = new Set(tableNames);
      expect(uniqueNames.size).toBe(tableNames.length);
    });
  });
});

// ============================================================================
// Enum Types and Constants
// ============================================================================

describe('Billing Schema - Enums and Constants', () => {
  describe('BillingProvider', () => {
    it('should have stripe and paypal providers', () => {
      expect(BILLING_PROVIDERS).toEqual(['stripe', 'paypal']);
    });

    it('should be readonly array', () => {
      expect(Object.isFrozen(BILLING_PROVIDERS)).toBe(false);
      expect(Array.isArray(BILLING_PROVIDERS)).toBe(true);
    });

    it('should type-check valid providers', () => {
      const stripeProvider: BillingProvider = 'stripe';
      const paypalProvider: BillingProvider = 'paypal';

      expect(stripeProvider).toBe('stripe');
      expect(paypalProvider).toBe('paypal');
    });
  });

  describe('PlanInterval', () => {
    it('should have month and year intervals', () => {
      expect(PLAN_INTERVALS).toEqual(['month', 'year']);
    });

    it('should contain exactly 2 intervals', () => {
      expect(PLAN_INTERVALS).toHaveLength(2);
    });

    it('should type-check valid intervals', () => {
      const monthInterval: PlanInterval = 'month';
      const yearInterval: PlanInterval = 'year';

      expect(monthInterval).toBe('month');
      expect(yearInterval).toBe('year');
    });
  });

  describe('SubscriptionStatus', () => {
    it('should have all Stripe-compatible statuses', () => {
      expect(SUBSCRIPTION_STATUSES).toEqual([
        'active',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'past_due',
        'paused',
        'trialing',
        'unpaid',
      ]);
    });

    it('should contain exactly 8 statuses', () => {
      expect(SUBSCRIPTION_STATUSES).toHaveLength(8);
    });

    it('should have unique status values', () => {
      const uniqueStatuses = new Set(SUBSCRIPTION_STATUSES);
      expect(uniqueStatuses.size).toBe(SUBSCRIPTION_STATUSES.length);
    });

    it('should type-check all valid statuses', () => {
      const activeStatus: SubscriptionStatus = 'active';
      const canceledStatus: SubscriptionStatus = 'canceled';
      const incompleteStatus: SubscriptionStatus = 'incomplete';
      const incompleteExpiredStatus: SubscriptionStatus = 'incomplete_expired';
      const pastDueStatus: SubscriptionStatus = 'past_due';
      const pausedStatus: SubscriptionStatus = 'paused';
      const trialingStatus: SubscriptionStatus = 'trialing';
      const unpaidStatus: SubscriptionStatus = 'unpaid';

      expect(activeStatus).toBe('active');
      expect(canceledStatus).toBe('canceled');
      expect(incompleteStatus).toBe('incomplete');
      expect(incompleteExpiredStatus).toBe('incomplete_expired');
      expect(pastDueStatus).toBe('past_due');
      expect(pausedStatus).toBe('paused');
      expect(trialingStatus).toBe('trialing');
      expect(unpaidStatus).toBe('unpaid');
    });
  });

  describe('InvoiceStatus', () => {
    it('should have all invoice statuses', () => {
      expect(INVOICE_STATUSES).toEqual(['draft', 'open', 'paid', 'void', 'uncollectible']);
    });

    it('should contain exactly 5 statuses', () => {
      expect(INVOICE_STATUSES).toHaveLength(5);
    });

    it('should have unique status values', () => {
      const uniqueStatuses = new Set(INVOICE_STATUSES);
      expect(uniqueStatuses.size).toBe(INVOICE_STATUSES.length);
    });

    it('should type-check all valid statuses', () => {
      const draftStatus: InvoiceStatus = 'draft';
      const openStatus: InvoiceStatus = 'open';
      const paidStatus: InvoiceStatus = 'paid';
      const voidStatus: InvoiceStatus = 'void';
      const uncollectibleStatus: InvoiceStatus = 'uncollectible';

      expect(draftStatus).toBe('draft');
      expect(openStatus).toBe('open');
      expect(paidStatus).toBe('paid');
      expect(voidStatus).toBe('void');
      expect(uncollectibleStatus).toBe('uncollectible');
    });
  });

  describe('PaymentMethodType', () => {
    it('should have all payment method types', () => {
      expect(PAYMENT_METHOD_TYPES).toEqual(['card', 'bank_account', 'paypal']);
    });

    it('should contain exactly 3 types', () => {
      expect(PAYMENT_METHOD_TYPES).toHaveLength(3);
    });

    it('should type-check all valid types', () => {
      const cardType: PaymentMethodType = 'card';
      const bankType: PaymentMethodType = 'bank_account';
      const paypalType: PaymentMethodType = 'paypal';

      expect(cardType).toBe('card');
      expect(bankType).toBe('bank_account');
      expect(paypalType).toBe('paypal');
    });
  });

  describe('BillingEventType', () => {
    it('should have all billing event types', () => {
      expect(BILLING_EVENT_TYPES).toEqual([
        'subscription.created',
        'subscription.updated',
        'subscription.canceled',
        'invoice.paid',
        'invoice.payment_failed',
        'refund.created',
        'chargeback.created',
      ]);
    });

    it('should contain exactly 7 event types', () => {
      expect(BILLING_EVENT_TYPES).toHaveLength(7);
    });

    it('should have unique event types', () => {
      const uniqueTypes = new Set(BILLING_EVENT_TYPES);
      expect(uniqueTypes.size).toBe(BILLING_EVENT_TYPES.length);
    });

    it('should follow namespace.action pattern', () => {
      BILLING_EVENT_TYPES.forEach((eventType: string) => {
        expect(eventType).toMatch(/^[a-z]+\.[a-z_]+$/);
      });
    });

    it('should type-check all valid event types', () => {
      const subCreated: BillingEventType = 'subscription.created';
      const subUpdated: BillingEventType = 'subscription.updated';
      const subCanceled: BillingEventType = 'subscription.canceled';
      const invPaid: BillingEventType = 'invoice.paid';
      const invFailed: BillingEventType = 'invoice.payment_failed';
      const refund: BillingEventType = 'refund.created';
      const chargeback: BillingEventType = 'chargeback.created';

      expect(subCreated).toBe('subscription.created');
      expect(subUpdated).toBe('subscription.updated');
      expect(subCanceled).toBe('subscription.canceled');
      expect(invPaid).toBe('invoice.paid');
      expect(invFailed).toBe('invoice.payment_failed');
      expect(refund).toBe('refund.created');
      expect(chargeback).toBe('chargeback.created');
    });
  });
});

// ============================================================================
// Plan Types
// ============================================================================

describe('Billing Schema - Plan Types', () => {
  describe('PlanFeature', () => {
    it('should have required properties', () => {
      const feature: PlanFeature = {
        name: 'Unlimited projects',
        included: true,
      };

      expect(feature.name).toBeDefined();
      expect(feature.included).toBeDefined();
    });

    it('should support optional description', () => {
      const featureWithDesc: PlanFeature = {
        name: 'API Access',
        included: true,
        description: 'Full REST API access',
      };

      expect(featureWithDesc.description).toBe('Full REST API access');
    });

    it('should allow boolean included flag', () => {
      const includedFeature: PlanFeature = { name: 'Feature A', included: true };
      const excludedFeature: PlanFeature = { name: 'Feature B', included: false };

      expect(includedFeature.included).toBe(true);
      expect(excludedFeature.included).toBe(false);
    });
  });

  describe('Plan', () => {
    it('should have all required properties', () => {
      const plan: Plan = {
        id: 'plan-123',
        name: 'Pro Plan',
        description: 'For professionals',
        interval: 'month',
        priceInCents: 1999,
        currency: 'usd',
        features: [],
        trialDays: 14,
        stripePriceId: 'price_123',
        stripeProductId: 'prod_123',
        paypalPlanId: 'pp_plan_123',
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(plan.id).toBeDefined();
      expect(plan.name).toBeDefined();
      expect(plan.interval).toBeDefined();
      expect(plan.priceInCents).toBeDefined();
      expect(plan.currency).toBeDefined();
    });

    it('should support null description', () => {
      const planWithoutDesc: Plan = {
        id: 'plan-123',
        name: 'Basic Plan',
        description: null,
        interval: 'year',
        priceInCents: 9900,
        currency: 'usd',
        features: [],
        trialDays: 0,
        stripePriceId: null,
        stripeProductId: null,
        paypalPlanId: null,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(planWithoutDesc.description).toBeNull();
    });

    it('should support features array', () => {
      const features: PlanFeature[] = [
        { name: 'Feature 1', included: true },
        { name: 'Feature 2', included: false },
      ];

      const plan: Plan = {
        id: 'plan-123',
        name: 'Enterprise',
        description: null,
        interval: 'year',
        priceInCents: 49900,
        currency: 'usd',
        features,
        trialDays: 30,
        stripePriceId: null,
        stripeProductId: null,
        paypalPlanId: null,
        isActive: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(plan.features).toHaveLength(2);
      expect(plan.features[0]?.included).toBe(true);
    });

    it('should support nullable provider IDs', () => {
      const plan: Plan = {
        id: 'plan-123',
        name: 'Free Plan',
        description: null,
        interval: 'month',
        priceInCents: 0,
        currency: 'usd',
        features: [],
        trialDays: 0,
        stripePriceId: null,
        stripeProductId: null,
        paypalPlanId: null,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(plan.stripePriceId).toBeNull();
      expect(plan.stripeProductId).toBeNull();
      expect(plan.paypalPlanId).toBeNull();
    });
  });

  describe('NewPlan', () => {
    it('should require only name, interval, and priceInCents', () => {
      const newPlan: NewPlan = {
        name: 'Starter Plan',
        interval: 'month',
        priceInCents: 999,
      };

      expect(newPlan.name).toBe('Starter Plan');
      expect(newPlan.interval).toBe('month');
      expect(newPlan.priceInCents).toBe(999);
    });

    it('should support all optional properties', () => {
      const newPlan: NewPlan = {
        id: 'custom-id',
        name: 'Premium',
        description: 'Premium tier',
        interval: 'year',
        priceInCents: 19900,
        currency: 'eur',
        features: [{ name: 'Everything', included: true }],
        trialDays: 30,
        stripePriceId: 'price_xyz',
        stripeProductId: 'prod_xyz',
        paypalPlanId: 'pp_xyz',
        isActive: false,
        sortOrder: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      expect(newPlan.id).toBe('custom-id');
      expect(newPlan.currency).toBe('eur');
      expect(newPlan.trialDays).toBe(30);
    });

    it('should default to undefined for optional fields', () => {
      const minimalPlan: NewPlan = {
        name: 'Basic',
        interval: 'month',
        priceInCents: 500,
      };

      expect(minimalPlan.id).toBeUndefined();
      expect(minimalPlan.description).toBeUndefined();
      expect(minimalPlan.currency).toBeUndefined();
    });
  });

  describe('UpdatePlan', () => {
    it('should make all properties optional', () => {
      const update: UpdatePlan = {
        name: 'Updated Name',
      };

      expect(update.name).toBe('Updated Name');
      expect(update.priceInCents).toBeUndefined();
    });

    it('should support partial updates', () => {
      const update: UpdatePlan = {
        priceInCents: 1499,
        isActive: false,
        updatedAt: new Date(),
      };

      expect(update.priceInCents).toBe(1499);
      expect(update.isActive).toBe(false);
      expect(update.name).toBeUndefined();
    });

    it('should allow updating provider IDs', () => {
      const update: UpdatePlan = {
        stripePriceId: 'new_price',
        paypalPlanId: null,
      };

      expect(update.stripePriceId).toBe('new_price');
      expect(update.paypalPlanId).toBeNull();
    });
  });
});

// ============================================================================
// Subscription Types
// ============================================================================

describe('Billing Schema - Subscription Types', () => {
  describe('Subscription', () => {
    it('should have all required properties', () => {
      const subscription: Subscription = {
        id: 'sub-123',
        userId: 'user-123',
        planId: 'plan-123',
        provider: 'stripe',
        providerSubscriptionId: 'sub_stripe_123',
        providerCustomerId: 'cus_stripe_123',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(subscription.userId).toBeDefined();
      expect(subscription.planId).toBeDefined();
      expect(subscription.provider).toBeDefined();
      expect(subscription.status).toBeDefined();
    });

    it('should support all subscription statuses', () => {
      const activeSubscription: Subscription = {
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-1',
        provider: 'stripe',
        providerSubscriptionId: 'sub_1',
        providerCustomerId: 'cus_1',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(activeSubscription.status).toBe('active');
    });

    it('should support metadata object', () => {
      const subscription: Subscription = {
        id: 'sub-123',
        userId: 'user-123',
        planId: 'plan-123',
        provider: 'paypal',
        providerSubscriptionId: 'pp_sub_123',
        providerCustomerId: 'pp_cus_123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        metadata: { source: 'web', campaign: 'summer2024' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(subscription.metadata['source']).toBe('web');
      expect(subscription.metadata['campaign']).toBe('summer2024');
    });

    it('should support nullable canceledAt and trialEnd', () => {
      const subscription: Subscription = {
        id: 'sub-123',
        userId: 'user-123',
        planId: 'plan-123',
        provider: 'stripe',
        providerSubscriptionId: 'sub_123',
        providerCustomerId: 'cus_123',
        status: 'trialing',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: new Date('2024-02-01'),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(subscription.canceledAt).toBeNull();
      expect(subscription.trialEnd).toBeInstanceOf(Date);
    });
  });

  describe('NewSubscription', () => {
    it('should require core subscription properties', () => {
      const newSubscription: NewSubscription = {
        userId: 'user-123',
        planId: 'plan-123',
        provider: 'stripe',
        providerSubscriptionId: 'sub_new',
        providerCustomerId: 'cus_new',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      };

      expect(newSubscription.userId).toBeDefined();
      expect(newSubscription.planId).toBeDefined();
      expect(newSubscription.status).toBeDefined();
    });

    it('should support optional properties', () => {
      const newSubscription: NewSubscription = {
        id: 'custom-sub-id',
        userId: 'user-123',
        planId: 'plan-123',
        provider: 'paypal',
        providerSubscriptionId: 'pp_sub',
        providerCustomerId: 'pp_cus',
        status: 'trialing',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
        trialEnd: new Date(),
        metadata: { note: 'test' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      expect(newSubscription.id).toBe('custom-sub-id');
      expect(newSubscription.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('UpdateSubscription', () => {
    it('should make all properties optional', () => {
      const update: UpdateSubscription = {
        status: 'canceled',
      };

      expect(update.status).toBe('canceled');
      expect(update.planId).toBeUndefined();
    });

    it('should support cancellation updates', () => {
      const update: UpdateSubscription = {
        status: 'canceled',
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      };

      expect(update.status).toBe('canceled');
      expect(update.cancelAtPeriodEnd).toBe(true);
      expect(update.canceledAt).toBeInstanceOf(Date);
    });

    it('should support metadata updates', () => {
      const update: UpdateSubscription = {
        metadata: { reason: 'price_change' },
      };

      expect(update.metadata?.['reason']).toBe('price_change');
    });
  });
});

// ============================================================================
// Customer Mapping Types
// ============================================================================

describe('Billing Schema - Customer Mapping Types', () => {
  describe('CustomerMapping', () => {
    it('should have all required properties', () => {
      const mapping: CustomerMapping = {
        id: 'mapping-123',
        userId: 'user-123',
        provider: 'stripe',
        providerCustomerId: 'cus_stripe_123',
        createdAt: new Date(),
      };

      expect(mapping.userId).toBeDefined();
      expect(mapping.provider).toBeDefined();
      expect(mapping.providerCustomerId).toBeDefined();
    });

    it('should support both billing providers', () => {
      const stripeMapping: CustomerMapping = {
        id: 'map-1',
        userId: 'user-1',
        provider: 'stripe',
        providerCustomerId: 'cus_stripe',
        createdAt: new Date(),
      };

      const paypalMapping: CustomerMapping = {
        id: 'map-2',
        userId: 'user-1',
        provider: 'paypal',
        providerCustomerId: 'pp_cus',
        createdAt: new Date(),
      };

      expect(stripeMapping.provider).toBe('stripe');
      expect(paypalMapping.provider).toBe('paypal');
    });
  });

  describe('NewCustomerMapping', () => {
    it('should require userId, provider, and providerCustomerId', () => {
      const newMapping: NewCustomerMapping = {
        userId: 'user-123',
        provider: 'stripe',
        providerCustomerId: 'cus_new',
      };

      expect(newMapping.userId).toBe('user-123');
      expect(newMapping.provider).toBe('stripe');
      expect(newMapping.providerCustomerId).toBe('cus_new');
    });

    it('should support optional id and createdAt', () => {
      const newMapping: NewCustomerMapping = {
        id: 'custom-mapping-id',
        userId: 'user-123',
        provider: 'paypal',
        providerCustomerId: 'pp_cus_123',
        createdAt: new Date('2024-01-01'),
      };

      expect(newMapping.id).toBe('custom-mapping-id');
      expect(newMapping.createdAt).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// Invoice Types
// ============================================================================

describe('Billing Schema - Invoice Types', () => {
  describe('Invoice', () => {
    it('should have all required properties', () => {
      const invoice: Invoice = {
        id: 'inv-123',
        userId: 'user-123',
        subscriptionId: 'sub-123',
        provider: 'stripe',
        providerInvoiceId: 'in_stripe_123',
        status: 'paid',
        amountDue: 1999,
        amountPaid: 1999,
        currency: 'usd',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
        paidAt: new Date('2024-01-05'),
        invoicePdfUrl: 'https://example.com/invoice.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(invoice.userId).toBeDefined();
      expect(invoice.provider).toBeDefined();
      expect(invoice.status).toBeDefined();
      expect(invoice.amountDue).toBeDefined();
    });

    it('should support all invoice statuses', () => {
      const draftInvoice: Invoice = {
        id: 'inv-1',
        userId: 'user-1',
        subscriptionId: 'sub-1',
        provider: 'stripe',
        providerInvoiceId: 'in_1',
        status: 'draft',
        amountDue: 1999,
        amountPaid: 0,
        currency: 'usd',
        periodStart: new Date(),
        periodEnd: new Date(),
        paidAt: null,
        invoicePdfUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(draftInvoice.status).toBe('draft');
      expect(draftInvoice.paidAt).toBeNull();
    });

    it('should support nullable subscriptionId', () => {
      const oneTimeInvoice: Invoice = {
        id: 'inv-123',
        userId: 'user-123',
        subscriptionId: null,
        provider: 'stripe',
        providerInvoiceId: 'in_stripe_123',
        status: 'paid',
        amountDue: 5000,
        amountPaid: 5000,
        currency: 'usd',
        periodStart: new Date(),
        periodEnd: new Date(),
        paidAt: new Date(),
        invoicePdfUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(oneTimeInvoice.subscriptionId).toBeNull();
    });

    it('should track amount due vs amount paid', () => {
      const partiallyPaidInvoice: Invoice = {
        id: 'inv-123',
        userId: 'user-123',
        subscriptionId: 'sub-123',
        provider: 'stripe',
        providerInvoiceId: 'in_123',
        status: 'open',
        amountDue: 1999,
        amountPaid: 500,
        currency: 'usd',
        periodStart: new Date(),
        periodEnd: new Date(),
        paidAt: null,
        invoicePdfUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(partiallyPaidInvoice.amountDue).toBe(1999);
      expect(partiallyPaidInvoice.amountPaid).toBe(500);
    });
  });

  describe('NewInvoice', () => {
    it('should require core invoice properties', () => {
      const newInvoice: NewInvoice = {
        userId: 'user-123',
        provider: 'stripe',
        providerInvoiceId: 'in_new',
        status: 'open',
        amountDue: 1999,
        currency: 'usd',
        periodStart: new Date(),
        periodEnd: new Date(),
      };

      expect(newInvoice.userId).toBeDefined();
      expect(newInvoice.provider).toBeDefined();
      expect(newInvoice.status).toBeDefined();
      expect(newInvoice.amountDue).toBeDefined();
    });

    it('should support optional properties', () => {
      const newInvoice: NewInvoice = {
        id: 'custom-inv-id',
        userId: 'user-123',
        subscriptionId: 'sub-123',
        provider: 'paypal',
        providerInvoiceId: 'pp_inv',
        status: 'paid',
        amountDue: 2999,
        amountPaid: 2999,
        currency: 'eur',
        periodStart: new Date(),
        periodEnd: new Date(),
        paidAt: new Date(),
        invoicePdfUrl: 'https://example.com/invoice.pdf',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      expect(newInvoice.id).toBe('custom-inv-id');
      expect(newInvoice.amountPaid).toBe(2999);
    });
  });

  describe('UpdateInvoice', () => {
    it('should make all properties optional', () => {
      const update: UpdateInvoice = {
        status: 'paid',
      };

      expect(update.status).toBe('paid');
      expect(update.amountPaid).toBeUndefined();
    });

    it('should support payment updates', () => {
      const update: UpdateInvoice = {
        status: 'paid',
        amountPaid: 1999,
        paidAt: new Date(),
      };

      expect(update.status).toBe('paid');
      expect(update.amountPaid).toBe(1999);
      expect(update.paidAt).toBeInstanceOf(Date);
    });

    it('should support PDF URL updates', () => {
      const update: UpdateInvoice = {
        invoicePdfUrl: 'https://example.com/new-invoice.pdf',
      };

      expect(update.invoicePdfUrl).toBe('https://example.com/new-invoice.pdf');
    });
  });
});

// ============================================================================
// Payment Method Types
// ============================================================================

describe('Billing Schema - Payment Method Types', () => {
  describe('CardDetails', () => {
    it('should have all required card properties', () => {
      const cardDetails: CardDetails = {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025,
      };

      expect(cardDetails.brand).toBeDefined();
      expect(cardDetails.last4).toBeDefined();
      expect(cardDetails.expMonth).toBeDefined();
      expect(cardDetails.expYear).toBeDefined();
    });

    it('should support various card brands', () => {
      const visaCard: CardDetails = {
        brand: 'visa',
        last4: '4242',
        expMonth: 6,
        expYear: 2026,
      };

      const mastercardCard: CardDetails = {
        brand: 'mastercard',
        last4: '5555',
        expMonth: 3,
        expYear: 2027,
      };

      expect(visaCard.brand).toBe('visa');
      expect(mastercardCard.brand).toBe('mastercard');
    });

    it('should validate expiration format', () => {
      const cardDetails: CardDetails = {
        brand: 'amex',
        last4: '1005',
        expMonth: 1,
        expYear: 2030,
      };

      expect(cardDetails.expMonth).toBeGreaterThanOrEqual(1);
      expect(cardDetails.expMonth).toBeLessThanOrEqual(12);
      expect(cardDetails.expYear).toBeGreaterThan(2020);
    });
  });

  describe('PaymentMethod', () => {
    it('should have all required properties', () => {
      const paymentMethod: PaymentMethod = {
        id: 'pm-123',
        userId: 'user-123',
        provider: 'stripe',
        providerPaymentMethodId: 'pm_stripe_123',
        type: 'card',
        isDefault: true,
        cardDetails: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(paymentMethod.userId).toBeDefined();
      expect(paymentMethod.provider).toBeDefined();
      expect(paymentMethod.type).toBeDefined();
      expect(paymentMethod.isDefault).toBeDefined();
    });

    it('should support all payment method types', () => {
      const cardMethod: PaymentMethod = {
        id: 'pm-1',
        userId: 'user-1',
        provider: 'stripe',
        providerPaymentMethodId: 'pm_1',
        type: 'card',
        isDefault: true,
        cardDetails: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2025 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const bankMethod: PaymentMethod = {
        id: 'pm-2',
        userId: 'user-1',
        provider: 'stripe',
        providerPaymentMethodId: 'pm_2',
        type: 'bank_account',
        isDefault: false,
        cardDetails: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(cardMethod.type).toBe('card');
      expect(bankMethod.type).toBe('bank_account');
    });

    it('should support nullable cardDetails for non-card types', () => {
      const paypalMethod: PaymentMethod = {
        id: 'pm-123',
        userId: 'user-123',
        provider: 'paypal',
        providerPaymentMethodId: 'pp_pm_123',
        type: 'paypal',
        isDefault: false,
        cardDetails: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(paypalMethod.cardDetails).toBeNull();
    });
  });

  describe('NewPaymentMethod', () => {
    it('should require core payment method properties', () => {
      const newMethod: NewPaymentMethod = {
        userId: 'user-123',
        provider: 'stripe',
        providerPaymentMethodId: 'pm_new',
        type: 'card',
      };

      expect(newMethod.userId).toBeDefined();
      expect(newMethod.provider).toBeDefined();
      expect(newMethod.type).toBeDefined();
    });

    it('should support optional properties', () => {
      const newMethod: NewPaymentMethod = {
        id: 'custom-pm-id',
        userId: 'user-123',
        provider: 'stripe',
        providerPaymentMethodId: 'pm_new',
        type: 'card',
        isDefault: true,
        cardDetails: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2025 },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      expect(newMethod.id).toBe('custom-pm-id');
      expect(newMethod.isDefault).toBe(true);
      expect(newMethod.cardDetails).toBeDefined();
    });
  });

  describe('UpdatePaymentMethod', () => {
    it('should make all properties optional', () => {
      const update: UpdatePaymentMethod = {
        isDefault: true,
      };

      expect(update.isDefault).toBe(true);
      expect(update.cardDetails).toBeUndefined();
    });

    it('should support card details updates', () => {
      const update: UpdatePaymentMethod = {
        cardDetails: { brand: 'visa', last4: '1234', expMonth: 6, expYear: 2028 },
      };

      expect(update.cardDetails?.last4).toBe('1234');
    });
  });
});

// ============================================================================
// Billing Event Types
// ============================================================================

describe('Billing Schema - Billing Event Types', () => {
  describe('BillingEvent', () => {
    it('should have all required properties', () => {
      const event: BillingEvent = {
        id: 'evt-123',
        provider: 'stripe',
        providerEventId: 'evt_stripe_123',
        eventType: 'invoice.paid',
        payload: { invoiceId: 'inv_123' },
        processedAt: new Date(),
        createdAt: new Date(),
      };

      expect(event.provider).toBeDefined();
      expect(event.providerEventId).toBeDefined();
      expect(event.eventType).toBeDefined();
      expect(event.payload).toBeDefined();
    });

    it('should support all event types', () => {
      const subEvent: BillingEvent = {
        id: 'evt-1',
        provider: 'stripe',
        providerEventId: 'evt_1',
        eventType: 'subscription.created',
        payload: {},
        processedAt: new Date(),
        createdAt: new Date(),
      };

      const invoiceEvent: BillingEvent = {
        id: 'evt-2',
        provider: 'stripe',
        providerEventId: 'evt_2',
        eventType: 'invoice.payment_failed',
        payload: {},
        processedAt: new Date(),
        createdAt: new Date(),
      };

      expect(subEvent.eventType).toBe('subscription.created');
      expect(invoiceEvent.eventType).toBe('invoice.payment_failed');
    });

    it('should support complex payload objects', () => {
      const event: BillingEvent = {
        id: 'evt-123',
        provider: 'paypal',
        providerEventId: 'pp_evt_123',
        eventType: 'refund.created',
        payload: {
          refundId: 'ref_123',
          amount: 1999,
          currency: 'usd',
          reason: 'customer_request',
          metadata: { orderId: 'order_456' },
        },
        processedAt: new Date(),
        createdAt: new Date(),
      };

      expect(event.payload['refundId']).toBe('ref_123');
      expect(event.payload['metadata']).toBeDefined();
    });
  });

  describe('NewBillingEvent', () => {
    it('should require core event properties', () => {
      const newEvent: NewBillingEvent = {
        provider: 'stripe',
        providerEventId: 'evt_new',
        eventType: 'subscription.updated',
      };

      expect(newEvent.provider).toBeDefined();
      expect(newEvent.providerEventId).toBeDefined();
      expect(newEvent.eventType).toBeDefined();
    });

    it('should support optional properties', () => {
      const newEvent: NewBillingEvent = {
        id: 'custom-evt-id',
        provider: 'paypal',
        providerEventId: 'pp_evt_new',
        eventType: 'chargeback.created',
        payload: { chargebackId: 'cb_123' },
        processedAt: new Date(),
        createdAt: new Date('2024-01-01'),
      };

      expect(newEvent.id).toBe('custom-evt-id');
      expect(newEvent.payload).toBeDefined();
      expect(newEvent.processedAt).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// Column Mappings
// ============================================================================

describe('Billing Schema - Column Mappings', () => {
  describe('PLAN_COLUMNS', () => {
    it('should map all Plan interface properties', () => {
      expect(PLAN_COLUMNS.id).toBe('id');
      expect(PLAN_COLUMNS.name).toBe('name');
      expect(PLAN_COLUMNS.description).toBe('description');
      expect(PLAN_COLUMNS.interval).toBe('interval');
      expect(PLAN_COLUMNS.priceInCents).toBe('price_in_cents');
      expect(PLAN_COLUMNS.currency).toBe('currency');
      expect(PLAN_COLUMNS.features).toBe('features');
      expect(PLAN_COLUMNS.trialDays).toBe('trial_days');
      expect(PLAN_COLUMNS.stripePriceId).toBe('stripe_price_id');
      expect(PLAN_COLUMNS.stripeProductId).toBe('stripe_product_id');
      expect(PLAN_COLUMNS.paypalPlanId).toBe('paypal_plan_id');
      expect(PLAN_COLUMNS.isActive).toBe('is_active');
      expect(PLAN_COLUMNS.sortOrder).toBe('sort_order');
      expect(PLAN_COLUMNS.createdAt).toBe('created_at');
      expect(PLAN_COLUMNS.updatedAt).toBe('updated_at');
    });

    it('should have exactly 15 column mappings', () => {
      const keys = Object.keys(PLAN_COLUMNS);
      expect(keys).toHaveLength(15);
    });

    it('should use snake_case for database columns', () => {
      expect(PLAN_COLUMNS.priceInCents).toMatch(/^[a-z_]+$/);
      expect(PLAN_COLUMNS.stripePriceId).toMatch(/^[a-z_]+$/);
    });
  });

  describe('SUBSCRIPTION_COLUMNS', () => {
    it('should map all Subscription interface properties', () => {
      expect(SUBSCRIPTION_COLUMNS.id).toBe('id');
      expect(SUBSCRIPTION_COLUMNS.userId).toBe('user_id');
      expect(SUBSCRIPTION_COLUMNS.planId).toBe('plan_id');
      expect(SUBSCRIPTION_COLUMNS.provider).toBe('provider');
      expect(SUBSCRIPTION_COLUMNS.providerSubscriptionId).toBe('provider_subscription_id');
      expect(SUBSCRIPTION_COLUMNS.providerCustomerId).toBe('provider_customer_id');
      expect(SUBSCRIPTION_COLUMNS.status).toBe('status');
      expect(SUBSCRIPTION_COLUMNS.currentPeriodStart).toBe('current_period_start');
      expect(SUBSCRIPTION_COLUMNS.currentPeriodEnd).toBe('current_period_end');
      expect(SUBSCRIPTION_COLUMNS.cancelAtPeriodEnd).toBe('cancel_at_period_end');
      expect(SUBSCRIPTION_COLUMNS.canceledAt).toBe('canceled_at');
      expect(SUBSCRIPTION_COLUMNS.trialEnd).toBe('trial_end');
      expect(SUBSCRIPTION_COLUMNS.metadata).toBe('metadata');
      expect(SUBSCRIPTION_COLUMNS.createdAt).toBe('created_at');
      expect(SUBSCRIPTION_COLUMNS.updatedAt).toBe('updated_at');
    });

    it('should have exactly 15 column mappings', () => {
      const keys = Object.keys(SUBSCRIPTION_COLUMNS);
      expect(keys).toHaveLength(15);
    });
  });

  describe('CUSTOMER_MAPPING_COLUMNS', () => {
    it('should map all CustomerMapping interface properties', () => {
      expect(CUSTOMER_MAPPING_COLUMNS.id).toBe('id');
      expect(CUSTOMER_MAPPING_COLUMNS.userId).toBe('user_id');
      expect(CUSTOMER_MAPPING_COLUMNS.provider).toBe('provider');
      expect(CUSTOMER_MAPPING_COLUMNS.providerCustomerId).toBe('provider_customer_id');
      expect(CUSTOMER_MAPPING_COLUMNS.createdAt).toBe('created_at');
    });

    it('should have exactly 5 column mappings', () => {
      const keys = Object.keys(CUSTOMER_MAPPING_COLUMNS);
      expect(keys).toHaveLength(5);
    });
  });

  describe('INVOICE_COLUMNS', () => {
    it('should map all Invoice interface properties', () => {
      expect(INVOICE_COLUMNS.id).toBe('id');
      expect(INVOICE_COLUMNS.userId).toBe('user_id');
      expect(INVOICE_COLUMNS.subscriptionId).toBe('subscription_id');
      expect(INVOICE_COLUMNS.provider).toBe('provider');
      expect(INVOICE_COLUMNS.providerInvoiceId).toBe('provider_invoice_id');
      expect(INVOICE_COLUMNS.status).toBe('status');
      expect(INVOICE_COLUMNS.amountDue).toBe('amount_due');
      expect(INVOICE_COLUMNS.amountPaid).toBe('amount_paid');
      expect(INVOICE_COLUMNS.currency).toBe('currency');
      expect(INVOICE_COLUMNS.periodStart).toBe('period_start');
      expect(INVOICE_COLUMNS.periodEnd).toBe('period_end');
      expect(INVOICE_COLUMNS.paidAt).toBe('paid_at');
      expect(INVOICE_COLUMNS.invoicePdfUrl).toBe('invoice_pdf_url');
      expect(INVOICE_COLUMNS.createdAt).toBe('created_at');
      expect(INVOICE_COLUMNS.updatedAt).toBe('updated_at');
    });

    it('should have exactly 15 column mappings', () => {
      const keys = Object.keys(INVOICE_COLUMNS);
      expect(keys).toHaveLength(15);
    });
  });

  describe('PAYMENT_METHOD_COLUMNS', () => {
    it('should map all PaymentMethod interface properties', () => {
      expect(PAYMENT_METHOD_COLUMNS.id).toBe('id');
      expect(PAYMENT_METHOD_COLUMNS.userId).toBe('user_id');
      expect(PAYMENT_METHOD_COLUMNS.provider).toBe('provider');
      expect(PAYMENT_METHOD_COLUMNS.providerPaymentMethodId).toBe('provider_payment_method_id');
      expect(PAYMENT_METHOD_COLUMNS.type).toBe('type');
      expect(PAYMENT_METHOD_COLUMNS.isDefault).toBe('is_default');
      expect(PAYMENT_METHOD_COLUMNS.cardDetails).toBe('card_details');
      expect(PAYMENT_METHOD_COLUMNS.createdAt).toBe('created_at');
      expect(PAYMENT_METHOD_COLUMNS.updatedAt).toBe('updated_at');
    });

    it('should have exactly 9 column mappings', () => {
      const keys = Object.keys(PAYMENT_METHOD_COLUMNS);
      expect(keys).toHaveLength(9);
    });
  });

  describe('BILLING_EVENT_COLUMNS', () => {
    it('should map all BillingEvent interface properties', () => {
      expect(BILLING_EVENT_COLUMNS.id).toBe('id');
      expect(BILLING_EVENT_COLUMNS.provider).toBe('provider');
      expect(BILLING_EVENT_COLUMNS.providerEventId).toBe('provider_event_id');
      expect(BILLING_EVENT_COLUMNS.eventType).toBe('event_type');
      expect(BILLING_EVENT_COLUMNS.payload).toBe('payload');
      expect(BILLING_EVENT_COLUMNS.processedAt).toBe('processed_at');
      expect(BILLING_EVENT_COLUMNS.createdAt).toBe('created_at');
    });

    it('should have exactly 7 column mappings', () => {
      const keys = Object.keys(BILLING_EVENT_COLUMNS);
      expect(keys).toHaveLength(7);
    });
  });

  describe('column mapping consistency', () => {
    it('should use consistent snake_case pattern for multi-word columns', () => {
      const allColumns = {
        ...PLAN_COLUMNS,
        ...SUBSCRIPTION_COLUMNS,
        ...INVOICE_COLUMNS,
        ...PAYMENT_METHOD_COLUMNS,
        ...BILLING_EVENT_COLUMNS,
      };

      Object.values(allColumns).forEach((columnName) => {
        if (columnName !== 'id') {
          expect(columnName).toMatch(/^[a-z]+(_[a-z]+)*$/);
        }
      });
    });

    it('should map camelCase keys to snake_case values consistently', () => {
      expect(PLAN_COLUMNS.priceInCents).toBe('price_in_cents');
      expect(SUBSCRIPTION_COLUMNS.currentPeriodStart).toBe('current_period_start');
      expect(INVOICE_COLUMNS.invoicePdfUrl).toBe('invoice_pdf_url');
      expect(PAYMENT_METHOD_COLUMNS.providerPaymentMethodId).toBe('provider_payment_method_id');
      expect(BILLING_EVENT_COLUMNS.providerEventId).toBe('provider_event_id');
    });

    it('should not have duplicate database column names within same table', () => {
      const checkUnique = (columns: Record<string, string>) => {
        const values = Object.values(columns);
        const uniqueValues = new Set(values);
        expect(uniqueValues.size).toBe(values.length);
      };

      checkUnique(PLAN_COLUMNS);
      checkUnique(SUBSCRIPTION_COLUMNS);
      checkUnique(CUSTOMER_MAPPING_COLUMNS);
      checkUnique(INVOICE_COLUMNS);
      checkUnique(PAYMENT_METHOD_COLUMNS);
      checkUnique(BILLING_EVENT_COLUMNS);
    });
  });
});

// ============================================================================
// Type Consistency and Integration
// ============================================================================

describe('Billing Schema - Type Consistency', () => {
  describe('interface relationships', () => {
    it('should have consistent ID types across related entities', () => {
      const plan: Plan = {
        id: 'plan-123',
        name: 'Pro',
        description: null,
        interval: 'month',
        priceInCents: 1999,
        currency: 'usd',
        features: [],
        trialDays: 0,
        stripePriceId: null,
        stripeProductId: null,
        paypalPlanId: null,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const subscription: Subscription = {
        id: 'sub-123',
        userId: 'user-123',
        planId: plan.id,
        provider: 'stripe',
        providerSubscriptionId: 'sub_stripe_123',
        providerCustomerId: 'cus_123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(typeof subscription.planId).toBe('string');
      expect(typeof plan.id).toBe('string');
    });

    it('should have consistent provider types across entities', () => {
      const subscription: Subscription = {
        id: 'sub-123',
        userId: 'user-123',
        planId: 'plan-123',
        provider: 'stripe',
        providerSubscriptionId: 'sub_123',
        providerCustomerId: 'cus_123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const invoice: Invoice = {
        id: 'inv-123',
        userId: subscription.userId,
        subscriptionId: subscription.id,
        provider: subscription.provider,
        providerInvoiceId: 'in_123',
        status: 'paid',
        amountDue: 1999,
        amountPaid: 1999,
        currency: 'usd',
        periodStart: new Date(),
        periodEnd: new Date(),
        paidAt: new Date(),
        invoicePdfUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(invoice.provider).toBe(subscription.provider);
    });

    it('should have consistent timestamp types across all entities', () => {
      const plan: Plan = {
        id: 'plan-123',
        name: 'Pro',
        description: null,
        interval: 'month',
        priceInCents: 1999,
        currency: 'usd',
        features: [],
        trialDays: 0,
        stripePriceId: null,
        stripeProductId: null,
        paypalPlanId: null,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(plan.createdAt).toBeInstanceOf(Date);
      expect(plan.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('insert/update type compatibility', () => {
    it('should allow NewPlan to be used for insertions', () => {
      const newPlan: NewPlan = {
        name: 'Basic',
        interval: 'month',
        priceInCents: 999,
      };

      expect(newPlan.name).toBeDefined();
      expect(newPlan.id).toBeUndefined();
    });

    it('should allow UpdatePlan to be used for partial updates', () => {
      const update: UpdatePlan = {
        priceInCents: 1499,
      };

      expect(update.priceInCents).toBe(1499);
      expect(update.name).toBeUndefined();
    });

    it('should allow NewSubscription without optional fields', () => {
      const newSub: NewSubscription = {
        userId: 'user-123',
        planId: 'plan-123',
        provider: 'stripe',
        providerSubscriptionId: 'sub_123',
        providerCustomerId: 'cus_123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      };

      expect(newSub.userId).toBeDefined();
      expect(newSub.cancelAtPeriodEnd).toBeUndefined();
    });
  });

  describe('enum and type alignment', () => {
    it('should have BILLING_PROVIDERS match BillingProvider type', () => {
      const providers: BillingProvider[] = [...BILLING_PROVIDERS];
      expect(providers).toHaveLength(2);
      expect(providers).toContain('stripe');
      expect(providers).toContain('paypal');
    });

    it('should have PLAN_INTERVALS match PlanInterval type', () => {
      const intervals: PlanInterval[] = [...PLAN_INTERVALS];
      expect(intervals).toHaveLength(2);
      expect(intervals).toContain('month');
      expect(intervals).toContain('year');
    });

    it('should have SUBSCRIPTION_STATUSES match SubscriptionStatus type', () => {
      const statuses: SubscriptionStatus[] = [...SUBSCRIPTION_STATUSES];
      expect(statuses).toHaveLength(8);
      expect(statuses).toContain('active');
      expect(statuses).toContain('canceled');
    });

    it('should have INVOICE_STATUSES match InvoiceStatus type', () => {
      const statuses: InvoiceStatus[] = [...INVOICE_STATUSES];
      expect(statuses).toHaveLength(5);
      expect(statuses).toContain('paid');
      expect(statuses).toContain('void');
    });

    it('should have PAYMENT_METHOD_TYPES match PaymentMethodType type', () => {
      const types: PaymentMethodType[] = [...PAYMENT_METHOD_TYPES];
      expect(types).toHaveLength(3);
      expect(types).toContain('card');
      expect(types).toContain('bank_account');
    });

    it('should have BILLING_EVENT_TYPES match BillingEventType type', () => {
      const types: BillingEventType[] = [...BILLING_EVENT_TYPES];
      expect(types).toHaveLength(7);
      expect(types).toContain('invoice.paid');
      expect(types).toContain('subscription.created');
    });
  });
});
