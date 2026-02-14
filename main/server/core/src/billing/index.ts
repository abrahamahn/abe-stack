// main/server/core/src/billing/index.ts
/**
 * Billing Package
 *
 * Payment provider implementations, business logic, HTTP handlers,
 * route definitions, and webhook processing for Stripe and PayPal.
 *
 * Note: Core billing types (BillingService, CheckoutParams, NormalizedWebhookEvent, etc.)
 * should be imported directly from @abe-stack/shared.
 */

// Factory (existing)
export { createBillingProvider, isBillingConfigured } from './factory';

// Providers (existing)
export { PayPalProvider } from './paypal-provider';
export { StripeProvider } from './stripe-provider';

// Service
export {
  getActivePlans,
  getPlanById,
  getUserSubscription,
  createCheckoutSession,
  cancelSubscription,
  resumeSubscription,
  updateSubscription,
  getUserInvoice,
  getUserInvoices,
  getUserPaymentMethods,
  createSetupIntent,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  getCustomerId,
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
  WebhookResult,
} from './types';

// Handlers
export {
  handleListPlans,
  handleGetSubscription,
  handleCreateCheckout,
  handleCreatePortalSession,
  handleCancelSubscription,
  handleResumeSubscription,
  handleUpdateSubscription,
  handleGetInvoice,
  handleListInvoices,
  handleListPaymentMethods,
  handleAddPaymentMethod,
  handleRemovePaymentMethod,
  handleSetDefaultPaymentMethod,
  handleCreateSetupIntent,
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
  type TrialSubscription,
} from './subscription-lifecycle';

// Plan Changes
export {
  determinePlanChangeDirection,
  downgradeSubscription,
  upgradeSubscription,
  type PlanChangeDirection,
  type PlanChangeResult,
} from './plan-changes';

// Entitlements (server-side)
export {
  assertUsageWithinLimit,
  resolveEntitlementsForUser,
  type UsageCounter,
} from './entitlements';

// Middleware
export { requireEntitlement, type EntitlementMiddlewareOptions } from './middleware';

// Routes
export { billingRoutes } from './routes';

// Webhooks
export { handleStripeWebhook, handlePayPalWebhook } from './webhooks';
