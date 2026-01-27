// apps/server/src/infrastructure/billing/types.ts
/**
 * Billing Infrastructure Types
 *
 * Local type definitions for billing operations.
 * Core types (BillingService, CheckoutParams, etc.) should be imported
 * directly from @abe-stack/core.
 */

// ============================================================================
// Webhook Types (Local)
// ============================================================================

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
