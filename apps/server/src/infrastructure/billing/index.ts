// apps/server/src/infrastructure/billing/index.ts
/**
 * Billing Infrastructure
 *
 * Payment provider abstraction and implementations.
 *
 * Note: Core billing types (BillingService, CheckoutParams, etc.) should be
 * imported directly from @abe-stack/core.
 */

// Local webhook/setup types
export type { NormalizedEventType, NormalizedWebhookEvent, SetupIntentResult } from './types';

// Factory
export { createBillingProvider, isBillingConfigured } from './factory';

// Providers
export { PayPalProvider } from './paypal-provider';
export { StripeProvider } from './stripe-provider';
