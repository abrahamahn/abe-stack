// apps/server/src/config/services/billing.test.ts
import type { BillingConfig, FullEnv } from '@abe-stack/core/contracts/config';
import { describe, expect, it } from 'vitest';
import { loadBilling, validateBilling } from './billing';

describe('Billing Configuration', () => {
  it('loads default configuration when no environment variables are set', () => {
    const env = {} as unknown as FullEnv;
    const appBaseUrl = 'http://localhost:5173';
    const config = loadBilling(env, appBaseUrl);

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
      plans: {
        free: undefined,
        pro: undefined,
        enterprise: undefined,
      },
      urls: {
        portalReturnUrl: 'http://localhost:5173/settings/billing',
        checkoutSuccessUrl: 'http://localhost:5173/billing/success',
        checkoutCancelUrl: 'http://localhost:5173/pricing',
      },
    });
  });

  it('loads stripe configuration when stripe credentials are provided', () => {
    const env = {
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      BILLING_CURRENCY: 'eur',
      PLAN_FREE_ID: 'free-plan-id',
      PLAN_PRO_ID: 'pro-plan-id',
      PLAN_ENTERPRISE_ID: 'enterprise-plan-id',
      BILLING_PORTAL_RETURN_URL: 'https://example.com/return',
      BILLING_CHECKOUT_SUCCESS_URL: 'https://example.com/success',
      BILLING_CHECKOUT_CANCEL_URL: 'https://example.com/cancel',
    } as unknown as FullEnv;

    const appBaseUrl = 'http://localhost:5173';
    const config = loadBilling(env, appBaseUrl);

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe('stripe');
    expect(config.currency).toBe('eur');
    expect(config.stripe).toEqual({
      secretKey: 'sk_test_123',
      publishableKey: 'pk_test_123',
      webhookSecret: '',
    });
    expect(config.plans).toEqual({
      free: 'free-plan-id',
      pro: 'pro-plan-id',
      enterprise: 'enterprise-plan-id',
    });
    expect(config.urls).toEqual({
      portalReturnUrl: 'https://example.com/return',
      checkoutSuccessUrl: 'https://example.com/success',
      checkoutCancelUrl: 'https://example.com/cancel',
    });
  });

  it('loads paypal configuration when paypal credentials are provided', () => {
    const env = {
      PAYPAL_CLIENT_ID: 'paypal-client-id',
      PAYPAL_CLIENT_SECRET: 'paypal-secret',
      BILLING_CURRENCY: 'gbp',
      PAYPAL_MODE: 'production',
    } as unknown as FullEnv;

    const appBaseUrl = 'http://localhost:5173';
    const config = loadBilling(env, appBaseUrl);

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe('paypal');
    expect(config.currency).toBe('gbp');
    expect(config.paypal).toEqual({
      clientId: 'paypal-client-id',
      clientSecret: 'paypal-secret',
      webhookId: '',
      sandbox: false, // because PAYPAL_MODE is 'production'
    });
  });

  it('prefers explicitly set billing provider', () => {
    const env = {
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      PAYPAL_CLIENT_ID: 'paypal-client-id',
      PAYPAL_CLIENT_SECRET: 'paypal-secret',
      BILLING_PROVIDER: 'paypal', // Explicitly set to paypal
    } as unknown as FullEnv;

    const appBaseUrl = 'http://localhost:5173';
    const config = loadBilling(env, appBaseUrl);

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe('paypal');
  });

  it('defaults to stripe when both providers are available but no explicit provider is set', () => {
    const env = {
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      PAYPAL_CLIENT_ID: 'paypal-client-id',
      PAYPAL_CLIENT_SECRET: 'paypal-secret',
    } as unknown as FullEnv;

    const appBaseUrl = 'http://localhost:5173';
    const config = loadBilling(env, appBaseUrl);

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe('stripe');
  });

  it('uses appBaseUrl parameter for URL construction when provided', () => {
    const env = {
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
    } as unknown as FullEnv;

    const appBaseUrl = 'https://myapp.com';
    const config = loadBilling(env, appBaseUrl);

    expect(config.urls.portalReturnUrl).toBe('https://myapp.com/settings/billing');
    expect(config.urls.checkoutSuccessUrl).toBe('https://myapp.com/billing/success');
    expect(config.urls.checkoutCancelUrl).toBe('https://myapp.com/pricing');
  });

  it('falls back to APP_URL environment variable for URL construction when appBaseUrl is not provided', () => {
    const env = {
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      APP_URL: 'https://myapp.com',
    } as unknown as FullEnv;

    const config = loadBilling(env);

    expect(config.urls.portalReturnUrl).toBe('https://myapp.com/settings/billing');
    expect(config.urls.checkoutSuccessUrl).toBe('https://myapp.com/billing/success');
    expect(config.urls.checkoutCancelUrl).toBe('https://myapp.com/pricing');
  });

  it('defaults to localhost when neither appBaseUrl nor APP_URL is provided', () => {
    const env = {
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
    } as unknown as FullEnv;

    const config = loadBilling(env);

    expect(config.urls.portalReturnUrl).toBe('http://localhost:5173/settings/billing');
    expect(config.urls.checkoutSuccessUrl).toBe('http://localhost:5173/billing/success');
    expect(config.urls.checkoutCancelUrl).toBe('http://localhost:5173/pricing');
  });

  it('handles trailing slash removal from appBaseUrl', () => {
    const env = {
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
    } as unknown as FullEnv;

    const appBaseUrl = 'https://myapp.com/';
    const config = loadBilling(env, appBaseUrl);

    expect(config.urls.portalReturnUrl).toBe('https://myapp.com/settings/billing');
    expect(config.urls.checkoutSuccessUrl).toBe('https://myapp.com/billing/success');
    expect(config.urls.checkoutCancelUrl).toBe('https://myapp.com/pricing');
  });

  it('validateBilling returns errors for invalid stripe config', () => {
    const config = {
      enabled: true,
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
      plans: {
        free: undefined,
        pro: undefined,
        enterprise: undefined,
      },
      urls: {
        portalReturnUrl: 'http://localhost:5173/settings/billing',
        checkoutSuccessUrl: 'http://localhost:5173/billing/success',
        checkoutCancelUrl: 'http://localhost:5173/pricing',
      },
    } satisfies BillingConfig;

    const errors = validateBilling(config);
    expect(errors).toContain('STRIPE_SECRET_KEY missing');
    expect(errors).toContain('STRIPE_PUBLISHABLE_KEY missing');
  });

  it('validateBilling returns errors for invalid paypal config', () => {
    const config = {
      enabled: true,
      provider: 'paypal',
      currency: 'usd',
      stripe: {
        secretKey: 'sk_test_123',
        publishableKey: 'pk_test_123',
        webhookSecret: 'wh_test_123',
      },
      paypal: {
        clientId: '',
        clientSecret: '',
        webhookId: '',
        sandbox: true,
      },
      plans: {
        free: undefined,
        pro: undefined,
        enterprise: undefined,
      },
      urls: {
        portalReturnUrl: 'http://localhost:5173/settings/billing',
        checkoutSuccessUrl: 'http://localhost:5173/billing/success',
        checkoutCancelUrl: 'http://localhost:5173/pricing',
      },
    } satisfies BillingConfig;

    const errors = validateBilling(config);
    expect(errors).toContain('PAYPAL_CLIENT_ID missing');
    expect(errors).toContain('PAYPAL_CLIENT_SECRET missing');
  });

  it('validateBilling returns no errors for valid stripe config', () => {
    const config = {
      enabled: true,
      provider: 'stripe',
      currency: 'usd',
      stripe: {
        secretKey: 'sk_test_123',
        publishableKey: 'pk_test_123',
        webhookSecret: 'wh_test_123',
      },
      paypal: {
        clientId: '',
        clientSecret: '',
        webhookId: '',
        sandbox: true,
      },
      plans: {
        free: undefined,
        pro: undefined,
        enterprise: undefined,
      },
      urls: {
        portalReturnUrl: 'http://localhost:5173/settings/billing',
        checkoutSuccessUrl: 'http://localhost:5173/billing/success',
        checkoutCancelUrl: 'http://localhost:5173/pricing',
      },
    } satisfies BillingConfig;

    const errors = validateBilling(config);
    expect(errors).toHaveLength(0);
  });

  it('validateBilling returns no errors for valid paypal config', () => {
    const config = {
      enabled: true,
      provider: 'paypal',
      currency: 'usd',
      stripe: {
        secretKey: '',
        publishableKey: '',
        webhookSecret: '',
      },
      paypal: {
        clientId: 'client_id',
        clientSecret: 'client_secret',
        webhookId: 'webhook_id',
        sandbox: true,
      },
      plans: {
        free: undefined,
        pro: undefined,
        enterprise: undefined,
      },
      urls: {
        portalReturnUrl: 'http://localhost:5173/settings/billing',
        checkoutSuccessUrl: 'http://localhost:5173/billing/success',
        checkoutCancelUrl: 'http://localhost:5173/pricing',
      },
    } satisfies BillingConfig;

    const errors = validateBilling(config);
    expect(errors).toHaveLength(0);
  });

  // Ensure env cleanup happens even if tests fail
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires webhook secrets in production for security', () => {
    // Mock production environment
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => {
      loadBilling({
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
        // Missing STRIPE_WEBHOOK_SECRET
      } as unknown as FullEnv);
    }).toThrow(/STRIPE_WEBHOOK_SECRET is mandatory/);
  });

  it('correctly maps the Enterprise Plan ID', () => {
    const env = {
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
      PLAN_ENTERPRISE_ID: 'price_premium_123',
    } as unknown as FullEnv;

    const config = loadBilling(env);
    expect(config.plans.enterprise).toBe('price_premium_123');
  });
});
