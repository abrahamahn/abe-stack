// packages/contracts/src/billing/service.test.ts
/**
 * Billing Service Contract Type Tests
 *
 * Validates type definitions, interface structures, and contract compliance
 * for the provider-agnostic billing service interface. Tests ensure type
 * safety and structural correctness of all billing service operations.
 */

import { describe, expect, it } from 'vitest';

import type {
  BillingService,
  CheckoutParams,
  CheckoutResult,
  CreateProductParams,
  CreateProductResult,
  NormalizedEventType,
  NormalizedWebhookEvent,
  ProviderInvoice,
  ProviderPaymentMethod,
  ProviderSubscription,
  SetupIntentResult,
} from './service.js';

// ============================================================================
// CheckoutParams Tests
// ============================================================================

describe('CheckoutParams', () => {
  it('should validate complete checkout params with all fields', () => {
    const params: CheckoutParams = {
      userId: 'user_123',
      email: 'user@example.com',
      planId: 'plan_abc',
      priceId: 'price_xyz',
      trialDays: 14,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      metadata: { source: 'web', campaign: 'promo2024' },
    };

    expect(params.userId).toBe('user_123');
    expect(params.email).toBe('user@example.com');
    expect(params.planId).toBe('plan_abc');
    expect(params.priceId).toBe('price_xyz');
    expect(params.trialDays).toBe(14);
    expect(params.successUrl).toBe('https://example.com/success');
    expect(params.cancelUrl).toBe('https://example.com/cancel');
    expect(params.metadata).toEqual({ source: 'web', campaign: 'promo2024' });
  });

  it('should allow minimal checkout params without optional fields', () => {
    const params: CheckoutParams = {
      userId: 'user_456',
      email: 'test@example.com',
      planId: 'plan_def',
      priceId: 'price_123',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    expect(params.userId).toBeDefined();
    expect(params.trialDays).toBeUndefined();
    expect(params.metadata).toBeUndefined();
  });

  it('should handle empty metadata object', () => {
    const params: CheckoutParams = {
      userId: 'user_789',
      email: 'empty@example.com',
      planId: 'plan_ghi',
      priceId: 'price_456',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      metadata: {},
    };

    expect(params.metadata).toEqual({});
  });

  it('should handle zero trial days', () => {
    const params: CheckoutParams = {
      userId: 'user_000',
      email: 'notrial@example.com',
      planId: 'plan_jkl',
      priceId: 'price_789',
      trialDays: 0,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    expect(params.trialDays).toBe(0);
  });
});

// ============================================================================
// CheckoutResult Tests
// ============================================================================

describe('CheckoutResult', () => {
  it('should validate checkout result structure', () => {
    const result: CheckoutResult = {
      sessionId: 'cs_test_abc123',
      url: 'https://checkout.stripe.com/pay/cs_test_abc123',
    };

    expect(result.sessionId).toBe('cs_test_abc123');
    expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_abc123');
  });

  it('should handle different provider URLs', () => {
    const stripeResult: CheckoutResult = {
      sessionId: 'stripe_session_123',
      url: 'https://checkout.stripe.com/session',
    };

    const paypalResult: CheckoutResult = {
      sessionId: 'paypal_order_456',
      url: 'https://www.paypal.com/checkoutnow',
    };

    expect(stripeResult.url).toContain('stripe.com');
    expect(paypalResult.url).toContain('paypal.com');
  });
});

// ============================================================================
// ProviderSubscription Tests
// ============================================================================

describe('ProviderSubscription', () => {
  it('should validate active subscription', () => {
    const subscription: ProviderSubscription = {
      id: 'sub_123',
      customerId: 'cus_abc',
      status: 'active',
      priceId: 'price_xyz',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01'),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialEnd: null,
      metadata: {},
    };

    expect(subscription.status).toBe('active');
    expect(subscription.cancelAtPeriodEnd).toBe(false);
    expect(subscription.canceledAt).toBeNull();
  });

  it('should validate canceled subscription', () => {
    const subscription: ProviderSubscription = {
      id: 'sub_456',
      customerId: 'cus_def',
      status: 'canceled',
      priceId: 'price_abc',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01'),
      cancelAtPeriodEnd: true,
      canceledAt: new Date('2024-01-15'),
      trialEnd: null,
      metadata: { reason: 'user_request' },
    };

    expect(subscription.status).toBe('canceled');
    expect(subscription.cancelAtPeriodEnd).toBe(true);
    expect(subscription.canceledAt).toBeInstanceOf(Date);
    expect(subscription.metadata['reason']).toBe('user_request');
  });

  it('should validate trialing subscription', () => {
    const subscription: ProviderSubscription = {
      id: 'sub_789',
      customerId: 'cus_ghi',
      status: 'trialing',
      priceId: 'price_def',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01'),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialEnd: new Date('2024-01-14'),
      metadata: { trial_source: 'landing_page' },
    };

    expect(subscription.status).toBe('trialing');
    expect(subscription.trialEnd).toBeInstanceOf(Date);
  });

  it('should handle all subscription statuses', () => {
    const statuses: Array<ProviderSubscription['status']> = [
      'active',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'past_due',
      'paused',
      'trialing',
      'unpaid',
    ];

    for (const status of statuses) {
      const subscription: ProviderSubscription = {
        id: `sub_${String(status)}`,
        customerId: 'cus_test',
        status,
        priceId: 'price_test',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        metadata: {},
      };

      expect(subscription.status).toBe(status);
    }
  });
});

// ============================================================================
// ProviderPaymentMethod Tests
// ============================================================================

describe('ProviderPaymentMethod', () => {
  it('should validate card payment method with details', () => {
    const paymentMethod: ProviderPaymentMethod = {
      id: 'pm_123',
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025,
      },
      isDefault: true,
    };

    expect(paymentMethod.type).toBe('card');
    expect(paymentMethod.card?.brand).toBe('visa');
    expect(paymentMethod.card?.last4).toBe('4242');
    expect(paymentMethod.card?.expMonth).toBe(12);
    expect(paymentMethod.card?.expYear).toBe(2025);
    expect(paymentMethod.isDefault).toBe(true);
  });

  it('should validate non-card payment method without card details', () => {
    const paymentMethod: ProviderPaymentMethod = {
      id: 'pm_456',
      type: 'bank_account',
      isDefault: false,
    };

    expect(paymentMethod.type).toBe('bank_account');
    expect(paymentMethod.card).toBeUndefined();
    expect(paymentMethod.isDefault).toBe(false);
  });

  it('should validate all payment method types', () => {
    const types: Array<ProviderPaymentMethod['type']> = ['card', 'bank_account', 'paypal'];

    for (const type of types) {
      const paymentMethod: ProviderPaymentMethod = {
        id: `pm_${String(type)}`,
        type,
        isDefault: false,
      };

      expect(paymentMethod.type).toBe(type);
    }
  });

  it('should handle card details for all major brands', () => {
    const brands = ['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay'];

    for (const brand of brands) {
      const paymentMethod: ProviderPaymentMethod = {
        id: 'pm_' + brand,
        type: 'card',
        card: {
          brand,
          last4: '0000',
          expMonth: 1,
          expYear: 2030,
        },
        isDefault: false,
      };

      expect(paymentMethod.card?.brand).toBe(brand);
    }
  });

  it('should handle expired card expiration dates', () => {
    const paymentMethod: ProviderPaymentMethod = {
      id: 'pm_expired',
      type: 'card',
      card: {
        brand: 'visa',
        last4: '1234',
        expMonth: 1,
        expYear: 2020,
      },
      isDefault: false,
    };

    const isExpired =
      paymentMethod.card !== undefined &&
      new Date(paymentMethod.card.expYear, paymentMethod.card.expMonth - 1) < new Date();
    expect(isExpired).toBe(true);
  });
});

// ============================================================================
// ProviderInvoice Tests
// ============================================================================

describe('ProviderInvoice', () => {
  it('should validate paid invoice', () => {
    const invoice: ProviderInvoice = {
      id: 'in_123',
      customerId: 'cus_abc',
      subscriptionId: 'sub_xyz',
      status: 'paid',
      amountDue: 1999,
      amountPaid: 1999,
      currency: 'usd',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-02-01'),
      paidAt: new Date('2024-01-01T10:30:00Z'),
      invoicePdfUrl: 'https://example.com/invoice.pdf',
    };

    expect(invoice.status).toBe('paid');
    expect(invoice.amountDue).toBe(invoice.amountPaid);
    expect(invoice.paidAt).toBeInstanceOf(Date);
    expect(invoice.invoicePdfUrl).toBeTruthy();
  });

  it('should validate unpaid invoice', () => {
    const invoice: ProviderInvoice = {
      id: 'in_456',
      customerId: 'cus_def',
      subscriptionId: 'sub_abc',
      status: 'open',
      amountDue: 2999,
      amountPaid: 0,
      currency: 'usd',
      periodStart: new Date('2024-02-01'),
      periodEnd: new Date('2024-03-01'),
      paidAt: null,
      invoicePdfUrl: null,
    };

    expect(invoice.status).toBe('open');
    expect(invoice.amountPaid).toBe(0);
    expect(invoice.paidAt).toBeNull();
  });

  it('should validate all invoice statuses', () => {
    const statuses: Array<ProviderInvoice['status']> = [
      'draft',
      'open',
      'paid',
      'void',
      'uncollectible',
    ];

    for (const status of statuses) {
      const invoice: ProviderInvoice = {
        id: 'in_' + status,
        customerId: 'cus_test',
        subscriptionId: null,
        status,
        amountDue: 1000,
        amountPaid: status === 'paid' ? 1000 : 0,
        currency: 'usd',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
        paidAt: status === 'paid' ? new Date() : null,
        invoicePdfUrl: null,
      };

      expect(invoice.status).toBe(status);
    }
  });

  it('should handle invoice without subscription', () => {
    const invoice: ProviderInvoice = {
      id: 'in_onetime',
      customerId: 'cus_789',
      subscriptionId: null,
      status: 'paid',
      amountDue: 500,
      amountPaid: 500,
      currency: 'usd',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-01'),
      paidAt: new Date(),
      invoicePdfUrl: 'https://example.com/onetime.pdf',
    };

    expect(invoice.subscriptionId).toBeNull();
  });

  it('should handle partial payment', () => {
    const invoice: ProviderInvoice = {
      id: 'in_partial',
      customerId: 'cus_partial',
      subscriptionId: 'sub_partial',
      status: 'open',
      amountDue: 1000,
      amountPaid: 300,
      currency: 'usd',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-02-01'),
      paidAt: null,
      invoicePdfUrl: null,
    };

    expect(invoice.amountPaid).toBeLessThan(invoice.amountDue);
  });

  it('should handle different currencies', () => {
    const currencies = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'];

    for (const currency of currencies) {
      const invoice: ProviderInvoice = {
        id: 'in_' + currency,
        customerId: 'cus_multi',
        subscriptionId: null,
        status: 'paid',
        amountDue: 1000,
        amountPaid: 1000,
        currency,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-02-01'),
        paidAt: new Date(),
        invoicePdfUrl: null,
      };

      expect(invoice.currency).toBe(currency);
    }
  });
});

// ============================================================================
// CreateProductParams Tests
// ============================================================================

describe('CreateProductParams', () => {
  it('should validate complete product creation params', () => {
    const params: CreateProductParams = {
      name: 'Premium Plan',
      description: 'Full access to all features',
      interval: 'month',
      priceInCents: 2999,
      currency: 'usd',
      metadata: { tier: 'premium', features: 'unlimited' },
    };

    expect(params.name).toBe('Premium Plan');
    expect(params.description).toBe('Full access to all features');
    expect(params.interval).toBe('month');
    expect(params.priceInCents).toBe(2999);
    expect(params.currency).toBe('usd');
    expect(params.metadata).toBeDefined();
  });

  it('should validate minimal product params', () => {
    const params: CreateProductParams = {
      name: 'Basic Plan',
      interval: 'year',
      priceInCents: 9900,
      currency: 'usd',
    };

    expect(params.description).toBeUndefined();
    expect(params.metadata).toBeUndefined();
  });

  it('should handle both plan intervals', () => {
    const monthlyParams: CreateProductParams = {
      name: 'Monthly Plan',
      interval: 'month',
      priceInCents: 999,
      currency: 'usd',
    };

    const yearlyParams: CreateProductParams = {
      name: 'Yearly Plan',
      interval: 'year',
      priceInCents: 9900,
      currency: 'usd',
    };

    expect(monthlyParams.interval).toBe('month');
    expect(yearlyParams.interval).toBe('year');
  });

  it('should handle free tier with zero price', () => {
    const params: CreateProductParams = {
      name: 'Free Plan',
      description: 'Limited features',
      interval: 'month',
      priceInCents: 0,
      currency: 'usd',
    };

    expect(params.priceInCents).toBe(0);
  });
});

// ============================================================================
// CreateProductResult Tests
// ============================================================================

describe('CreateProductResult', () => {
  it('should validate product creation result', () => {
    const result: CreateProductResult = {
      productId: 'prod_abc123',
      priceId: 'price_xyz789',
    };

    expect(result.productId).toBe('prod_abc123');
    expect(result.priceId).toBe('price_xyz789');
  });

  it('should handle different provider ID formats', () => {
    const stripeResult: CreateProductResult = {
      productId: 'prod_1234567890',
      priceId: 'price_0987654321',
    };

    const paypalResult: CreateProductResult = {
      productId: 'PROD-ABCD-1234',
      priceId: 'PLAN-XYZ-5678',
    };

    expect(stripeResult.productId).toContain('prod_');
    expect(paypalResult.productId).toContain('PROD-');
  });
});

// ============================================================================
// SetupIntentResult Tests
// ============================================================================

describe('SetupIntentResult', () => {
  it('should validate setup intent result', () => {
    const result: SetupIntentResult = {
      clientSecret: 'seti_1234_secret_abcd5678',
    };

    expect(result.clientSecret).toBe('seti_1234_secret_abcd5678');
  });

  it('should handle typical Stripe setup intent format', () => {
    const result: SetupIntentResult = {
      clientSecret: 'seti_1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    };

    expect(result.clientSecret).toContain('seti_');
  });
});

// ============================================================================
// NormalizedEventType Tests
// ============================================================================

describe('NormalizedEventType', () => {
  it('should validate all normalized event types', () => {
    const eventTypes: NormalizedEventType[] = [
      'subscription.created',
      'subscription.updated',
      'subscription.canceled',
      'invoice.paid',
      'invoice.payment_failed',
      'refund.created',
      'chargeback.created',
      'unknown',
    ];

    for (const eventType of eventTypes) {
      const typeCheck: NormalizedEventType = eventType;
      expect(typeCheck).toBe(eventType);
    }
  });
});

// ============================================================================
// NormalizedWebhookEvent Tests
// ============================================================================

describe('NormalizedWebhookEvent', () => {
  it('should validate subscription created event', () => {
    const event: NormalizedWebhookEvent = {
      id: 'evt_123',
      type: 'subscription.created',
      data: {
        subscriptionId: 'sub_abc',
        customerId: 'cus_xyz',
        status: 'active',
        metadata: { source: 'checkout' },
        raw: { provider: 'stripe', original_event: 'customer.subscription.created' },
      },
      createdAt: new Date('2024-01-01T10:00:00Z'),
    };

    expect(event.type).toBe('subscription.created');
    expect(event.data.subscriptionId).toBe('sub_abc');
    expect(event.data.customerId).toBe('cus_xyz');
    expect(event.createdAt).toBeInstanceOf(Date);
  });

  it('should validate invoice paid event', () => {
    const event: NormalizedWebhookEvent = {
      id: 'evt_456',
      type: 'invoice.paid',
      data: {
        invoiceId: 'in_123',
        subscriptionId: 'sub_xyz',
        customerId: 'cus_abc',
        status: 'paid',
        raw: { amount: 1999, currency: 'usd' },
      },
      createdAt: new Date('2024-01-01T11:00:00Z'),
    };

    expect(event.type).toBe('invoice.paid');
    expect(event.data.invoiceId).toBe('in_123');
  });

  it('should validate unknown event type', () => {
    const event: NormalizedWebhookEvent = {
      id: 'evt_unknown',
      type: 'unknown',
      data: {
        raw: { provider_event: 'custom.event.type' },
      },
      createdAt: new Date(),
    };

    expect(event.type).toBe('unknown');
    expect(event.data.subscriptionId).toBeUndefined();
    expect(event.data.raw).toBeDefined();
  });

  it('should handle events with minimal data', () => {
    const event: NormalizedWebhookEvent = {
      id: 'evt_minimal',
      type: 'refund.created',
      data: {
        raw: {},
      },
      createdAt: new Date(),
    };

    expect(event.data.subscriptionId).toBeUndefined();
    expect(event.data.customerId).toBeUndefined();
    expect(event.data.invoiceId).toBeUndefined();
  });

  it('should preserve metadata in webhook events', () => {
    const event: NormalizedWebhookEvent = {
      id: 'evt_meta',
      type: 'subscription.updated',
      data: {
        subscriptionId: 'sub_test',
        metadata: {
          userId: 'usr_123',
          plan: 'premium',
          source: 'web',
        },
        raw: {},
      },
      createdAt: new Date(),
    };

    expect(event.data.metadata?.['userId']).toBe('usr_123');
    expect(event.data.metadata?.['plan']).toBe('premium');
  });
});

// ============================================================================
// BillingService Interface Tests
// ============================================================================

describe('BillingService interface', () => {
  it('should define all required customer management methods', () => {
    // Type-only test - validates interface structure at compile time
    const mockService: BillingService = {
      provider: 'stripe',
      createCustomer: async (_userId: string, _email: string) => Promise.resolve('cus_123'),
      createCheckoutSession: async (_params: CheckoutParams) =>
        Promise.resolve({
          sessionId: 'cs_123',
          url: 'https://checkout.com',
        }),
      cancelSubscription: async (_subscriptionId: string, _immediately?: boolean) =>
        Promise.resolve(),
      resumeSubscription: async (_subscriptionId: string) => Promise.resolve(),
      updateSubscription: async (_subscriptionId: string, _newPriceId: string) =>
        Promise.resolve(),
      getSubscription: async (_subscriptionId: string) =>
        Promise.resolve({
          id: 'sub_123',
          customerId: 'cus_123',
          status: 'active',
          priceId: 'price_123',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          canceledAt: null,
          trialEnd: null,
          metadata: {},
        } as ProviderSubscription),
      createSetupIntent: async (_customerId: string) =>
        Promise.resolve({ clientSecret: 'seti_123' }),
      listPaymentMethods: async (_customerId: string) => Promise.resolve([]),
      attachPaymentMethod: async (_customerId: string, _paymentMethodId: string) =>
        Promise.resolve(),
      detachPaymentMethod: async (_paymentMethodId: string) => Promise.resolve(),
      setDefaultPaymentMethod: async (_customerId: string, _paymentMethodId: string) =>
        Promise.resolve(),
      listInvoices: async (_customerId: string, _limit?: number) => Promise.resolve([]),
      createProduct: async (_params: CreateProductParams) =>
        Promise.resolve({
          productId: 'prod_123',
          priceId: 'price_123',
        }),
      updateProduct: async (_productId: string, _name: string, _description?: string) =>
        Promise.resolve(),
      archivePrice: async (_priceId: string) => Promise.resolve(),
      verifyWebhookSignature: (_payload: Uint8Array, _signature: string) => true,
      parseWebhookEvent: (_payload: Uint8Array, _signature: string) =>
        ({
          id: 'evt_123',
          type: 'unknown',
          data: { raw: {} },
          createdAt: new Date(),
        }) as NormalizedWebhookEvent,
    };

    expect(mockService.provider).toBe('stripe');
  });

  it('should support both stripe and paypal providers', () => {
    const stripeService: Pick<BillingService, 'provider'> = {
      provider: 'stripe',
    };

    const paypalService: Pick<BillingService, 'provider'> = {
      provider: 'paypal',
    };

    expect(stripeService.provider).toBe('stripe');
    expect(paypalService.provider).toBe('paypal');
  });

  it('should define async methods returning promises', async () => {
    const mockService: Partial<BillingService> = {
      createCustomer: async (userId: string, email: string) => {
        expect(userId).toBeTruthy();
        expect(email).toContain('@');
        return Promise.resolve('cus_created');
      },
    };

    const customerId = await mockService.createCustomer?.('usr_123', 'test@example.com');
    expect(customerId).toBe('cus_created');
  });

  it('should define webhook signature verification method', () => {
    const mockService: Pick<BillingService, 'verifyWebhookSignature'> = {
      verifyWebhookSignature: (payload: Uint8Array, signature: string) => {
        expect(payload).toBeInstanceOf(Uint8Array);
        expect(typeof signature).toBe('string');
        return payload.length > 0 && signature.length > 0;
      },
    };

    const payload = new Uint8Array([1, 2, 3]);
    const isValid = mockService.verifyWebhookSignature(payload, 'sig_123');
    expect(isValid).toBe(true);
  });

  it('should define webhook parsing method', () => {
    const mockService: Pick<BillingService, 'parseWebhookEvent'> = {
      parseWebhookEvent: (payload: Uint8Array, signature: string): NormalizedWebhookEvent => {
        expect(payload).toBeInstanceOf(Uint8Array);
        expect(signature).toBeTruthy();
        return {
          id: 'evt_parsed',
          type: 'subscription.created',
          data: { subscriptionId: 'sub_123', raw: {} },
          createdAt: new Date(),
        };
      },
    };

    const payload = new Uint8Array([1, 2, 3]);
    const event = mockService.parseWebhookEvent(payload, 'sig_abc');
    expect(event.type).toBe('subscription.created');
  });
});

// ============================================================================
// Edge Cases and Boundary Conditions
// ============================================================================

describe('edge cases', () => {
  it('should handle very large metadata objects', () => {
    const largeMetadata: Record<string, string> = {};
    for (let i = 0; i < 100; i++) {
      largeMetadata[`key${i}`] = `value${i}`;
    }

    const params: CheckoutParams = {
      userId: 'user_large',
      email: 'large@example.com',
      planId: 'plan_large',
      priceId: 'price_large',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      metadata: largeMetadata,
    };

    expect(Object.keys(params.metadata ?? {}).length).toBe(100);
  });

  it('should handle very long string IDs', () => {
    const longId = 'x'.repeat(255);
    const subscription: ProviderSubscription = {
      id: longId,
      customerId: longId,
      status: 'active',
      priceId: longId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialEnd: null,
      metadata: {},
    };

    expect(subscription.id.length).toBe(255);
  });

  it('should handle date boundaries', () => {
    const veryOldDate = new Date('1970-01-01');
    const veryFutureDate = new Date('2099-12-31');

    const subscription: ProviderSubscription = {
      id: 'sub_dates',
      customerId: 'cus_dates',
      status: 'active',
      priceId: 'price_dates',
      currentPeriodStart: veryOldDate,
      currentPeriodEnd: veryFutureDate,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialEnd: null,
      metadata: {},
    };

    expect(subscription.currentPeriodStart.getFullYear()).toBe(1970);
    expect(subscription.currentPeriodEnd.getFullYear()).toBe(2099);
  });

  it('should handle maximum trial days', () => {
    const params: CheckoutParams = {
      userId: 'user_trial',
      email: 'trial@example.com',
      planId: 'plan_trial',
      priceId: 'price_trial',
      trialDays: 365,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    expect(params.trialDays).toBe(365);
  });

  it('should handle very large amounts in invoices', () => {
    const invoice: ProviderInvoice = {
      id: 'in_large',
      customerId: 'cus_enterprise',
      subscriptionId: 'sub_enterprise',
      status: 'paid',
      amountDue: 999999999,
      amountPaid: 999999999,
      currency: 'usd',
      periodStart: new Date(),
      periodEnd: new Date(),
      paidAt: new Date(),
      invoicePdfUrl: null,
    };

    expect(invoice.amountDue).toBe(999999999);
  });

  it('should handle empty arrays for payment methods list', () => {
    const emptyList: ProviderPaymentMethod[] = [];
    expect(emptyList).toHaveLength(0);
  });

  it('should handle empty arrays for invoices list', () => {
    const emptyList: ProviderInvoice[] = [];
    expect(emptyList).toHaveLength(0);
  });

  it('should handle webhook events with empty raw data', () => {
    const event: NormalizedWebhookEvent = {
      id: 'evt_empty',
      type: 'unknown',
      data: {
        raw: {},
      },
      createdAt: new Date(),
    };

    expect(event.data.raw).toEqual({});
  });
});
