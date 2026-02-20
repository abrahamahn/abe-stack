// main/client/react/src/billing/index.ts
/**
 * Billing Hooks
 *
 * React hooks for billing operations backed by useQuery/useMutation.
 */

// Hooks
export {
  billingQueryKeys,
  useInvoices,
  usePaymentMethods,
  usePlans,
  useProrationPreview,
  useSubscription,
  type InvoicesState,
  type PaymentMethodsState,
  type PlansState,
  type ProrationPreviewState,
  type SubscriptionState,
} from './hooks';

// Admin
export { adminBillingQueryKeys, useAdminPlans, type AdminPlansState } from './admin';
