// infra/contracts/src/billing/service.ts
/**
 * Billing Service Contract
 *
 * Provider-agnostic interface for payment operations.
 */

import type {
  BillingProvider,
  PaymentMethodType,
  PlanInterval,
  SubscriptionStatus,
} from './billing';

// ============================================================================
// Provider Data Types
// ============================================================================

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

export interface CheckoutResult {
  sessionId: string;
  url: string;
}

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

export interface CreateProductParams {
  name: string;
  description?: string;
  interval: PlanInterval;
  priceInCents: number;
  currency: string;
  metadata?: Record<string, string>;
}

export interface CreateProductResult {
  productId: string;
  priceId: string;
}

export interface SetupIntentResult {
  clientSecret: string;
}

// ============================================================================
// Webhook Types
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

// ============================================================================
// Provider Interface
// ============================================================================

export interface BillingService {
  /** Provider identifier */
  readonly provider: BillingProvider;

  // Customer Management
  createCustomer(userId: string, email: string): Promise<string>;

  // Checkout & Subscriptions
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;
  updateSubscription(subscriptionId: string, newPriceId: string): Promise<void>;
  getSubscription(subscriptionId: string): Promise<ProviderSubscription>;

  // Payment Methods
  createSetupIntent(customerId: string): Promise<SetupIntentResult>;
  listPaymentMethods(customerId: string): Promise<ProviderPaymentMethod[]>;
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;
  detachPaymentMethod(paymentMethodId: string): Promise<void>;
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;

  // Invoices
  listInvoices(customerId: string, limit?: number): Promise<ProviderInvoice[]>;

  // Products & Prices (Admin)
  createProduct(params: CreateProductParams): Promise<CreateProductResult>;
  updateProduct(productId: string, name: string, description?: string): Promise<void>;
  archivePrice(priceId: string): Promise<void>;

  // Webhooks
  verifyWebhookSignature(payload: Uint8Array, signature: string): boolean;
  parseWebhookEvent(payload: Uint8Array, signature: string): NormalizedWebhookEvent;
}
