// main/server/db/src/schema/billing.ts
/**
 * Billing Schema Types
 *
 * Explicit TypeScript interfaces for billing-related tables:
 * - plans: Pricing plan definitions
 * - subscriptions: User subscription records
 * - customer_mappings: userId ↔ provider customerId mapping
 * - invoices: Invoice records from providers
 * - payment_methods: Stored payment methods
 * - billing_events: Webhook idempotency tracking
 */

import {
  BILLING_EVENT_TYPES,
  BILLING_PROVIDERS,
  INVOICE_STATUSES,
  PAYMENT_METHOD_TYPES,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type BillingEventType,
  type BillingProvider,
  type CardDetails,
  type InvoiceStatus,
  type PaymentMethodType,
  type PlanFeature,
  type PlanInterval,
  type SubscriptionStatus,
} from '@bslt/shared';

// Re-export shared constants for consumers that import from schema
export {
  BILLING_EVENT_TYPES,
  BILLING_PROVIDERS,
  INVOICE_STATUSES,
  PAYMENT_METHOD_TYPES,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
};
export type {
  BillingEventType,
  BillingProvider,
  CardDetails,
  InvoiceStatus,
  PaymentMethodType,
  PlanFeature,
  PlanInterval,
  SubscriptionStatus,
};

// ============================================================================
// Table Names
// ============================================================================

export const PLANS_TABLE = 'plans';
export const SUBSCRIPTIONS_TABLE = 'subscriptions';
export const CUSTOMER_MAPPINGS_TABLE = 'customer_mappings';
export const INVOICES_TABLE = 'invoices';
export const PAYMENT_METHODS_TABLE = 'payment_methods';
export const BILLING_EVENTS_TABLE = 'billing_events';

// ============================================================================
// Plan Types
// ============================================================================

/**
 * Plan record from database (SELECT result)
 */
export interface Plan {
  id: string;
  name: string;
  description: string | null;
  interval: PlanInterval;
  priceInCents: number;
  currency: string;
  features: PlanFeature[];
  trialDays: number;
  stripePriceId: string | null;
  stripeProductId: string | null;
  paypalPlanId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data for creating a new plan (INSERT)
 */
export interface NewPlan {
  id?: string;
  name: string;
  description?: string | null;
  interval: PlanInterval;
  priceInCents: number;
  currency?: string;
  features?: PlanFeature[];
  trialDays?: number;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  paypalPlanId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Data for updating a plan (UPDATE)
 */
export interface UpdatePlan {
  name?: string;
  description?: string | null;
  interval?: PlanInterval;
  priceInCents?: number;
  currency?: string;
  features?: PlanFeature[];
  trialDays?: number;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  paypalPlanId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  updatedAt?: Date;
}

// ============================================================================
// Subscription Types
// ============================================================================

/**
 * Subscription record from database (SELECT result)
 */
export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  provider: BillingProvider;
  providerSubscriptionId: string;
  providerCustomerId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialEnd: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data for creating a new subscription (INSERT)
 */
export interface NewSubscription {
  id?: string;
  userId: string;
  planId: string;
  provider: BillingProvider;
  providerSubscriptionId: string;
  providerCustomerId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
  trialEnd?: Date | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Data for updating a subscription (UPDATE)
 */
export interface UpdateSubscription {
  planId?: string;
  status?: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
  trialEnd?: Date | null;
  metadata?: Record<string, unknown>;
  updatedAt?: Date;
}

// ============================================================================
// Customer Mapping Types
// ============================================================================

/**
 * Customer mapping record from database (SELECT result)
 */
export interface CustomerMapping {
  id: string;
  userId: string;
  provider: BillingProvider;
  providerCustomerId: string;
  createdAt: Date;
}

/**
 * Data for creating a new customer mapping (INSERT)
 */
export interface NewCustomerMapping {
  id?: string;
  userId: string;
  provider: BillingProvider;
  providerCustomerId: string;
  createdAt?: Date;
}

// ============================================================================
// Invoice Types
// ============================================================================

/**
 * Invoice record from database (SELECT result)
 */
export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string | null;
  provider: BillingProvider;
  providerInvoiceId: string;
  status: InvoiceStatus;
  amountDue: number;
  amountPaid: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  paidAt: Date | null;
  invoicePdfUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data for creating a new invoice (INSERT)
 */
export interface NewInvoice {
  id?: string;
  userId: string;
  subscriptionId?: string | null;
  provider: BillingProvider;
  providerInvoiceId: string;
  status: InvoiceStatus;
  amountDue: number;
  amountPaid?: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  paidAt?: Date | null;
  invoicePdfUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Data for updating an invoice (UPDATE)
 */
export interface UpdateInvoice {
  status?: InvoiceStatus;
  amountDue?: number;
  amountPaid?: number;
  paidAt?: Date | null;
  invoicePdfUrl?: string | null;
  updatedAt?: Date;
}

// ============================================================================
// Payment Method Types
// ============================================================================

/**
 * Payment method record from database (SELECT result)
 */
export interface PaymentMethod {
  id: string;
  userId: string;
  provider: BillingProvider;
  providerPaymentMethodId: string;
  type: PaymentMethodType;
  isDefault: boolean;
  cardDetails: CardDetails | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data for creating a new payment method (INSERT)
 */
export interface NewPaymentMethod {
  id?: string;
  userId: string;
  provider: BillingProvider;
  providerPaymentMethodId: string;
  type: PaymentMethodType;
  isDefault?: boolean;
  cardDetails?: CardDetails | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Data for updating a payment method (UPDATE)
 */
export interface UpdatePaymentMethod {
  isDefault?: boolean;
  cardDetails?: CardDetails | null;
  updatedAt?: Date;
}

// ============================================================================
// Billing Event Types (Webhook Idempotency)
// ============================================================================

/**
 * Billing event record from database (SELECT result)
 */
export interface BillingEvent {
  id: string;
  provider: BillingProvider;
  providerEventId: string;
  eventType: BillingEventType;
  payload: Record<string, unknown>;
  processedAt: Date;
  createdAt: Date;
}

/**
 * Data for creating a new billing event (INSERT)
 */
export interface NewBillingEvent {
  id?: string;
  provider: BillingProvider;
  providerEventId: string;
  eventType: BillingEventType;
  payload?: Record<string, unknown>;
  processedAt?: Date;
  createdAt?: Date;
}

// ============================================================================
// Column Name Mappings (snake_case for SQL, camelCase for TS)
// ============================================================================

/**
 * Column mappings for plans table
 */
export const PLAN_COLUMNS = {
  id: 'id',
  name: 'name',
  description: 'description',
  interval: 'interval',
  priceInCents: 'price_in_cents',
  currency: 'currency',
  features: 'features',
  trialDays: 'trial_days',
  stripePriceId: 'stripe_price_id',
  stripeProductId: 'stripe_product_id',
  paypalPlanId: 'paypal_plan_id',
  isActive: 'is_active',
  sortOrder: 'sort_order',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

/**
 * Column mappings for subscriptions table
 */
export const SUBSCRIPTION_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  planId: 'plan_id',
  provider: 'provider',
  providerSubscriptionId: 'provider_subscription_id',
  providerCustomerId: 'provider_customer_id',
  status: 'status',
  currentPeriodStart: 'current_period_start',
  currentPeriodEnd: 'current_period_end',
  cancelAtPeriodEnd: 'cancel_at_period_end',
  canceledAt: 'canceled_at',
  trialEnd: 'trial_end',
  metadata: 'metadata',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

/**
 * Column mappings for customer_mappings table
 */
export const CUSTOMER_MAPPING_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  provider: 'provider',
  providerCustomerId: 'provider_customer_id',
  createdAt: 'created_at',
} as const;

/**
 * Column mappings for invoices table
 */
export const INVOICE_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  subscriptionId: 'subscription_id',
  provider: 'provider',
  providerInvoiceId: 'provider_invoice_id',
  status: 'status',
  amountDue: 'amount_due',
  amountPaid: 'amount_paid',
  currency: 'currency',
  periodStart: 'period_start',
  periodEnd: 'period_end',
  paidAt: 'paid_at',
  invoicePdfUrl: 'invoice_pdf_url',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

/**
 * Column mappings for payment_methods table
 */
export const PAYMENT_METHOD_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  provider: 'provider',
  providerPaymentMethodId: 'provider_payment_method_id',
  type: 'type',
  isDefault: 'is_default',
  cardDetails: 'card_details',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

/**
 * Column mappings for billing_events table
 */
export const BILLING_EVENT_COLUMNS = {
  id: 'id',
  provider: 'provider',
  providerEventId: 'provider_event_id',
  eventType: 'event_type',
  payload: 'payload',
  processedAt: 'processed_at',
  createdAt: 'created_at',
} as const;
