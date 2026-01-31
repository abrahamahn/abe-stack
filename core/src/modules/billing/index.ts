// core/src/modules/billing/index.ts
/**
 * Billing Domain
 *
 * Exports billing-related errors and utilities.
 */

export {
  // Provider errors
  BillingProviderError,
  BillingProviderNotConfiguredError,
  BillingSubscriptionExistsError,
  BillingSubscriptionNotFoundError,
  CannotDeactivatePlanWithActiveSubscriptionsError,
  CannotDowngradeInTrialError,
  CannotRemoveDefaultPaymentMethodError,
  CheckoutSessionError,
  // Customer errors
  CustomerNotFoundError,
  // Invoice errors
  InvoiceNotFoundError,
  // Payment method errors
  PaymentMethodNotFoundError,
  PaymentMethodValidationError,
  PlanHasActiveSubscriptionsError,
  PlanNotActiveError,
  // Plan errors
  PlanNotFoundError,
  ProviderNotConfiguredError,
  SubscriptionAlreadyCanceledError,
  // Subscription errors
  SubscriptionExistsError,
  SubscriptionNotActiveError,
  SubscriptionNotCancelingError,
  SubscriptionNotFoundError,
  WebhookEventAlreadyProcessedError,
  WebhookSignatureError,
  // Type guards
  isBillingProviderError,
  isPlanError,
  isSubscriptionError,
} from './errors';
