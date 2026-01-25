// packages/core/src/modules/billing/errors.ts
/**
 * Billing Domain Errors
 *
 * Specific error types for billing operations including subscriptions,
 * payment methods, plans, and provider interactions.
 */

import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../infrastructure/errors';
import { HTTP_STATUS } from '../../shared/constants/http';

// ============================================================================
// Plan Errors
// ============================================================================

/**
 * Plan not found
 */
export class PlanNotFoundError extends NotFoundError {
  constructor(planId?: string) {
    super(planId !== undefined && planId !== '' ? `Plan not found: ${planId}` : 'Plan not found', 'PLAN_NOT_FOUND');
  }
}

/**
 * Plan is not active
 */
export class PlanNotActiveError extends BadRequestError {
  constructor(planId?: string) {
    super(planId !== undefined && planId !== '' ? `Plan is not active: ${planId}` : 'Plan is not active', 'PLAN_NOT_ACTIVE');
  }
}

/**
 * Cannot modify plan with active subscriptions
 */
export class PlanHasActiveSubscriptionsError extends ConflictError {
  constructor() {
    super('Cannot modify plan with active subscriptions', 'PLAN_HAS_ACTIVE_SUBSCRIPTIONS');
  }
}

/**
 * Cannot deactivate plan with active subscriptions
 */
export class CannotDeactivatePlanWithActiveSubscriptionsError extends BadRequestError {
  constructor(planId: string, activeCount: number) {
    super(
      `Cannot deactivate plan ${planId}: ${String(activeCount)} active subscription(s) exist`,
      'CANNOT_DEACTIVATE_PLAN_WITH_SUBSCRIPTIONS',
    );
  }
}

// ============================================================================
// Subscription Errors
// ============================================================================

/**
 * User already has an active subscription
 */
export class SubscriptionExistsError extends ConflictError {
  constructor() {
    super('User already has an active subscription', 'SUBSCRIPTION_EXISTS');
  }
}

export { SubscriptionExistsError as BillingSubscriptionExistsError };

/**
 * Subscription not found
 */
export class SubscriptionNotFoundError extends NotFoundError {
  constructor(subscriptionId?: string) {
    super(
      subscriptionId !== undefined && subscriptionId !== '' ? `Subscription not found: ${subscriptionId}` : 'Subscription not found',
      'SUBSCRIPTION_NOT_FOUND',
    );
  }
}

export { SubscriptionNotFoundError as BillingSubscriptionNotFoundError };

/**
 * Cannot cancel - subscription already canceled
 */
export class SubscriptionAlreadyCanceledError extends BadRequestError {
  constructor() {
    super('Subscription is already canceled', 'SUBSCRIPTION_ALREADY_CANCELED');
  }
}

/**
 * Cannot resume - subscription is not pending cancellation
 */
export class SubscriptionNotCancelingError extends BadRequestError {
  constructor() {
    super('Subscription is not pending cancellation', 'SUBSCRIPTION_NOT_CANCELING');
  }
}

/**
 * Cannot change plan - subscription not active
 */
export class SubscriptionNotActiveError extends BadRequestError {
  constructor() {
    super('Subscription is not active', 'SUBSCRIPTION_NOT_ACTIVE');
  }
}

/**
 * Cannot downgrade while in trial
 */
export class CannotDowngradeInTrialError extends BadRequestError {
  constructor() {
    super('Cannot downgrade plan while in trial period', 'CANNOT_DOWNGRADE_IN_TRIAL');
  }
}

// ============================================================================
// Payment Method Errors
// ============================================================================

/**
 * Payment method not found
 */
export class PaymentMethodNotFoundError extends NotFoundError {
  constructor(paymentMethodId?: string) {
    super(
      paymentMethodId !== undefined && paymentMethodId !== '' ? `Payment method not found: ${paymentMethodId}` : 'Payment method not found',
      'PAYMENT_METHOD_NOT_FOUND',
    );
  }
}

/**
 * Cannot remove default payment method with active subscription
 */
export class CannotRemoveDefaultPaymentMethodError extends BadRequestError {
  constructor() {
    super(
      'Cannot remove default payment method while subscription is active',
      'CANNOT_REMOVE_DEFAULT_PAYMENT_METHOD',
    );
  }
}

/**
 * Payment method validation failed
 */
export class PaymentMethodValidationError extends BadRequestError {
  constructor(message = 'Payment method validation failed') {
    super(message, 'PAYMENT_METHOD_VALIDATION_FAILED');
  }
}

// ============================================================================
// Customer Errors
// ============================================================================

/**
 * Customer not found in billing provider
 */
export class CustomerNotFoundError extends NotFoundError {
  constructor(userId?: string) {
    super(
      userId !== undefined && userId !== '' ? `Billing customer not found for user: ${userId}` : 'Billing customer not found',
      'CUSTOMER_NOT_FOUND',
    );
  }
}

// ============================================================================
// Provider Errors
// ============================================================================

/**
 * Base billing provider error
 */
export class BillingProviderError extends AppError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly providerErrorCode?: string,
  ) {
    super(message, HTTP_STATUS.BAD_GATEWAY, 'BILLING_PROVIDER_ERROR');
  }
}

/**
 * Provider not configured
 */
export class ProviderNotConfiguredError extends AppError {
  constructor(provider: string) {
    super(
      `Billing provider not configured: ${provider}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'PROVIDER_NOT_CONFIGURED',
    );
  }
}

export { ProviderNotConfiguredError as BillingProviderNotConfiguredError };

/**
 * Checkout session creation failed
 */
export class CheckoutSessionError extends BillingProviderError {
  constructor(provider: string, message = 'Failed to create checkout session') {
    super(message, provider, 'CHECKOUT_SESSION_FAILED');
  }
}

/**
 * Invalid webhook signature
 */
export class WebhookSignatureError extends BadRequestError {
  constructor(provider: string) {
    super(`Invalid webhook signature for provider: ${provider}`, 'WEBHOOK_SIGNATURE_INVALID');
  }
}

/**
 * Webhook event already processed (idempotency)
 */
export class WebhookEventAlreadyProcessedError extends ConflictError {
  constructor(eventId: string) {
    super(`Webhook event already processed: ${eventId}`, 'WEBHOOK_EVENT_ALREADY_PROCESSED');
  }
}

// ============================================================================
// Invoice Errors
// ============================================================================

/**
 * Invoice not found
 */
export class InvoiceNotFoundError extends NotFoundError {
  constructor(invoiceId?: string) {
    super(invoiceId !== undefined && invoiceId !== '' ? `Invoice not found: ${invoiceId}` : 'Invoice not found', 'INVOICE_NOT_FOUND');
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if error is a billing provider error
 */
export function isBillingProviderError(error: unknown): error is BillingProviderError {
  return error instanceof BillingProviderError;
}

/**
 * Check if error is a subscription-related error
 */
export function isSubscriptionError(error: unknown): boolean {
  return (
    error instanceof SubscriptionExistsError ||
    error instanceof SubscriptionNotFoundError ||
    error instanceof SubscriptionAlreadyCanceledError ||
    error instanceof SubscriptionNotCancelingError ||
    error instanceof SubscriptionNotActiveError ||
    error instanceof CannotDowngradeInTrialError
  );
}

/**
 * Check if error is a plan-related error
 */
export function isPlanError(error: unknown): boolean {
  return (
    error instanceof PlanNotFoundError ||
    error instanceof PlanNotActiveError ||
    error instanceof PlanHasActiveSubscriptionsError
  );
}
