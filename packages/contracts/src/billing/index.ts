// packages/contracts/src/billing/index.ts
/**
 * Billing Contract
 *
 * API contracts for billing operations including subscriptions,
 * payment methods, invoices, and admin plan management.
 */

// ============================================================================
// Constants
// ============================================================================
export {
  BILLING_PROVIDERS,
  INVOICE_STATUSES,
  PAYMENT_METHOD_TYPES,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
} from './billing';

// ============================================================================
// Types (from billing.ts)
// ============================================================================
export type {
  AddPaymentMethodRequest,
  AdminPlan,
  AdminPlanResponse,
  AdminPlansListResponse,
  BillingProvider,
  CancelSubscriptionRequest,
  CardDetails,
  CheckoutRequest,
  CheckoutResponse,
  CreatePlanRequest,
  EmptyBillingBody,
  Invoice,
  InvoiceStatus,
  InvoicesListResponse,
  PaymentMethod,
  PaymentMethodResponse,
  PaymentMethodsListResponse,
  PaymentMethodType,
  Plan,
  PlanFeature,
  PlanInterval,
  PlansListResponse,
  SetupIntentResponse,
  Subscription,
  SubscriptionActionResponse,
  SubscriptionResponse,
  SubscriptionStatus,
  SyncStripeResponse,
  UpdatePlanRequest,
  UpdateSubscriptionRequest,
} from './billing';

// ============================================================================
// Schemas (from billing.ts)
// ============================================================================
export {
  addPaymentMethodRequestSchema,
  adminPlanResponseSchema,
  adminPlanSchema,
  adminPlansListResponseSchema,
  cancelSubscriptionRequestSchema,
  checkoutRequestSchema,
  checkoutResponseSchema,
  createPlanRequestSchema,
  emptyBillingBodySchema,
  invoiceSchema,
  invoicesListResponseSchema,
  paymentMethodResponseSchema,
  paymentMethodSchema,
  paymentMethodsListResponseSchema,
  planSchema,
  plansListResponseSchema,
  setupIntentResponseSchema,
  subscriptionActionResponseSchema,
  subscriptionResponseSchema,
  subscriptionSchema,
  syncStripeResponseSchema,
  updatePlanRequestSchema,
  updateSubscriptionRequestSchema,
} from './billing';

// ============================================================================
// Contracts (from billing.ts)
// ============================================================================
export { adminBillingContract, billingContract } from './billing';

// ============================================================================
// Service Types (from service.ts)
// ============================================================================
export type {
  BillingService,
  CheckoutParams,
  CheckoutResult,
  CreateProductParams,
  CreateProductResult,
  NormalizedEventType,
  NormalizedWebhookEvent,
  ProviderInvoice,
  ProviderPaymentMethod,
  ProviderSubscription,
  SetupIntentResult,
} from './service';
