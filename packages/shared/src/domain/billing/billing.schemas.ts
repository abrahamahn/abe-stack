// shared/src/domain/billing/billing.schemas.ts

/**
 * @file Billing Schemas
 * @description Zod schemas and types for plans, subscriptions, invoices, and payments.
 * @module Domain/Billing
 */

import { z } from 'zod';

import { isoDateTimeSchema } from '../../core/schemas';
import { planIdSchema, subscriptionIdSchema, userIdSchema } from '../../types/ids';

// ============================================================================
// Constants & Enums
// ============================================================================

export const BILLING_PROVIDERS = ['stripe', 'paypal'] as const;
export type BillingProvider = (typeof BILLING_PROVIDERS)[number];

export const PLAN_INTERVALS = ['month', 'year'] as const;
export type PlanInterval = (typeof PLAN_INTERVALS)[number];

export const SUBSCRIPTION_STATUSES = [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'paused',
  'trialing',
  'unpaid',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const INVOICE_STATUSES = ['draft', 'open', 'paid', 'void', 'uncollectible'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHOD_TYPES = ['card', 'bank_account', 'paypal'] as const;
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

export const FEATURE_KEYS = {
  PROJECTS: 'projects:limit',
  STORAGE: 'storage:limit',
  TEAM_MEMBERS: 'team:invite',
  API_ACCESS: 'api:access',
  CUSTOM_BRANDING: 'branding:custom',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

/** @deprecated Use FEATURE_KEYS instead */
export const PLAN_FEATURES = FEATURE_KEYS;
export type PlanFeatureName = FeatureKey;

// ============================================================================
// Shared & Plan Schemas
// ============================================================================

export const planFeatureSchema = z.union([
  // Limit features: Must have a numeric value
  z.object({
    key: z.enum([FEATURE_KEYS.PROJECTS, FEATURE_KEYS.STORAGE]),
    name: z.string(),
    included: z.boolean(),
    value: z.number(),
    description: z.string().optional(),
  }),
  // Toggle features: value is optional (defaults to the 'included' state)
  z.object({
    key: z.enum([FEATURE_KEYS.TEAM_MEMBERS, FEATURE_KEYS.API_ACCESS, FEATURE_KEYS.CUSTOM_BRANDING]),
    name: z.string(),
    included: z.boolean(),
    value: z.boolean().optional(),
    description: z.string().optional(),
  }),
]);
export type PlanFeature = z.infer<typeof planFeatureSchema>;

export const planSchema = z.object({
  id: planIdSchema,
  name: z.string(),
  description: z.string().nullable(),
  interval: z.enum(PLAN_INTERVALS),
  priceInCents: z.number().min(0),
  currency: z.string().length(3).describe('ISO 4217 Currency Code (e.g. USD)'),
  features: z.array(planFeatureSchema),
  trialDays: z.number().min(0),
  isActive: z.boolean(),
  sortOrder: z.number(),
});
export type Plan = z.infer<typeof planSchema>;

export const plansListResponseSchema = z.object({
  plans: z.array(planSchema),
});
export type PlansListResponse = z.infer<typeof plansListResponseSchema>;

// ============================================================================
// Subscription Schemas
// ============================================================================

export const subscriptionSchema = z.object({
  id: subscriptionIdSchema,
  userId: userIdSchema,
  planId: planIdSchema,
  plan: planSchema,
  provider: z.enum(BILLING_PROVIDERS),
  status: z.enum(SUBSCRIPTION_STATUSES),
  currentPeriodStart: isoDateTimeSchema,
  currentPeriodEnd: isoDateTimeSchema,
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: isoDateTimeSchema.nullable(),
  trialEnd: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type Subscription = z.infer<typeof subscriptionSchema>;

export const subscriptionResponseSchema = z.object({
  subscription: subscriptionSchema.nullable(),
});
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;

// ============================================================================
// Checkout Schemas
// ============================================================================

export const checkoutRequestSchema = z.object({
  planId: planIdSchema,
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
});
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const checkoutResponseSchema = z.object({
  sessionId: z.string(),
  url: z.string(),
});
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;

// ============================================================================
// Subscription Actions (Cancel, Resume, Update)
// ============================================================================

export const cancelSubscriptionRequestSchema = z.object({
  immediately: z.boolean().optional().default(false),
});
export type CancelSubscriptionRequest = z.infer<typeof cancelSubscriptionRequestSchema>;

export const updateSubscriptionRequestSchema = z.object({
  planId: planIdSchema,
});
export type UpdateSubscriptionRequest = z.infer<typeof updateSubscriptionRequestSchema>;

export const subscriptionActionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SubscriptionActionResponse = z.infer<typeof subscriptionActionResponseSchema>;

// ============================================================================
// Invoice Schemas
// ============================================================================

export const invoiceSchema = z.object({
  id: z.string(),
  status: z.enum(INVOICE_STATUSES),
  amountDue: z.number(),
  amountPaid: z.number(),
  currency: z.string().length(3),
  periodStart: isoDateTimeSchema,
  periodEnd: isoDateTimeSchema,
  paidAt: isoDateTimeSchema.nullable(),
  invoicePdfUrl: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const invoicesListResponseSchema = z.object({
  invoices: z.array(invoiceSchema),
  hasMore: z.boolean(),
});
export type InvoicesListResponse = z.infer<typeof invoicesListResponseSchema>;

// ============================================================================
// Payment Method Schemas
// ============================================================================

export const cardDetailsSchema = z.object({
  brand: z.string(),
  last4: z.string(),
  expMonth: z.number(),
  expYear: z.number(),
});
export type CardDetails = z.infer<typeof cardDetailsSchema>;

export const paymentMethodSchema = z.object({
  id: z.string(),
  type: z.enum(PAYMENT_METHOD_TYPES),
  isDefault: z.boolean(),
  cardDetails: cardDetailsSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentMethodsListResponseSchema = z.object({
  paymentMethods: z.array(paymentMethodSchema),
});
export type PaymentMethodsListResponse = z.infer<typeof paymentMethodsListResponseSchema>;

export const addPaymentMethodRequestSchema = z.object({
  paymentMethodId: z.string(),
});
export type AddPaymentMethodRequest = z.infer<typeof addPaymentMethodRequestSchema>;

export const paymentMethodResponseSchema = z.object({
  paymentMethod: paymentMethodSchema,
});
export type PaymentMethodResponse = z.infer<typeof paymentMethodResponseSchema>;

export const setupIntentResponseSchema = z.object({
  clientSecret: z.string(),
});
export type SetupIntentResponse = z.infer<typeof setupIntentResponseSchema>;

// ============================================================================
// Re-exports
// ============================================================================

export { errorResponseSchema, type ErrorResponse } from '../../core/schemas';
