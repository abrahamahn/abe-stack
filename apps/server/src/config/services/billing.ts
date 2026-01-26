// apps/server/src/config/services/billing.ts
import type { BillingConfig, BillingProvider, FullEnv } from '@abe-stack/core/config';

/**
 * Load Billing Configuration.
 *
 * **Provider Strategy**:
 * - **Stripe**: Primary payment processor (Subscriptions, Checkout).
 * - **PayPal**: Alternative fallback.
 *
 * **Safety**:
 * Automatically disables billing if credentials are missing to prevent runtime crashes.
 *
 * @param env - Environment variable map
 * @returns Complete billing configuration
 *
 * @example
 * ```env
 * # Stripe (primary)
 * STRIPE_SECRET_KEY=sk_test_...
 * STRIPE_PUBLISHABLE_KEY=pk_test_...
 *
 * # PayPal (alternative)
 * PAYPAL_CLIENT_ID=...
 * PAYPAL_CLIENT_SECRET=...
 * ```
 */
export function loadBillingConfig(env: FullEnv, appBaseUrl?: string): BillingConfig {
  // Use passed URL or fall back to env/default
  const appUrl = (appBaseUrl ?? env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');

  // 1. Check which provider keys are present
  const availability = {
    stripe: (env.STRIPE_SECRET_KEY != null && env.STRIPE_SECRET_KEY !== '') && (env.STRIPE_PUBLISHABLE_KEY != null && env.STRIPE_PUBLISHABLE_KEY !== ''),
    paypal: (env.PAYPAL_CLIENT_ID != null && env.PAYPAL_CLIENT_ID !== '') && (env.PAYPAL_CLIENT_SECRET != null && env.PAYPAL_CLIENT_SECRET !== ''),
  };

  // 2. Resolve active provider (Explicit Choice > Stripe > PayPal)
  const provider = resolveActiveProvider(
    env.BILLING_PROVIDER as BillingProvider | undefined,
    availability,
  );

  const config: BillingConfig = {
    enabled: Boolean(provider),
    provider: provider ?? 'stripe',

    // Global Commerce Settings
    currency: env.BILLING_CURRENCY,

    // Stripe Configuration
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY ?? '',
      publishableKey: env.STRIPE_PUBLISHABLE_KEY ?? '',
      webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? '',
    },

    // PayPal Configuration
    paypal: {
      clientId: env.PAYPAL_CLIENT_ID ?? '',
      clientSecret: env.PAYPAL_CLIENT_SECRET ?? '',
      webhookId: env.PAYPAL_WEBHOOK_ID ?? '',
      // Explicitly check for 'production' string to disable sandbox
      sandbox: env.PAYPAL_MODE !== 'production',
    },

    // SaaS Plan IDs (The "Business" logic)
    plans: {
      free: env.PLAN_FREE_ID,
      pro: env.PLAN_PRO_ID,
      enterprise: env.PLAN_ENTERPRISE_ID,
    },

    urls: {
      portalReturnUrl: env.BILLING_PORTAL_RETURN_URL ?? `${appUrl}/settings/billing`,
      checkoutSuccessUrl: env.BILLING_CHECKOUT_SUCCESS_URL ?? `${appUrl}/billing/success`,
      checkoutCancelUrl: env.BILLING_CHECKOUT_CANCEL_URL ?? `${appUrl}/pricing`,
    },
  };

  if (config.enabled) {
    ensureValid(config);
  }

  return config;
}

function resolveActiveProvider(
  explicit: BillingProvider | undefined,
  avail: { stripe: boolean; paypal: boolean },
): BillingProvider | null {
  if (explicit != null) return explicit;

  // Auto-detection logic if no explicit provider is set
  if (avail.stripe) return 'stripe';
  if (avail.paypal) return 'paypal';
  return null;
}

export function validateBillingConfig(config: BillingConfig): string[] {
  const errors: string[] = [];
  const isProd = process.env.NODE_ENV === 'production';

  if (config.provider === 'stripe') {
    if (config.stripe.secretKey === '') errors.push('STRIPE_SECRET_KEY missing');
    if (config.stripe.publishableKey === '') errors.push('STRIPE_PUBLISHABLE_KEY missing');
    if (isProd && config.stripe.webhookSecret === '') {
      errors.push('STRIPE_WEBHOOK_SECRET is mandatory in production');
    }
  }

  if (config.provider === 'paypal') {
    if (config.paypal.clientId === '') errors.push('PAYPAL_CLIENT_ID missing');
    if (config.paypal.clientSecret === '') errors.push('PAYPAL_CLIENT_SECRET missing');
  }

  return errors;
}

function ensureValid(config: BillingConfig): void {
  const errors = validateBillingConfig(config);
  if (errors.length > 0) {
    throw new Error(`Billing Configuration Failed:\n${errors.map((e) => ` - ${e}`).join('\n')}`);
  }
}
