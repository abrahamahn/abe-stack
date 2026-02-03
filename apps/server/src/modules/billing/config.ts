// modules/billing/src/config.ts
import type {
  BillingConfig,
  BillingPlansConfig,
  BillingProvider,
  FullEnv,
} from '@abe-stack/shared/config';

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
 * @param appBaseUrl - Application base URL for redirect URLs
 * @returns Complete billing configuration
 * @complexity O(1)
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
    stripe:
      env.STRIPE_SECRET_KEY != null &&
      env.STRIPE_SECRET_KEY !== '' &&
      env.STRIPE_PUBLISHABLE_KEY != null &&
      env.STRIPE_PUBLISHABLE_KEY !== '',
    paypal:
      env.PAYPAL_CLIENT_ID != null &&
      env.PAYPAL_CLIENT_ID !== '' &&
      env.PAYPAL_CLIENT_SECRET != null &&
      env.PAYPAL_CLIENT_SECRET !== '',
  };

  // 2. Resolve active provider (Explicit Choice > Stripe > PayPal)
  const provider = resolveActiveProvider(env.BILLING_PROVIDER, availability);

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
    plans: ((): BillingPlansConfig => {
      const plans: BillingPlansConfig = {};
      if (env.PLAN_FREE_ID !== undefined) {
        plans.free = env.PLAN_FREE_ID;
      }
      if (env.PLAN_PRO_ID !== undefined) {
        plans.pro = env.PLAN_PRO_ID;
      }
      if (env.PLAN_ENTERPRISE_ID !== undefined) {
        plans.enterprise = env.PLAN_ENTERPRISE_ID;
      }
      return plans;
    })(),

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

/**
 * Resolves which billing provider to use based on explicit choice and credential availability.
 *
 * @param explicit - Explicitly configured provider from environment
 * @param avail - Availability flags for each provider
 * @returns The resolved provider or null if none available
 * @complexity O(1)
 */
function resolveActiveProvider(
  explicit: BillingProvider | undefined,
  avail: { stripe: boolean; paypal: boolean },
): BillingProvider | null {
  const isProd = process.env['NODE_ENV'] === 'production';

  // In production: If explicit provider is set, use it (validation will fail if credentials missing)
  // In development: Only use explicit provider if credentials are available
  if (explicit != null) {
    if (isProd) {
      // Production: Always respect explicit provider (will fail validation if misconfigured)
      return explicit;
    }
    // Development: Only enable if credentials are available
    if (explicit === 'stripe' && avail.stripe) return 'stripe';
    if (explicit === 'paypal' && avail.paypal) return 'paypal';
    // Credentials missing in dev - silently disable billing
    return null;
  }

  // Auto-detection logic if no explicit provider is set
  if (avail.stripe) return 'stripe';
  if (avail.paypal) return 'paypal';
  return null;
}

/**
 * Validates billing configuration for production readiness.
 *
 * @param config - Billing configuration to validate
 * @returns Array of validation error messages (empty if valid)
 * @complexity O(1)
 */
export function validateBillingConfig(config: BillingConfig): string[] {
  const errors: string[] = [];
  const isProd = process.env['NODE_ENV'] === 'production';

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

/**
 * Throws if billing configuration has validation errors.
 *
 * @param config - Billing configuration to validate
 * @throws {Error} If configuration is invalid
 */
function ensureValid(config: BillingConfig): void {
  const errors = validateBillingConfig(config);
  if (errors.length > 0) {
    throw new Error(`Billing Configuration Failed:\n${errors.map((e) => ` - ${e}`).join('\n')}`);
  }
}
