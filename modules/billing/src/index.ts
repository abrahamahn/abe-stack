// modules/billing/src/index.ts
/**
 * Billing Package
 *
 * Payment provider implementations, business logic, HTTP handlers,
 * route definitions, and webhook processing for Stripe and PayPal.
 *
 * Note: Core billing types (BillingService, CheckoutParams, NormalizedWebhookEvent, etc.)
 * should be imported directly from @abe-stack/core.
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
  CheckoutSessionParams,
  CheckoutSessionResult,
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
  handleListInvoices,
  handleListPaymentMethods,
  handleAddPaymentMethod,
  handleRemovePaymentMethod,
  handleSetDefaultPaymentMethod,
  handleCreateSetupIntent,
} from './handlers';

// Routes
export { billingRoutes } from './routes';

// Webhooks
export { handleStripeWebhook, handlePayPalWebhook, registerWebhookRoutes } from './webhooks';
