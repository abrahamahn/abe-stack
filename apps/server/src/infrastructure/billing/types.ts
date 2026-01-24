/**
 * Billing Infrastructure Types
 *
 * Re-exports contract types from @abe-stack/core to ensure
 * consistency across the application.
 */

// Export from core
export type {
  BillingConfig,
  BillingService,
  CheckoutParams,
  CheckoutResult,
  CreateProductParams,
  CreateProductResult,
  PayPalProviderConfig as PayPalConfig,
  ProviderInvoice,
  ProviderPaymentMethod,
  ProviderSubscription,
  StripeProviderConfig as StripeConfig,
} from '@abe-stack/core';

// Workaround: Define types locally if import fails
export type NormalizedEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'refund.created'
  | 'chargeback.created'
  | 'unknown';

export interface NormalizedWebhookEvent {
  id: string;
  type: NormalizedEventType;
  data: {
    subscriptionId?: string;
    customerId?: string;
    invoiceId?: string;
    status?: string;
    metadata?: Record<string, string>;
    raw: unknown;
  };
  createdAt: Date;
}

export interface SetupIntentResult {
  clientSecret: string;
}
