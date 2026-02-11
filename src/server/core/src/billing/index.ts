// src/server/core/src/billing/index.ts
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
  BillingLogger,
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

// Middleware
export { requireEntitlement, type EntitlementMiddlewareOptions } from './middleware';

// Routes
export { billingRoutes } from './routes';

// Webhooks
export { handleStripeWebhook, handlePayPalWebhook, registerWebhookRoutes } from './webhooks';
