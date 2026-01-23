// apps/server/src/config/billing.config.ts
/**
 * Billing Service Configuration
 */

import type { BillingProvider } from '@abe-stack/db';

export interface BillingConfig {
  enabled: boolean;
  provider: BillingProvider;
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
  paypal: {
    clientId: string;
    clientSecret: string;
    webhookId: string;
    sandbox: boolean;
  };
  urls: {
    portalReturnUrl: string;
    checkoutSuccessUrl: string;
    checkoutCancelUrl: string;
  };
}

/**
 * Load billing configuration from environment variables
 */
export function loadBillingConfig(env: Record<string, string | undefined>): BillingConfig {
  // Determine provider:
  // 1. If BILLING_PROVIDER is explicitly set, use it
  // 2. Default to stripe if Stripe keys are present
  // 3. Otherwise disabled
  const explicitProvider = env.BILLING_PROVIDER as BillingProvider | undefined;
  const hasStripe = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY);
  const hasPayPal = Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);

  let provider: BillingProvider = 'stripe';
  let enabled = false;

  if (explicitProvider === 'stripe' || explicitProvider === 'paypal') {
    provider = explicitProvider;
    enabled = explicitProvider === 'stripe' ? hasStripe : hasPayPal;
  } else if (hasStripe) {
    provider = 'stripe';
    enabled = true;
  } else if (hasPayPal) {
    provider = 'paypal';
    enabled = true;
  }

  // Determine base URL for redirects
  const baseUrl = env.APP_URL || env.BASE_URL || 'http://localhost:5173';

  return {
    enabled,
    provider,
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY || '',
      publishableKey: env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    },
    paypal: {
      clientId: env.PAYPAL_CLIENT_ID || '',
      clientSecret: env.PAYPAL_CLIENT_SECRET || '',
      webhookId: env.PAYPAL_WEBHOOK_ID || '',
      sandbox: env.PAYPAL_SANDBOX !== 'false',
    },
    urls: {
      portalReturnUrl:
        env.BILLING_PORTAL_RETURN_URL || `${baseUrl}/settings/billing`,
      checkoutSuccessUrl:
        env.BILLING_CHECKOUT_SUCCESS_URL || `${baseUrl}/billing/success`,
      checkoutCancelUrl:
        env.BILLING_CHECKOUT_CANCEL_URL || `${baseUrl}/pricing`,
    },
  };
}

/**
 * Validate billing configuration
 */
export function validateBillingConfig(config: BillingConfig): string[] {
  const errors: string[] = [];

  if (!config.enabled) {
    // Billing is optional, no errors if disabled
    return errors;
  }

  if (config.provider === 'stripe') {
    if (!config.stripe.secretKey) {
      errors.push('STRIPE_SECRET_KEY is required when billing provider is "stripe"');
    }
    if (!config.stripe.publishableKey) {
      errors.push('STRIPE_PUBLISHABLE_KEY is required when billing provider is "stripe"');
    }
    if (!config.stripe.webhookSecret) {
      errors.push('STRIPE_WEBHOOK_SECRET is required for handling Stripe webhooks');
    }
  }

  if (config.provider === 'paypal') {
    if (!config.paypal.clientId) {
      errors.push('PAYPAL_CLIENT_ID is required when billing provider is "paypal"');
    }
    if (!config.paypal.clientSecret) {
      errors.push('PAYPAL_CLIENT_SECRET is required when billing provider is "paypal"');
    }
  }

  return errors;
}
