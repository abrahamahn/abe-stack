// main/shared/src/core/billing/index.ts

/**
 * @file Billing Barrel
 * @description Public API for the billing domain: schemas, types, display helpers, errors, entitlements.
 * @module Core/Billing
 */

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
export {
  calculateProration,
  canChangePlan,
  getEntitlements,
  getFeatureValue,
  getLimitUsagePercentage,
  isOverLimit,
  isSubscriptionActive,
  PLAN_FEES,
  type BillingStats,
  type Entitlements,
} from './billing.logic';

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
  type PortalSessionParams,
  type ProviderInvoice,
  type ProviderPaymentMethod,
  type ProviderSubscription,
  type SetupIntentResult,
} from './billing.service.types';
