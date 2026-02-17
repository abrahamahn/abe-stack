// main/shared/src/core/billing/index.ts

/**
 * @file Billing Barrel
 * @description Public API for the billing domain: schemas, types, display helpers, errors, entitlements.
 * @module Core/Billing
 */

// --- constants (re-export for backward compatibility) ---
import {
  BILLING_EVENT_TYPES,
  BILLING_PROVIDERS,
  FEATURE_KEYS,
  INVOICE_STATUSES,
  PAYMENT_METHOD_TYPES,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
} from '../constants/billing';

export {
  BILLING_EVENT_TYPES,
  BILLING_PROVIDERS,
  FEATURE_KEYS,
  INVOICE_STATUSES,
  PAYMENT_METHOD_TYPES,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
};

// --- ids (re-export branded types) ---
import type { PlanId, SubscriptionId } from '../../primitives/schema/ids';

export type { PlanId, SubscriptionId };

// --- contracts ---
import { billingContract } from '../../contracts';

export { billingContract };

// --- billing.schemas ---
export {
  addPaymentMethodRequestSchema,
  cancelSubscriptionRequestSchema,
  cardDetailsSchema,
  checkoutRequestSchema,
  checkoutResponseSchema,
  invoiceResponseSchema,
  invoiceSchema,
  invoicesListResponseSchema,
  paymentMethodResponseSchema,
  paymentMethodSchema,
  paymentMethodsListResponseSchema,
  planFeatureSchema,
  planSchema,
  plansListResponseSchema,
  portalSessionRequestSchema,
  portalSessionResultSchema,
  setupIntentResponseSchema,
  subscriptionActionResponseSchema,
  subscriptionResponseSchema,
  subscriptionSchema,
  updateSubscriptionRequestSchema,
  type AddPaymentMethodRequest,
  type BillingEventType,
  type BillingProvider,
  type CancelSubscriptionRequest,
  type CardDetails,
  type CheckoutRequest,
  type CheckoutResponse,
  type FeatureKey,
  type Invoice,
  type InvoiceResponse,
  type InvoiceStatus,
  type InvoicesListResponse,
  type PaymentMethod,
  type PaymentMethodResponse,
  type PaymentMethodType,
  type PaymentMethodsListResponse,
  type Plan,
  type PlanFeature,
  type PlanInterval,
  type PlansListResponse,
  type PortalSessionRequest,
  type PortalSessionResult,
  type SetupIntentResponse,
  type Subscription,
  type SubscriptionActionResponse,
  type SubscriptionResponse,
  type SubscriptionStatus,
  type UpdateSubscriptionRequest,
} from './billing.schemas';

// --- billing.admin.schemas ---
export {
  adminBillingStatsSchema,
  adminPlanResponseSchema,
  adminPlanSchema,
  adminPlansListResponseSchema,
  createPlanRequestSchema,
  syncStripeResponseSchema,
  updatePlanRequestSchema,
  type AdminBillingStats,
  type AdminPlan,
  type AdminPlanResponse,
  type AdminPlansListResponse,
  type CreatePlanRequest,
  type SyncStripeResponse,
  type UpdatePlanRequest,
} from './billing.admin.schemas';

// --- billing.logic ---
export { calculateProration, PLAN_FEES, type BillingStats } from './billing.logic';

// --- billing.display ---
export {
  formatPlanInterval,
  formatPrice,
  formatPriceWithInterval,
  getCardBrandLabel,
  getInvoiceStatusLabel,
  getInvoiceStatusVariant,
  getPaymentMethodIcon,
  getPaymentMethodLabel,
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
  type StatusVariant,
} from './billing.display';

// --- billing.errors ---
export {
  BillingProviderError,
  BillingProviderNotConfiguredError,
  BillingSubscriptionExistsError,
  BillingSubscriptionNotFoundError,
  CannotDeactivatePlanWithActiveSubscriptionsError,
  CannotDowngradeInTrialError,
  CannotRemoveDefaultPaymentMethodError,
  CheckoutSessionError,
  CustomerNotFoundError,
  InvoiceNotFoundError,
  isBillingProviderError,
  isPlanError,
  isSubscriptionError,
  PaymentMethodNotFoundError,
  PaymentMethodValidationError,
  PlanHasActiveSubscriptionsError,
  PlanNotActiveError,
  PlanNotFoundError,
  SubscriptionAlreadyCanceledError,
  SubscriptionNotActiveError,
  SubscriptionNotCancelingError,
  WebhookEventAlreadyProcessedError,
  WebhookSignatureError,
} from './billing.errors';

// --- billing.entitlements ---
export {
  assertEntitled,
  assertWithinLimit,
  hasActiveSubscription,
  isEntitled,
  resolveEntitlements,
  type EntitlementInput,
  type FeatureEntitlement,
  type ResolvedEntitlements,
  type SubscriptionState,
} from './billing.entitlements';

// --- billing.service-types ---
export {
  type BillingService,
  type CheckoutParams,
  type CheckoutResult,
  type CreateProductParams,
  type CreateProductResult,
  type NormalizedEventType,
  type NormalizedWebhookEvent,
  type ProviderInvoice,
  type ProviderPaymentMethod,
  type ProviderSubscription,
  type SetupIntentResult,
} from './billing.service-types';
