// apps/server/src/modules/billing/index.ts
/**
 * Billing Module
 *
 * User-facing billing APIs for subscriptions, plans, invoices, and payment methods.
 */

export { billingRoutes } from './routes';

// Service exports
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
  type BillingRepositories,
  type CheckoutSessionParams,
  type CheckoutSessionResult,
} from './service';

// Handler exports
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

// Webhook exports
export {
  handlePayPalWebhook,
  handleStripeWebhook,
  registerWebhookRoutes,
  type WebhookRepositories,
  type WebhookResult,
} from './webhooks';
