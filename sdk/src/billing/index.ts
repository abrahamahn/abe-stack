// sdk/src/billing/index.ts
/**
 * Billing SDK
 *
 * Exports billing API clients and React hooks for managing
 * subscriptions, plans, payment methods, and invoices.
 */

// Client
export { createBillingClient, type BillingClient, type BillingClientConfig } from './client';

// Hooks
export {
  billingQueryKeys,
  useInvoices,
  usePaymentMethods,
  usePlans,
  useSubscription,
  type InvoicesState,
  type PaymentMethodsState,
  type PlansState,
  type SubscriptionState,
} from './hooks';

// Admin
export {
  createAdminBillingClient,
  useAdminPlans,
  type AdminBillingClient,
  type AdminBillingClientConfig,
  type AdminPlansState,
} from './admin';
