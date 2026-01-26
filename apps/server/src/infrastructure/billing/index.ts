// apps/server/src/infrastructure/billing/index.ts
/**
 * Billing Infrastructure
 *
 * Payment provider abstraction and implementations.
 */

// Types
export type * from './types';

// Factory
export { createBillingProvider, isBillingConfigured } from './factory';

// Providers
export { PayPalProvider } from './paypal-provider';
export { StripeProvider } from './stripe-provider';

