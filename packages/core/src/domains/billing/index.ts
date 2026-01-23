// packages/core/src/domains/billing/index.ts
/**
 * Billing Domain
 *
 * Exports billing-related errors and utilities.
 */

export {
  // Plan errors
  PlanNotFoundError,
  PlanNotActiveError,
  PlanHasActiveSubscriptionsError,
  CannotDeactivatePlanWithActiveSubscriptionsError,
  // Subscription errors
  SubscriptionExistsError,
  SubscriptionNotFoundError,
  SubscriptionAlreadyCanceledError,
  SubscriptionNotCancelingError,
  SubscriptionNotActiveError,
  CannotDowngradeInTrialError,
  // Payment method errors
  PaymentMethodNotFoundError,
  CannotRemoveDefaultPaymentMethodError,
  PaymentMethodValidationError,
  // Customer errors
  CustomerNotFoundError,
  // Provider errors
  BillingProviderError,
  ProviderNotConfiguredError,
  CheckoutSessionError,
  WebhookSignatureError,
  WebhookEventAlreadyProcessedError,
  // Invoice errors
  InvoiceNotFoundError,
  // Type guards
  isBillingProviderError,
  isSubscriptionError,
  isPlanError,
} from './errors';
