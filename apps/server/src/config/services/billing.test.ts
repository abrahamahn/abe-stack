// apps/server/src/config/services/billing.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadBillingConfig, validateBillingConfig } from './billing';

import type { FullEnv } from '@abe-stack/core/config';

/**
 * Creates a base environment with billing-related defaults (as applied by Zod schema).
 * Used to simulate properly parsed FullEnv in tests.
 */
function createBaseEnv(overrides: Partial<FullEnv> = {}): FullEnv {
  return {
    BILLING_CURRENCY: 'usd',
    ...overrides,
  } as unknown as FullEnv;
}

describe('Billing Configuration', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads default configuration when no environment variables are set', () => {
    const env = createBaseEnv();
    const appBaseUrl = 'http://localhost:5173';
    const config = loadBillingConfig(env, appBaseUrl);

    expect(config).toEqual({
      enabled: false,
      provider: 'stripe',
      currency: 'usd',
      stripe: {
        secretKey: '',
        publishableKey: '',
        webhookSecret: '',
      },
      paypal: {
        clientId: '',
        clientSecret: '',
        webhookId: '',
        sandbox: true,
      },
      plans: {},
      urls: {
        portalReturnUrl: 'http://localhost:5173/settings/billing',
        checkoutSuccessUrl: 'http://localhost:5173/billing/success',
        checkoutCancelUrl: 'http://localhost:5173/pricing',
      },
    });
  });

  it('loads stripe configuration when stripe credentials are provided', () => {
    const env = createBaseEnv({
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      BILLING_CURRENCY: 'eur',
      PLAN_FREE_ID: 'free-plan-id',
      PLAN_PRO_ID: 'pro-plan-id',
      PLAN_ENTERPRISE_ID: 'enterprise-plan-id',
      BILLING_PORTAL_RETURN_URL: 'https://example.com/return',
      BILLING_CHECKOUT_SUCCESS_URL: 'https://example.com/success',
      BILLING_CHECKOUT_CANCEL_URL: 'https://example.com/cancel',
    });

    const config = loadBillingConfig(env);

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe('stripe');
    expect(config.currency).toBe('eur');
    expect(config.plans).toEqual({
      free: 'free-plan-id',
      pro: 'pro-plan-id',
      enterprise: 'enterprise-plan-id',
    });
  });

  it('loads paypal configuration and respects production mode', () => {
    const env = createBaseEnv({
      PAYPAL_CLIENT_ID: 'paypal-client-id',
      PAYPAL_CLIENT_SECRET: 'paypal-secret',
      PAYPAL_MODE: 'production',
    });

    const config = loadBillingConfig(env);

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe('paypal');
    expect(config.paypal.sandbox).toBe(false);

    const devConfig = loadBillingConfig(
      createBaseEnv({
        PAYPAL_CLIENT_ID: 'paypal-client-id',
        PAYPAL_CLIENT_SECRET: 'paypal-secret',
        PAYPAL_MODE: 'sandbox',
      }),
    );
    expect(devConfig.paypal.sandbox).toBe(true);
  });

  it('prefers explicitly set billing provider', () => {
    const env = createBaseEnv({
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      PAYPAL_CLIENT_ID: 'paypal-client-id',
      PAYPAL_CLIENT_SECRET: 'paypal-secret',
      BILLING_PROVIDER: 'paypal',
    });

    const config = loadBillingConfig(env);
    expect(config.provider).toBe('paypal');
  });

  it('handles URL construction with trailing slash removal', () => {
    const env = createBaseEnv({
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      APP_URL: 'https://myapp.com/',
    });

    const config = loadBillingConfig(env);
    expect(config.urls.portalReturnUrl).toBe('https://myapp.com/settings/billing');
  });

  describe('Validation Logic', () => {
    it('validateBillingConfig returns errors for missing credentials', () => {
      const config = {
        provider: 'stripe',
        stripe: { secretKey: '', publishableKey: '' },
      } as any;

      const errors = validateBillingConfig(config);
      expect(errors).toContain('STRIPE_SECRET_KEY missing');
      expect(errors).toContain('STRIPE_PUBLISHABLE_KEY missing');
    });

    it('requires webhook secrets in production for security', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const config = {
        provider: 'stripe',
        stripe: { secretKey: 'sk_prod', publishableKey: 'pk_prod', webhookSecret: '' },
      } as any;

      const errors = validateBillingConfig(config);
      expect(errors).toContain('STRIPE_WEBHOOK_SECRET is mandatory in production');
    });

    it('throws when loading configuration with missing mandatory credentials', () => {
      expect(() => {
        loadBillingConfig(
          createBaseEnv({
            BILLING_PROVIDER: 'stripe',
            STRIPE_SECRET_KEY: 'sk_test_123',
            // Missing publishable key
          }),
        );
      }).toThrow(/STRIPE_PUBLISHABLE_KEY missing/);
    });
  });
});
