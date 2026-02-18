// main/shared/src/config/env.billing.ts
/**
 * Billing Environment Configuration
 *
 * Billing types, env interface, and validation schema.
 * Merged from config/types/services.ts (billing section) and config/env.ts.
 *
 * @module config/env.billing
 */

import {
  createEnumSchema,
  createSchema,
  parseObject,
  parseOptional,
  parseString,
  withDefault,
} from '../primitives/schema';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Types
// ============================================================================

/** Supported payment providers */
export type BillingProvider = 'stripe' | 'paypal';

/** Stripe provider configuration. */
export interface StripeProviderConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

/** PayPal provider configuration. */
export interface PayPalProviderConfig {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  sandbox: boolean;
}

/** Billing plan price ID mapping. */
export interface BillingPlansConfig {
  free?: string;
  pro?: string;
  enterprise?: string;
}

/** Billing URL configuration. */
export interface BillingUrlsConfig {
  portalReturnUrl: string;
  checkoutSuccessUrl: string;
  checkoutCancelUrl: string;
}

/** Billing and subscription configuration. */
export interface BillingConfig {
  enabled: boolean;
  provider: BillingProvider;
  currency: string;
  stripe: StripeProviderConfig;
  paypal: PayPalProviderConfig;
  plans: BillingPlansConfig;
  urls: BillingUrlsConfig;
}

// ============================================================================
// Env Interface
// ============================================================================

/** Billing environment variables */
export interface BillingEnv {
  BILLING_PROVIDER?: 'stripe' | 'paypal' | undefined;
  STRIPE_SECRET_KEY?: string | undefined;
  STRIPE_PUBLISHABLE_KEY?: string | undefined;
  STRIPE_WEBHOOK_SECRET?: string | undefined;
  PAYPAL_CLIENT_ID?: string | undefined;
  PAYPAL_CLIENT_SECRET?: string | undefined;
  PAYPAL_WEBHOOK_ID?: string | undefined;
  PAYPAL_MODE?: 'sandbox' | 'production' | undefined;
  BILLING_CURRENCY: string;
  PLAN_FREE_ID?: string | undefined;
  PLAN_PRO_ID?: string | undefined;
  PLAN_ENTERPRISE_ID?: string | undefined;
  BILLING_PORTAL_RETURN_URL?: string | undefined;
  BILLING_CHECKOUT_SUCCESS_URL?: string | undefined;
  BILLING_CHECKOUT_CANCEL_URL?: string | undefined;
}

// ============================================================================
// Env Schema
// ============================================================================

export const BillingEnvSchema: Schema<BillingEnv> = createSchema<BillingEnv>((data: unknown) => {
  const obj = parseObject(data, 'BillingEnv');
  return {
    BILLING_PROVIDER: parseOptional(obj['BILLING_PROVIDER'], (v: unknown) =>
      createEnumSchema(['stripe', 'paypal'] as const, 'BILLING_PROVIDER').parse(v),
    ),
    STRIPE_SECRET_KEY: parseOptional(obj['STRIPE_SECRET_KEY'], (v: unknown) =>
      parseString(v, 'STRIPE_SECRET_KEY'),
    ),
    STRIPE_PUBLISHABLE_KEY: parseOptional(obj['STRIPE_PUBLISHABLE_KEY'], (v: unknown) =>
      parseString(v, 'STRIPE_PUBLISHABLE_KEY'),
    ),
    STRIPE_WEBHOOK_SECRET: parseOptional(obj['STRIPE_WEBHOOK_SECRET'], (v: unknown) =>
      parseString(v, 'STRIPE_WEBHOOK_SECRET'),
    ),
    PAYPAL_CLIENT_ID: parseOptional(obj['PAYPAL_CLIENT_ID'], (v: unknown) =>
      parseString(v, 'PAYPAL_CLIENT_ID'),
    ),
    PAYPAL_CLIENT_SECRET: parseOptional(obj['PAYPAL_CLIENT_SECRET'], (v: unknown) =>
      parseString(v, 'PAYPAL_CLIENT_SECRET'),
    ),
    PAYPAL_WEBHOOK_ID: parseOptional(obj['PAYPAL_WEBHOOK_ID'], (v: unknown) =>
      parseString(v, 'PAYPAL_WEBHOOK_ID'),
    ),
    PAYPAL_MODE: parseOptional(obj['PAYPAL_MODE'], (v: unknown) =>
      createEnumSchema(['sandbox', 'production'] as const, 'PAYPAL_MODE').parse(v),
    ),
    BILLING_CURRENCY: parseString(withDefault(obj['BILLING_CURRENCY'], 'usd'), 'BILLING_CURRENCY'),
    PLAN_FREE_ID: parseOptional(obj['PLAN_FREE_ID'], (v: unknown) => parseString(v, 'PLAN_FREE_ID')),
    PLAN_PRO_ID: parseOptional(obj['PLAN_PRO_ID'], (v: unknown) => parseString(v, 'PLAN_PRO_ID')),
    PLAN_ENTERPRISE_ID: parseOptional(obj['PLAN_ENTERPRISE_ID'], (v: unknown) =>
      parseString(v, 'PLAN_ENTERPRISE_ID'),
    ),
    BILLING_PORTAL_RETURN_URL: parseOptional(obj['BILLING_PORTAL_RETURN_URL'], (v: unknown) =>
      parseString(v, 'BILLING_PORTAL_RETURN_URL', { url: true }),
    ),
    BILLING_CHECKOUT_SUCCESS_URL: parseOptional(obj['BILLING_CHECKOUT_SUCCESS_URL'], (v: unknown) =>
      parseString(v, 'BILLING_CHECKOUT_SUCCESS_URL', { url: true }),
    ),
    BILLING_CHECKOUT_CANCEL_URL: parseOptional(obj['BILLING_CHECKOUT_CANCEL_URL'], (v: unknown) =>
      parseString(v, 'BILLING_CHECKOUT_CANCEL_URL', { url: true }),
    ),
  };
});
