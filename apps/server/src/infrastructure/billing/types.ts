// apps/server/src/infrastructure/billing/types.ts
/**
 * Billing Provider Types
 *
 * Provider-agnostic interface for payment operations.
 * Implementations: Stripe, PayPal (future)
 */

import type {
  BillingProvider,
  PaymentMethodType,
  PlanInterval,
  SubscriptionStatus,
} from '@abe-stack/db';

// ============================================================================
// Configuration Types
// ============================================================================

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  sandbox: boolean;
}

export interface BillingConfig {
  provider: BillingProvider;
  stripe?: StripeConfig;
  paypal?: PayPalConfig;
  portalReturnUrl: string;
  checkoutSuccessUrl: string;
  checkoutCancelUrl: string;
}

// ============================================================================
// Provider Data Types
// ============================================================================

/**
 * Checkout session creation params
 */
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

/**
 * Checkout session result
 */
export interface CheckoutResult {
  sessionId: string;
  url: string;
}

/**
 * Subscription data from provider
 */
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

/**
 * Payment method data from provider
 */
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

/**
 * Invoice data from provider
 */
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

/**
 * Product/Price creation params for admin
 */
export interface CreateProductParams {
  name: string;
  description?: string;
  interval: PlanInterval;
  priceInCents: number;
  currency: string;
  metadata?: Record<string, string>;
}

/**
 * Product/Price creation result
 */
export interface CreateProductResult {
  productId: string;
  priceId: string;
}

/**
 * Setup intent for adding payment methods
 */
export interface SetupIntentResult {
  clientSecret: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Normalized webhook event type
 */
export type NormalizedEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'refund.created'
  | 'chargeback.created'
  | 'unknown';

/**
 * Normalized webhook event
 */
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
 * Payment provider interface
 *
 * Abstracts payment operations so Stripe and PayPal (later) share the same API.
 */
export interface PaymentProviderInterface {
  /** Provider identifier */
  readonly provider: BillingProvider;

  // -------------------------------------------------------------------------
  // Customer Management
  // -------------------------------------------------------------------------

  /**
   * Create a customer in the provider
   */
  createCustomer(userId: string, email: string): Promise<string>;

  // -------------------------------------------------------------------------
  // Checkout & Subscriptions
  // -------------------------------------------------------------------------

  /**
   * Create a checkout session for new subscription
   */
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;

  /**
   * Cancel a subscription
   * @param immediately If true, cancel immediately; otherwise at period end
   */
  cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<void>;

  /**
   * Resume a subscription that was set to cancel at period end
   */
  resumeSubscription(subscriptionId: string): Promise<void>;

  /**
   * Update subscription to a new plan
   */
  updateSubscription(subscriptionId: string, newPriceId: string): Promise<void>;

  /**
   * Get subscription details from provider
   */
  getSubscription(subscriptionId: string): Promise<ProviderSubscription>;

  // -------------------------------------------------------------------------
  // Payment Methods
  // -------------------------------------------------------------------------

  /**
   * Create a setup intent for adding payment methods
   */
  createSetupIntent(customerId: string): Promise<SetupIntentResult>;

  /**
   * List payment methods for a customer
   */
  listPaymentMethods(customerId: string): Promise<ProviderPaymentMethod[]>;

  /**
   * Attach a payment method to a customer
   */
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;

  /**
   * Detach a payment method from a customer
   */
  detachPaymentMethod(paymentMethodId: string): Promise<void>;

  /**
   * Set default payment method for a customer
   */
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;

  // -------------------------------------------------------------------------
  // Invoices
  // -------------------------------------------------------------------------

  /**
   * List invoices for a customer
   */
  listInvoices(customerId: string, limit?: number): Promise<ProviderInvoice[]>;

  // -------------------------------------------------------------------------
  // Products & Prices (Admin)
  // -------------------------------------------------------------------------

  /**
   * Create a product and price in the provider
   */
  createProduct(params: CreateProductParams): Promise<CreateProductResult>;

  /**
   * Update a product in the provider
   */
  updateProduct(productId: string, name: string, description?: string): Promise<void>;

  /**
   * Archive a price (cannot delete active prices)
   */
  archivePrice(priceId: string): Promise<void>;

  // -------------------------------------------------------------------------
  // Webhooks
  // -------------------------------------------------------------------------

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: Buffer, signature: string): boolean;

  /**
   * Parse webhook payload into normalized event
   */
  parseWebhookEvent(payload: Buffer, signature: string): NormalizedWebhookEvent;
}
