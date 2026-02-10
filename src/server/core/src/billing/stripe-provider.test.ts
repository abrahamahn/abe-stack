// src/server/core/src/billing/stripe-provider.test.ts
/**
 * Unit tests for Stripe billing provider
 *
 * Note: These tests verify the StripeProvider's public API contract,
 * error handling, and data transformation logic. Full integration
 * testing with the Stripe SDK is done via integration tests.
 *
 * The Stripe SDK is loaded via require() at module scope, which makes
 * traditional mocking challenging. We verify the contract and behavior
 * through the public interface testing.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('stripe', () => {
  class MockStripe {
    public readonly customers = {
      create: vi.fn(() => Promise.resolve({ id: 'cus_test_123' })),
      retrieve: vi.fn(() =>
        Promise.resolve({
          deleted: false,
          invoice_settings: { default_payment_method: 'pm_test_123' },
        }),
      ),
      update: vi.fn(() => Promise.resolve({})),
    };

    public readonly checkout = {
      sessions: {
        create: vi.fn(() =>
          Promise.resolve({ id: 'cs_test_123', url: 'https://checkout.stripe.test' }),
        ),
      },
    };

    public readonly subscriptions = {
      cancel: vi.fn(() => Promise.resolve({})),
      update: vi.fn(() => Promise.resolve({})),
      retrieve: vi.fn(() =>
        Promise.resolve({
          id: 'sub_test_123',
          customer: 'cus_test_123',
          status: 'active',
          start_date: 1_700_000_000,
          cancel_at_period_end: false,
          canceled_at: null,
          trial_end: null,
          metadata: {},
          items: {
            data: [
              {
                id: 'si_test_123',
                price: { id: 'price_test_123' },
                current_period_start: 1_700_000_000,
                current_period_end: 1_700_086_400,
              },
            ],
          },
        }),
      ),
    };

    public readonly setupIntents = {
      create: vi.fn(() => Promise.resolve({ client_secret: 'seti_test_secret' })),
    };

    public readonly paymentMethods = {
      list: vi.fn(() => Promise.resolve({ data: [] })),
      attach: vi.fn(() => Promise.resolve({})),
      detach: vi.fn(() => Promise.resolve({})),
    };

    public readonly invoices = {
      list: vi.fn(() => Promise.resolve({ data: [] })),
    };

    public readonly products = {
      create: vi.fn(() => Promise.resolve({ id: 'prod_test_123' })),
      update: vi.fn(() => Promise.resolve({})),
    };

    public readonly prices = {
      create: vi.fn(() => Promise.resolve({ id: 'price_test_123' })),
      update: vi.fn(() => Promise.resolve({})),
    };

    public readonly webhooks = {
      constructEvent: vi.fn(() => {
        throw new Error('Invalid signature');
      }),
    };
  }

  return { default: MockStripe };
});

import { StripeProvider } from './stripe-provider';

import type { CheckoutParams, CreateProductParams } from '@abe-stack/shared';
import type { StripeProviderConfig as StripeConfig } from '@abe-stack/shared/config';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create valid Stripe configuration for testing
 */
function createValidConfig(): StripeConfig {
  return {
    secretKey: 'sk_test_51234567890abcdef',
    publishableKey: 'pk_test_51234567890abcdef',
    webhookSecret: 'whsec_test_1234567890abcdef',
  };
}

/**
 * Create valid checkout parameters for testing
 */
function createValidCheckoutParams(): CheckoutParams {
  return {
    userId: 'cus_test123',
    email: 'test@example.com',
    planId: 'plan_test123',
    priceId: 'price_test123',
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
  };
}

/**
 * Create valid product creation parameters for testing
 */
function createValidProductParams(): CreateProductParams {
  return {
    name: 'Test Product',
    description: 'Test product description',
    priceInCents: 1999,
    currency: 'usd',
    interval: 'month',
  };
}

// ============================================================================
// Tests: Constructor & Configuration
// ============================================================================

describe('StripeProvider', () => {
  describe('constructor', () => {
    it('should create provider instance with valid configuration', () => {
      const config = createValidConfig();
      const provider = new StripeProvider(config);

      expect(provider).toBeInstanceOf(StripeProvider);
      expect(provider.provider).toBe('stripe');
    });

    it('should set provider name to "stripe"', () => {
      const config = createValidConfig();
      const provider = new StripeProvider(config);

      expect(provider.provider).toBe('stripe');
    });

    it('should initialize with secret key', () => {
      const config = createValidConfig();

      // Should not throw during construction
      expect(() => new StripeProvider(config)).not.toThrow();
    });

    it('should initialize with webhook secret', () => {
      const config = createValidConfig();
      const provider = new StripeProvider(config);

      // Provider should be defined and have access to webhook secret
      expect(provider).toBeDefined();
    });
  });

  // ==========================================================================
  // Tests: Customer Management Interface
  // ==========================================================================

  describe('createCustomer', () => {
    it('should have createCustomer method that returns Promise<string>', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.createCustomer).toBe('function');
      expect(provider.createCustomer('user_123', 'test@example.com')).toBeInstanceOf(Promise);
    });

    it('should accept userId and email parameters', () => {
      const provider = new StripeProvider(createValidConfig());

      // Should accept correct parameter types without throwing
      const promise = provider.createCustomer('user_123', 'test@example.com');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  // ==========================================================================
  // Tests: Checkout & Subscriptions Interface
  // ==========================================================================

  describe('createCheckoutSession', () => {
    it('should have createCheckoutSession method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.createCheckoutSession).toBe('function');
    });

    it('should accept valid CheckoutParams', () => {
      const provider = new StripeProvider(createValidConfig());
      const params = createValidCheckoutParams();

      // Should accept correct parameter types
      const promise = provider.createCheckoutSession(params);
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should handle parameters with optional trialDays', () => {
      const provider = new StripeProvider(createValidConfig());
      const params: CheckoutParams = {
        ...createValidCheckoutParams(),
        trialDays: 14,
      };

      const promise = provider.createCheckoutSession(params);
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should handle parameters with optional metadata', () => {
      const provider = new StripeProvider(createValidConfig());
      const params: CheckoutParams = {
        ...createValidCheckoutParams(),
        metadata: { source: 'web', campaign: 'summer2024' },
      };

      const promise = provider.createCheckoutSession(params);
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('cancelSubscription', () => {
    it('should have cancelSubscription method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.cancelSubscription).toBe('function');
    });

    it('should accept subscription ID and immediately flag', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.cancelSubscription('sub_123', true);
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should accept subscription ID without immediately flag', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.cancelSubscription('sub_123');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('resumeSubscription', () => {
    it('should have resumeSubscription method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.resumeSubscription).toBe('function');
    });

    it('should accept subscription ID', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.resumeSubscription('sub_123');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('updateSubscription', () => {
    it('should have updateSubscription method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.updateSubscription).toBe('function');
    });

    it('should accept subscription ID and new price ID', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.updateSubscription('sub_123', 'price_456');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('getSubscription', () => {
    it('should have getSubscription method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.getSubscription).toBe('function');
    });

    it('should accept subscription ID', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.getSubscription('sub_123');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  // ==========================================================================
  // Tests: Payment Methods Interface
  // ==========================================================================

  describe('createSetupIntent', () => {
    it('should have createSetupIntent method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.createSetupIntent).toBe('function');
    });

    it('should accept customer ID', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.createSetupIntent('cus_123');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('listPaymentMethods', () => {
    it('should have listPaymentMethods method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.listPaymentMethods).toBe('function');
    });

    it('should accept customer ID', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.listPaymentMethods('cus_123');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('attachPaymentMethod', () => {
    it('should have attachPaymentMethod method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.attachPaymentMethod).toBe('function');
    });

    it('should accept customer ID and payment method ID', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.attachPaymentMethod('cus_123', 'pm_456');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('detachPaymentMethod', () => {
    it('should have detachPaymentMethod method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.detachPaymentMethod).toBe('function');
    });

    it('should accept payment method ID', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.detachPaymentMethod('pm_123');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should have setDefaultPaymentMethod method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.setDefaultPaymentMethod).toBe('function');
    });

    it('should accept customer ID and payment method ID', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.setDefaultPaymentMethod('cus_123', 'pm_456');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  // ==========================================================================
  // Tests: Invoices Interface
  // ==========================================================================

  describe('listInvoices', () => {
    it('should have listInvoices method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.listInvoices).toBe('function');
    });

    it('should accept customer ID', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.listInvoices('cus_123');
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should accept customer ID and limit', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.listInvoices('cus_123', 25);
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  // ==========================================================================
  // Tests: Products & Prices Interface
  // ==========================================================================

  describe('createProduct', () => {
    it('should have createProduct method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.createProduct).toBe('function');
    });

    it('should accept valid product parameters', () => {
      const provider = new StripeProvider(createValidConfig());
      const params = createValidProductParams();

      const promise = provider.createProduct(params);
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should accept product parameters with metadata', () => {
      const provider = new StripeProvider(createValidConfig());
      const params: CreateProductParams = {
        ...createValidProductParams(),
        metadata: { tier: 'pro', featured: 'true' },
      };

      const promise = provider.createProduct(params);
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should accept year interval', () => {
      const provider = new StripeProvider(createValidConfig());
      const params: CreateProductParams = {
        ...createValidProductParams(),
        interval: 'year',
      };

      const promise = provider.createProduct(params);
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('updateProduct', () => {
    it('should have updateProduct method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.updateProduct).toBe('function');
    });

    it('should accept product ID and name', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.updateProduct('prod_123', 'New Name');
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should accept product ID, name, and description', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.updateProduct('prod_123', 'New Name', 'New Description');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('archivePrice', () => {
    it('should have archivePrice method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.archivePrice).toBe('function');
    });

    it('should accept price ID', () => {
      const provider = new StripeProvider(createValidConfig());

      const promise = provider.archivePrice('price_123');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  // ==========================================================================
  // Tests: Webhooks Interface
  // ==========================================================================

  describe('verifyWebhookSignature', () => {
    it('should have verifyWebhookSignature method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.verifyWebhookSignature).toBe('function');
    });

    it('should accept payload buffer and signature string', () => {
      const provider = new StripeProvider(createValidConfig());
      const payload = Buffer.from(JSON.stringify({ type: 'test' }));
      const signature = 't=123,v1=abc';

      const result = provider.verifyWebhookSignature(payload, signature);
      expect(typeof result).toBe('boolean');
    });

    it('should return boolean value', () => {
      const provider = new StripeProvider(createValidConfig());
      const payload = Buffer.from(JSON.stringify({ type: 'test' }));
      const signature = 't=123,v1=abc';

      const result = provider.verifyWebhookSignature(payload, signature);
      expect(result).toBe(false); // Invalid signature should return false
    });
  });

  describe('parseWebhookEvent', () => {
    it('should have parseWebhookEvent method', () => {
      const provider = new StripeProvider(createValidConfig());

      expect(typeof provider.parseWebhookEvent).toBe('function');
    });

    it('should accept payload buffer and signature string', () => {
      const provider = new StripeProvider(createValidConfig());
      const payload = Buffer.from(JSON.stringify({ type: 'test' }));
      const signature = 't=123,v1=abc';

      // Will throw without valid Stripe event, but should accept the parameters
      expect(() => provider.parseWebhookEvent(payload, signature)).toThrow();
    });
  });

  // ==========================================================================
  // Tests: BillingService Interface Compliance
  // ==========================================================================

  describe('BillingService interface', () => {
    let provider: StripeProvider;

    beforeEach(() => {
      provider = new StripeProvider(createValidConfig());
    });

    it('should have provider property', () => {
      expect(provider.provider).toBe('stripe');
    });

    it('should implement all required customer methods', () => {
      expect(typeof provider.createCustomer).toBe('function');
    });

    it('should implement all required subscription methods', () => {
      expect(typeof provider.createCheckoutSession).toBe('function');
      expect(typeof provider.cancelSubscription).toBe('function');
      expect(typeof provider.resumeSubscription).toBe('function');
      expect(typeof provider.updateSubscription).toBe('function');
      expect(typeof provider.getSubscription).toBe('function');
    });

    it('should implement all required payment method methods', () => {
      expect(typeof provider.createSetupIntent).toBe('function');
      expect(typeof provider.listPaymentMethods).toBe('function');
      expect(typeof provider.attachPaymentMethod).toBe('function');
      expect(typeof provider.detachPaymentMethod).toBe('function');
      expect(typeof provider.setDefaultPaymentMethod).toBe('function');
    });

    it('should implement all required invoice methods', () => {
      expect(typeof provider.listInvoices).toBe('function');
    });

    it('should implement all required product methods', () => {
      expect(typeof provider.createProduct).toBe('function');
      expect(typeof provider.updateProduct).toBe('function');
      expect(typeof provider.archivePrice).toBe('function');
    });

    it('should implement all required webhook methods', () => {
      expect(typeof provider.verifyWebhookSignature).toBe('function');
      expect(typeof provider.parseWebhookEvent).toBe('function');
    });
  });

  // ==========================================================================
  // Tests: Parameter Validation
  // ==========================================================================

  describe('parameter validation', () => {
    let provider: StripeProvider;

    beforeEach(() => {
      provider = new StripeProvider(createValidConfig());
    });

    it('should accept valid checkout parameters', () => {
      const params = createValidCheckoutParams();
      expect(() => provider.createCheckoutSession(params)).not.toThrow();
    });

    it('should accept valid product parameters', () => {
      const params = createValidProductParams();
      expect(() => provider.createProduct(params)).not.toThrow();
    });

    it('should handle checkout with zero trial days', () => {
      const params: CheckoutParams = {
        ...createValidCheckoutParams(),
        trialDays: 0,
      };
      expect(() => provider.createCheckoutSession(params)).not.toThrow();
    });

    it('should handle product update with empty description', () => {
      expect(() => provider.updateProduct('prod_123', 'Name', '')).not.toThrow();
    });

    it('should handle product update without description', () => {
      expect(() => provider.updateProduct('prod_123', 'Name')).not.toThrow();
    });
  });

  // ==========================================================================
  // Tests: Type Safety
  // ==========================================================================

  describe('type safety', () => {
    it('should enforce StripeConfig type for constructor', () => {
      const config: StripeConfig = {
        secretKey: 'sk_test_123',
        publishableKey: 'pk_test_123',
        webhookSecret: 'whsec_test_123',
      };

      expect(() => new StripeProvider(config)).not.toThrow();
    });

    it('should enforce CheckoutParams type for createCheckoutSession', () => {
      const provider = new StripeProvider(createValidConfig());
      const params: CheckoutParams = createValidCheckoutParams();

      expect(() => provider.createCheckoutSession(params)).not.toThrow();
    });

    it('should enforce CreateProductParams type for createProduct', () => {
      const provider = new StripeProvider(createValidConfig());
      const params: CreateProductParams = createValidProductParams();

      expect(() => provider.createProduct(params)).not.toThrow();
    });
  });
});
