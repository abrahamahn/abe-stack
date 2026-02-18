// main/server/core/src/billing/index.ts
/**
 * Billing Package
 *
 * Payment provider implementations, business logic, HTTP handlers,
 * route definitions, and webhook processing for Stripe and PayPal.
 *
 * Note: Core billing types (BillingService, CheckoutParams, NormalizedWebhookEvent, etc.)
 * should be imported directly from @bslt/shared.
 */

// Factory (existing)
export { createBillingProvider, isBillingConfigured } from './factory';

// Providers (existing)
export { PayPalProvider } from './paypal-provider';
export { StripeProvider } from './stripe-provider';

// Service
export {
  addPaymentMethod, cancelSubscription, createCheckoutSession, createSetupIntent, getActivePlans, getCustomerId, getPlanById, getUserInvoice,
  getUserInvoices,
  getUserPaymentMethods, getUserSubscription, removePaymentMethod, resumeSubscription, setDefaultPaymentMethod, updateSubscription
} from './service';

// Types
export type {
  BillingAppContext,
  BillingBaseRouteDefinition,
  BillingHandlerConfig,
  BillingHandlerDeps,
  BillingHttpMethod,
  BillingModuleDeps,
  BillingRepositories,
  BillingRequest,
  BillingRouteMap,
  BillingRouteResult,
  BillingValidationSchema,
  WebhookRepositories,
  WebhookResult
} from './types';

// Handlers
export {
  handleAddPaymentMethod, handleCancelSubscription, handleCreateCheckout,
  handleCreatePortalSession, handleCreateSetupIntent, handleGetInvoice, handleGetSubscription, handleListInvoices,
  handleListPaymentMethods, handleListPlans, handleRemovePaymentMethod, handleResumeSubscription, handleSetDefaultPaymentMethod, handleUpdateSubscription
} from './handlers';

// Subscription Lifecycle
export {
  checkTrialExpiry,
  getTrialDaysRemaining,
  getValidEvents,
  isValidTransition,
  transitionSubscriptionState,
  type LifecycleState,
  type SubscriptionEvent,
  type TransitionResult,
  type TrialSubscription
} from './subscription-lifecycle';

// Plan Changes
export {
  determinePlanChangeDirection,
  downgradeSubscription,
  upgradeSubscription,
  type PlanChangeDirection,
  type PlanChangeResult
} from './plan-changes';

// Entitlements (server-side)
export {
  assertUsageWithinLimit,
  resolveEntitlementsForUser,
  type UsageCounter
} from './entitlements';

// Middleware
export { requireEntitlement, type EntitlementMiddlewareOptions } from './middleware';

// Routes
export { billingRoutes } from './routes';

// Webhooks
export { handlePayPalWebhook, handleStripeWebhook } from './webhooks';

