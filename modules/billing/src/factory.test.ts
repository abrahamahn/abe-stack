// modules/billing/src/factory.test.ts
import type { BillingConfig } from '@abe-stack/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBillingProvider, isBillingConfigured } from './factory';

// ============================================================================
// Mock Dependencies
// ============================================================================

const { MockStripeProvider, MockPayPalProvider } = vi.hoisted(() => {
  class MockStripeProvider {
    static mock = { calls: [] as unknown[][] };
    constructor(...args: unknown[]) {
      MockStripeProvider.mock.calls.push(args);
    }
    createCheckoutSession = vi.fn();
  }

  class MockPayPalProvider {
    static mock = { calls: [] as unknown[][] };
    constructor(...args: unknown[]) {
      MockPayPalProvider.mock.calls.push(args);
    }
    createCheckoutSession = vi.fn();
  }

  return { MockStripeProvider, MockPayPalProvider };
});

vi.mock('./stripe-provider', () => ({
  StripeProvider: MockStripeProvider,
}));

vi.mock('./paypal-provider', () => ({
  PayPalProvider: MockPayPalProvider,
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createStripeConfig(): BillingConfig {
  return {
    enabled: true,
    provider: 'stripe',
    currency: 'usd',
    plans: [],
    stripe: {
      secretKey: 'sk_test_123',
      publishableKey: 'pk_test_123',
      webhookSecret: 'whsec_test_123',
    },
    paypal: {
      clientId: '',
      clientSecret: '',
      webhookId: '',
    },
    urls: {
      success: 'http://localhost:3000/success',
      cancel: 'http://localhost:3000/cancel',
    },
  };
}

function createPayPalConfig(): BillingConfig {
  return {
    enabled: true,
    provider: 'paypal',
    currency: 'usd',
    plans: [],
    stripe: {
      secretKey: '',
      publishableKey: '',
      webhookSecret: '',
    },
    paypal: {
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      webhookId: 'test_webhook_id',
    },
    urls: {
      success: 'http://localhost:3000/success',
      cancel: 'http://localhost:3000/cancel',
    },
  };
}

// ============================================================================
// Tests: createBillingProvider
// ============================================================================

describe('createBillingProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockStripeProvider.mock.calls = [];
    MockPayPalProvider.mock.calls = [];
  });

  describe('when provider is stripe', () => {
    it('should create StripeProvider with config', () => {
      const config = createStripeConfig();

      const provider = createBillingProvider(config);

      expect(MockStripeProvider.mock.calls).toHaveLength(1);
      expect(MockStripeProvider.mock.calls[0]).toEqual([config.stripe]);
      expect(provider).toBeInstanceOf(MockStripeProvider);
    });

    it('should pass complete stripe configuration', () => {
      const config = createStripeConfig();
      config.stripe.secretKey = 'sk_live_different';
      config.stripe.publishableKey = 'pk_live_different';
      config.stripe.webhookSecret = 'whsec_live_different';

      createBillingProvider(config);

      expect(MockStripeProvider.mock.calls[0]).toEqual([
        {
          secretKey: 'sk_live_different',
          publishableKey: 'pk_live_different',
          webhookSecret: 'whsec_live_different',
        },
      ]);
    });
  });

  describe('when provider is paypal', () => {
    it('should create PayPalProvider with config', () => {
      const config = createPayPalConfig();

      const provider = createBillingProvider(config);

      expect(MockPayPalProvider.mock.calls).toHaveLength(1);
      expect(MockPayPalProvider.mock.calls[0]).toEqual([config.paypal]);
      expect(provider).toBeInstanceOf(MockPayPalProvider);
    });

    it('should pass complete paypal configuration', () => {
      const config = createPayPalConfig();
      config.paypal.clientId = 'different_client_id';
      config.paypal.clientSecret = 'different_client_secret';
      config.paypal.webhookId = 'different_webhook_id';

      createBillingProvider(config);

      expect(MockPayPalProvider.mock.calls[0]).toEqual([
        {
          clientId: 'different_client_id',
          clientSecret: 'different_client_secret',
          webhookId: 'different_webhook_id',
        },
      ]);
    });
  });

  describe('when provider is unsupported', () => {
    it('should throw BillingProviderNotConfiguredError', () => {
      const config = {
        ...createStripeConfig(),
        provider: 'unsupported' as BillingConfig['provider'],
      };

      expect(() => createBillingProvider(config)).toThrow();
      try {
        createBillingProvider(config);
      } catch (error) {
        expect(error).toMatchObject({ name: 'ProviderNotConfiguredError' });
      }
    });

    it('should include provider name in error', () => {
      const config = {
        ...createStripeConfig(),
        provider: 'invalid-provider' as BillingConfig['provider'],
      };

      try {
        createBillingProvider(config);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toMatchObject({ name: 'ProviderNotConfiguredError' });
      }
    });
  });
});

// ============================================================================
// Tests: isBillingConfigured
// ============================================================================

describe('isBillingConfigured', () => {
  describe('when provider is null or undefined', () => {
    it('should return false when provider is null', () => {
      const config: Partial<BillingConfig> = {
        provider: null as unknown as BillingConfig['provider'],
      };

      expect(isBillingConfigured(config)).toBe(false);
    });

    it('should return false when provider is undefined', () => {
      const config: Partial<BillingConfig> = {};

      expect(isBillingConfigured(config)).toBe(false);
    });
  });

  describe('when provider is stripe', () => {
    it('should return true when all stripe credentials are present', () => {
      const config: Partial<BillingConfig> = {
        provider: 'stripe',
        stripe: {
          secretKey: 'sk_test_123',
          publishableKey: 'pk_test_123',
          webhookSecret: 'whsec_test_123',
        },
      };

      expect(isBillingConfigured(config)).toBe(true);
    });

    it('should return false when stripe config is missing', () => {
      const config: Partial<BillingConfig> = {
        provider: 'stripe',
      };

      expect(isBillingConfigured(config)).toBe(false);
    });

    it('should return false when secretKey is empty', () => {
      const config: Partial<BillingConfig> = {
        provider: 'stripe',
        stripe: {
          secretKey: '',
          publishableKey: 'pk_test_123',
          webhookSecret: 'whsec_test_123',
        },
      };

      expect(isBillingConfigured(config)).toBe(false);
    });

    it('should return false when publishableKey is empty', () => {
      const config: Partial<BillingConfig> = {
        provider: 'stripe',
        stripe: {
          secretKey: 'sk_test_123',
          publishableKey: '',
          webhookSecret: 'whsec_test_123',
        },
      };

      expect(isBillingConfigured(config)).toBe(false);
    });

    it('should return false when webhookSecret is empty', () => {
      const config: Partial<BillingConfig> = {
        provider: 'stripe',
        stripe: {
          secretKey: 'sk_test_123',
          publishableKey: 'pk_test_123',
          webhookSecret: '',
        },
      };

      expect(isBillingConfigured(config)).toBe(false);
    });

    it('should return false when all stripe credentials are empty', () => {
      const config: Partial<BillingConfig> = {
        provider: 'stripe',
        stripe: {
          secretKey: '',
          publishableKey: '',
          webhookSecret: '',
        },
      };

      expect(isBillingConfigured(config)).toBe(false);
    });
  });

  describe('when provider is paypal', () => {
    it('should return true when all paypal credentials are present', () => {
      const config: Partial<BillingConfig> = {
        provider: 'paypal',
        paypal: {
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret',
          webhookId: 'test_webhook_id',
        },
      };

      expect(isBillingConfigured(config)).toBe(true);
    });

    it('should return false when paypal config is missing', () => {
      const config: Partial<BillingConfig> = {
        provider: 'paypal',
      };

      expect(isBillingConfigured(config)).toBe(false);
    });

    it('should return false when clientId is empty', () => {
      const config: Partial<BillingConfig> = {
        provider: 'paypal',
        paypal: {
          clientId: '',
          clientSecret: 'test_client_secret',
          webhookId: 'test_webhook_id',
        },
      };

      expect(isBillingConfigured(config)).toBe(false);
    });

    it('should return false when clientSecret is empty', () => {
      const config: Partial<BillingConfig> = {
        provider: 'paypal',
        paypal: {
          clientId: 'test_client_id',
          clientSecret: '',
          webhookId: 'test_webhook_id',
        },
      };

      expect(isBillingConfigured(config)).toBe(false);
    });

    it('should return false when both paypal credentials are empty', () => {
      const config: Partial<BillingConfig> = {
        provider: 'paypal',
        paypal: {
          clientId: '',
          clientSecret: '',
          webhookId: 'test_webhook_id',
        },
      };

      expect(isBillingConfigured(config)).toBe(false);
    });
  });

  describe('when provider is unsupported', () => {
    it('should return false for unknown provider', () => {
      const config: Partial<BillingConfig> = {
        provider: 'unsupported' as BillingConfig['provider'],
      };

      expect(isBillingConfigured(config)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty config object', () => {
      const config: Partial<BillingConfig> = {};

      expect(isBillingConfigured(config)).toBe(false);
    });

    it('should handle config with only provider', () => {
      const config: Partial<BillingConfig> = {
        provider: 'stripe',
      };

      expect(isBillingConfigured(config)).toBe(false);
    });
  });
});
