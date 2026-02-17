// main/shared/src/core/billing/billing.service-types.ts

/**
 * @file Billing Service Types
 * @description Provider-agnostic interface for payment operations. Port that billing provider adapters implement.
 * @module Core/Billing
 */

import type {
  BillingProvider,
  PaymentMethodType,
  PlanInterval,
  SubscriptionStatus,
} from './billing.schemas';

// ============================================================================
// Provider Data Types
// ============================================================================

/** Parameters for creating a checkout session */
export interface CheckoutParams {
  userId: string;
  email: string;
  planId: string;
  priceId: string;
  trialDays?: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/** Result of creating a checkout session */
export interface CheckoutResult {
  sessionId: string;
  url: string;
}

/** Parameters for creating a customer portal session */
export interface PortalSessionParams {
  customerId: string;
  returnUrl: string;
}

/** Result of creating a customer portal session */
export interface PortalSessionResult {
  url: string;
}

/** Provider-normalized subscription data */
export interface ProviderSubscription {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  priceId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialEnd: Date | null;
  metadata: Record<string, string>;
}

/** Provider-normalized payment method */
export interface ProviderPaymentMethod {
  id: string;
  type: PaymentMethodType;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

/** Provider-normalized invoice */
export interface ProviderInvoice {
  id: string;
  customerId: string;
  subscriptionId: string | null;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amountDue: number;
  amountPaid: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  paidAt: Date | null;
  invoicePdfUrl: string | null;
}

/** Parameters for creating a product with pricing */
export interface CreateProductParams {
  name: string;
  description?: string;
  interval: PlanInterval;
  priceInCents: number;
  currency: string;
  metadata?: Record<string, string>;
}

/** Result of creating a product */
export interface CreateProductResult {
  productId: string;
  priceId: string;
}

/** Result of creating a setup intent for payment method collection */
export interface SetupIntentResult {
  clientSecret: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

/** Normalized webhook event types across providers */
export type NormalizedEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'refund.created'
  | 'chargeback.created'
  | 'unknown';

/** Provider-normalized webhook event */
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

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Billing provider port.
 *
 * Provider-agnostic interface for payment operations.
 * Implemented by Stripe, PayPal, or other payment provider adapters.
 */
export interface BillingService {
  /** Provider identifier */
  readonly provider: BillingProvider;

  // Customer Management
  /** Create a customer in the billing provider */
  createCustomer(userId: string, email: string): Promise<string>;

  // Checkout & Subscriptions
  /** Create a checkout session for subscription signup */
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  /** Create a customer portal session for subscription management */
  createPortalSession(params: PortalSessionParams): Promise<PortalSessionResult>;
  /** Cancel a subscription */
  cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<void>;
  /** Resume a canceled subscription */
  resumeSubscription(subscriptionId: string): Promise<void>;
  /** Update a subscription to a new price */
  updateSubscription(subscriptionId: string, newPriceId: string): Promise<void>;
  /** Get subscription details from provider */
  getSubscription(subscriptionId: string): Promise<ProviderSubscription>;

  // Payment Methods
  /** Create a setup intent for collecting payment methods */
  createSetupIntent(customerId: string): Promise<SetupIntentResult>;
  /** List all payment methods for a customer */
  listPaymentMethods(customerId: string): Promise<ProviderPaymentMethod[]>;
  /** Attach a payment method to a customer */
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;
  /** Detach a payment method */
  detachPaymentMethod(paymentMethodId: string): Promise<void>;
  /** Set the default payment method for a customer */
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;

  // Invoices
  /** List invoices for a customer */
  listInvoices(customerId: string, limit?: number): Promise<ProviderInvoice[]>;

  // Products & Prices (Admin)
  /** Create a product with pricing in the provider */
  createProduct(params: CreateProductParams): Promise<CreateProductResult>;
  /** Update a product's name and description */
  updateProduct(productId: string, name: string, description?: string): Promise<void>;
  /** Archive a price in the provider */
  archivePrice(priceId: string): Promise<void>;

  // Webhooks
  /** Verify a webhook signature */
  verifyWebhookSignature(payload: Uint8Array, signature: string): boolean;
  /** Parse and normalize a webhook event */
  parseWebhookEvent(payload: Uint8Array, signature: string): NormalizedWebhookEvent;
}
