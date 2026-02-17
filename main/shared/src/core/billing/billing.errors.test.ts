// main/shared/src/core/billing/billing.errors.test.ts

/**
 * @file Billing Errors Tests
 * @description Unit tests for billing domain error types, type guards, and aliases.
 * @module Core/Billing/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  // Provider errors
  BillingProviderError,
  CannotDeactivatePlanWithActiveSubscriptionsError,
  CannotDowngradeInTrialError,
  CannotRemoveDefaultPaymentMethodError,
  CheckoutSessionError,
  // Customer errors
  CustomerNotFoundError,
  // Invoice errors
  InvoiceNotFoundError,
  // Type guards
  isBillingProviderError,
  isPlanError,
  isSubscriptionError,
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
} from './billing.errors';

describe('Billing Errors', () => {
  describe('Plan Errors', () => {
    it('should create PlanNotFoundError', () => {
      const error = new PlanNotFoundError('plan-123');
      expect(error.message).toContain('plan-123');
      expect(error.name).toBe('PlanNotFoundError');
    });

    it('should create PlanNotActiveError', () => {
      const error = new PlanNotActiveError('plan-123');
      expect(error.message).toContain('not active');
    });

    it('should create PlanHasActiveSubscriptionsError', () => {
      const error = new PlanHasActiveSubscriptionsError();
      expect(error.message).toContain('active subscriptions');
    });

    it('should create CannotDeactivatePlanWithActiveSubscriptionsError', () => {
      const error = new CannotDeactivatePlanWithActiveSubscriptionsError('plan-123', 5);
      expect(error.message).toContain('5');
      expect(error.message).toContain('plan-123');
    });
  });

  describe('Subscription Errors', () => {
    it('should create SubscriptionExistsError', () => {
      const error = new SubscriptionExistsError();
      expect(error.message).toContain('already has');
    });

    it('should create SubscriptionNotFoundError', () => {
      const error = new SubscriptionNotFoundError('sub-123');
      expect(error.message).toContain('sub-123');
    });

    it('should create SubscriptionAlreadyCanceledError', () => {
      const error = new SubscriptionAlreadyCanceledError();
      expect(error.message).toContain('already canceled');
    });

    it('should create SubscriptionNotCancelingError', () => {
      const error = new SubscriptionNotCancelingError();
      expect(error.message).toContain('not pending cancellation');
    });

    it('should create SubscriptionNotActiveError', () => {
      const error = new SubscriptionNotActiveError();
      expect(error.message).toContain('not active');
    });

    it('should create CannotDowngradeInTrialError', () => {
      const error = new CannotDowngradeInTrialError();
      expect(error.message).toContain('trial');
    });
  });

  describe('Payment Method Errors', () => {
    it('should create PaymentMethodNotFoundError', () => {
      const error = new PaymentMethodNotFoundError('pm-123');
      expect(error.message).toContain('pm-123');
    });

    it('should create CannotRemoveDefaultPaymentMethodError', () => {
      const error = new CannotRemoveDefaultPaymentMethodError();
      expect(error.message).toContain('default payment method');
    });

    it('should create PaymentMethodValidationError', () => {
      const error = new PaymentMethodValidationError('Invalid card');
      expect(error.message).toBe('Invalid card');
    });
  });

  describe('Customer Errors', () => {
    it('should create CustomerNotFoundError', () => {
      const error = new CustomerNotFoundError('user-123');
      expect(error.message).toContain('user-123');
    });
  });

  describe('Provider Errors', () => {
    it('should create BillingProviderError', () => {
      const error = new BillingProviderError('Provider failed', 'stripe', 'card_declined');
      expect(error.message).toBe('Provider failed');
      expect(error.provider).toBe('stripe');
      expect(error.providerErrorCode).toBe('card_declined');
    });

    it('should create ProviderNotConfiguredError', () => {
      const error = new ProviderNotConfiguredError('stripe');
      expect(error.message).toContain('stripe');
    });

    it('should create CheckoutSessionError', () => {
      const error = new CheckoutSessionError('stripe');
      expect(error.provider).toBe('stripe');
      expect(error.message).toContain('checkout session');
    });

    it('should create WebhookSignatureError', () => {
      const error = new WebhookSignatureError('stripe');
      expect(error.message).toContain('stripe');
      expect(error.message).toContain('signature');
    });

    it('should create WebhookEventAlreadyProcessedError', () => {
      const error = new WebhookEventAlreadyProcessedError('evt-123');
      expect(error.message).toContain('evt-123');
      expect(error.message).toContain('already processed');
    });
  });

  describe('Invoice Errors', () => {
    it('should create InvoiceNotFoundError', () => {
      const error = new InvoiceNotFoundError('inv-123');
      expect(error.message).toContain('inv-123');
    });
  });

  describe('Type Guards', () => {
    it('should identify BillingProviderError', () => {
      const error = new BillingProviderError('Failed', 'stripe');
      expect(isBillingProviderError(error)).toBe(true);
      expect(isBillingProviderError(new Error('Regular error'))).toBe(false);
    });

    it('should identify subscription errors', () => {
      expect(isSubscriptionError(new SubscriptionExistsError())).toBe(true);
      expect(isSubscriptionError(new SubscriptionNotFoundError())).toBe(true);
      expect(isSubscriptionError(new PlanNotFoundError())).toBe(false);
    });

    it('should identify plan errors', () => {
      expect(isPlanError(new PlanNotFoundError())).toBe(true);
      expect(isPlanError(new PlanNotActiveError())).toBe(true);
      expect(isPlanError(new SubscriptionExistsError())).toBe(false);
    });
  });
});
