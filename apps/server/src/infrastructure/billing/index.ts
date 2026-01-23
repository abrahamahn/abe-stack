// apps/server/src/infrastructure/billing/index.ts
/**
 * Billing Infrastructure
 *
 * Payment provider abstraction and implementations.
 */

// Types
export type {
  BillingConfig,
  CheckoutParams,
  CheckoutResult,
  CreateProductParams,
  CreateProductResult,
  NormalizedEventType,
  NormalizedWebhookEvent,
  PaymentProviderInterface,
  PayPalConfig,
  ProviderInvoice,
  ProviderPaymentMethod,
  ProviderSubscription,
  SetupIntentResult,
  StripeConfig,
} from './types';

// Factory
export { createBillingProvider, isBillingConfigured } from './factory';

// Providers
export { PayPalProvider } from './paypal-provider';
export { StripeProvider } from './stripe-provider';
