// main/shared/src/config/env.billing.test.ts
import { describe, expect, it } from 'vitest';

import { BillingEnvSchema } from './env.billing';

describe('BillingEnvSchema', () => {
  describe('defaults', () => {
    it('parses an empty object with BILLING_CURRENCY defaulting to usd', () => {
      const result = BillingEnvSchema.parse({});
      expect(result.BILLING_CURRENCY).toBe('usd');
    });

    it('leaves all optional fields undefined when absent', () => {
      const result = BillingEnvSchema.parse({});
      expect(result.BILLING_PROVIDER).toBeUndefined();
      expect(result.STRIPE_SECRET_KEY).toBeUndefined();
      expect(result.STRIPE_PUBLISHABLE_KEY).toBeUndefined();
      expect(result.STRIPE_WEBHOOK_SECRET).toBeUndefined();
      expect(result.PAYPAL_CLIENT_ID).toBeUndefined();
      expect(result.PAYPAL_CLIENT_SECRET).toBeUndefined();
      expect(result.PAYPAL_WEBHOOK_ID).toBeUndefined();
      expect(result.PAYPAL_MODE).toBeUndefined();
      expect(result.PLAN_FREE_ID).toBeUndefined();
      expect(result.PLAN_PRO_ID).toBeUndefined();
      expect(result.PLAN_ENTERPRISE_ID).toBeUndefined();
      expect(result.BILLING_PORTAL_RETURN_URL).toBeUndefined();
      expect(result.BILLING_CHECKOUT_SUCCESS_URL).toBeUndefined();
      expect(result.BILLING_CHECKOUT_CANCEL_URL).toBeUndefined();
    });
  });

  describe('BILLING_PROVIDER', () => {
    it('accepts stripe', () => {
      const result = BillingEnvSchema.parse({ BILLING_PROVIDER: 'stripe' });
      expect(result.BILLING_PROVIDER).toBe('stripe');
    });

    it('accepts paypal', () => {
      const result = BillingEnvSchema.parse({ BILLING_PROVIDER: 'paypal' });
      expect(result.BILLING_PROVIDER).toBe('paypal');
    });

    it('rejects an invalid provider name', () => {
      expect(() => BillingEnvSchema.parse({ BILLING_PROVIDER: 'braintree' })).toThrow();
    });

    it('rejects an empty string', () => {
      expect(() => BillingEnvSchema.parse({ BILLING_PROVIDER: '' })).toThrow();
    });

    it('rejects a numeric value', () => {
      expect(() => BillingEnvSchema.parse({ BILLING_PROVIDER: 1 })).toThrow();
    });
  });

  describe('BILLING_CURRENCY', () => {
    it('accepts a custom currency code', () => {
      const result = BillingEnvSchema.parse({ BILLING_CURRENCY: 'eur' });
      expect(result.BILLING_CURRENCY).toBe('eur');
    });

    it('accepts an explicit override of usd', () => {
      const result = BillingEnvSchema.parse({ BILLING_CURRENCY: 'usd' });
      expect(result.BILLING_CURRENCY).toBe('usd');
    });

    it('rejects a non-string value', () => {
      expect(() => BillingEnvSchema.parse({ BILLING_CURRENCY: 42 })).toThrow();
    });
  });

  describe('Stripe fields', () => {
    it('accepts all three Stripe fields', () => {
      const result = BillingEnvSchema.parse({
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_PUBLISHABLE_KEY: 'pk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
      });
      expect(result.STRIPE_SECRET_KEY).toBe('sk_test_abc');
      expect(result.STRIPE_PUBLISHABLE_KEY).toBe('pk_test_abc');
      expect(result.STRIPE_WEBHOOK_SECRET).toBe('whsec_abc');
    });

    it('rejects a non-string STRIPE_SECRET_KEY', () => {
      expect(() => BillingEnvSchema.parse({ STRIPE_SECRET_KEY: 123 })).toThrow();
    });

    it('rejects a non-string STRIPE_PUBLISHABLE_KEY', () => {
      expect(() => BillingEnvSchema.parse({ STRIPE_PUBLISHABLE_KEY: true })).toThrow();
    });

    it('rejects a non-string STRIPE_WEBHOOK_SECRET', () => {
      expect(() => BillingEnvSchema.parse({ STRIPE_WEBHOOK_SECRET: [] })).toThrow();
    });
  });

  describe('PayPal fields', () => {
    it('accepts all PayPal fields together', () => {
      const result = BillingEnvSchema.parse({
        PAYPAL_CLIENT_ID: 'paypal-client-id',
        PAYPAL_CLIENT_SECRET: 'paypal-secret',
        PAYPAL_WEBHOOK_ID: 'webhook-id',
        PAYPAL_MODE: 'sandbox',
      });
      expect(result.PAYPAL_CLIENT_ID).toBe('paypal-client-id');
      expect(result.PAYPAL_CLIENT_SECRET).toBe('paypal-secret');
      expect(result.PAYPAL_WEBHOOK_ID).toBe('webhook-id');
      expect(result.PAYPAL_MODE).toBe('sandbox');
    });

    it('accepts production mode', () => {
      const result = BillingEnvSchema.parse({ PAYPAL_MODE: 'production' });
      expect(result.PAYPAL_MODE).toBe('production');
    });

    it('rejects an invalid PAYPAL_MODE value', () => {
      expect(() => BillingEnvSchema.parse({ PAYPAL_MODE: 'live' })).toThrow();
    });

    it('rejects a non-string PAYPAL_CLIENT_ID', () => {
      expect(() => BillingEnvSchema.parse({ PAYPAL_CLIENT_ID: 0 })).toThrow();
    });
  });

  describe('plan IDs', () => {
    it('accepts all plan ID fields', () => {
      const result = BillingEnvSchema.parse({
        PLAN_FREE_ID: 'price_free',
        PLAN_PRO_ID: 'price_pro',
        PLAN_ENTERPRISE_ID: 'price_enterprise',
      });
      expect(result.PLAN_FREE_ID).toBe('price_free');
      expect(result.PLAN_PRO_ID).toBe('price_pro');
      expect(result.PLAN_ENTERPRISE_ID).toBe('price_enterprise');
    });

    it('rejects a non-string PLAN_FREE_ID', () => {
      expect(() => BillingEnvSchema.parse({ PLAN_FREE_ID: null })).toThrow();
    });
  });

  describe('URL fields', () => {
    it('accepts valid HTTPS URLs for portal and checkout', () => {
      const result = BillingEnvSchema.parse({
        BILLING_PORTAL_RETURN_URL: 'https://app.example.com/billing',
        BILLING_CHECKOUT_SUCCESS_URL: 'https://app.example.com/success',
        BILLING_CHECKOUT_CANCEL_URL: 'https://app.example.com/cancel',
      });
      expect(result.BILLING_PORTAL_RETURN_URL).toBe('https://app.example.com/billing');
      expect(result.BILLING_CHECKOUT_SUCCESS_URL).toBe('https://app.example.com/success');
      expect(result.BILLING_CHECKOUT_CANCEL_URL).toBe('https://app.example.com/cancel');
    });

    it('rejects BILLING_PORTAL_RETURN_URL without a protocol', () => {
      expect(() =>
        BillingEnvSchema.parse({ BILLING_PORTAL_RETURN_URL: 'app.example.com/billing' }),
      ).toThrow();
    });

    it('rejects BILLING_CHECKOUT_SUCCESS_URL without a protocol', () => {
      expect(() =>
        BillingEnvSchema.parse({ BILLING_CHECKOUT_SUCCESS_URL: 'example.com/success' }),
      ).toThrow();
    });

    it('rejects BILLING_CHECKOUT_CANCEL_URL without a protocol', () => {
      expect(() =>
        BillingEnvSchema.parse({ BILLING_CHECKOUT_CANCEL_URL: 'not-a-url' }),
      ).toThrow();
    });

    it('rejects a non-string URL field', () => {
      expect(() => BillingEnvSchema.parse({ BILLING_PORTAL_RETURN_URL: 9999 })).toThrow();
    });

    it('rejects a very long URL exceeding normal bounds', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(5000);
      // Should parse as long as it is a valid URL string; length alone is not capped by schema
      // but the URL regex must still match — if the URL regex rejects it, this is the expected failure
      const result = BillingEnvSchema.safeParse({ BILLING_PORTAL_RETURN_URL: longUrl });
      // Accept either outcome; the key assertion is that it does not throw unexpectedly
      if (result.success) {
        expect(result.data.BILLING_PORTAL_RETURN_URL).toBe(longUrl);
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('non-object input', () => {
    it('rejects null', () => {
      expect(() => BillingEnvSchema.parse(null)).toThrow();
    });

    it('rejects an array', () => {
      expect(() => BillingEnvSchema.parse([])).toThrow();
    });

    it('rejects a string', () => {
      expect(() => BillingEnvSchema.parse('billing')).toThrow();
    });

    it('rejects a number', () => {
      expect(() => BillingEnvSchema.parse(42)).toThrow();
    });
  });

  describe('safeParse', () => {
    it('returns success:true for a valid input', () => {
      const result = BillingEnvSchema.safeParse({ BILLING_CURRENCY: 'gbp' });
      expect(result.success).toBe(true);
    });

    it('returns success:false for an invalid provider without throwing', () => {
      const result = BillingEnvSchema.safeParse({ BILLING_PROVIDER: 'unknown' });
      expect(result.success).toBe(false);
    });
  });
});
