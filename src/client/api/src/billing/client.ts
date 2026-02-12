// src/client/api/src/billing/client.ts
/**
 * Billing API Client
 *
 * Type-safe client for interacting with the billing API endpoints.
 */

import {
  addPaymentMethodRequestSchema,
  cancelSubscriptionRequestSchema,
  checkoutRequestSchema,
  updateSubscriptionRequestSchema,
} from '@abe-stack/shared';

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';
import type {
  AddPaymentMethodRequest,
  CancelSubscriptionRequest,
  CheckoutRequest,
  CheckoutResponse,
  InvoicesListResponse,
  PaymentMethodResponse,
  PaymentMethodsListResponse,
  PlansListResponse,
  SetupIntentResponse,
  SubscriptionActionResponse,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
} from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the billing client
 */
export type BillingClientConfig = BaseClientConfig;

/**
 * Billing API client interface
 */
export interface BillingClient {
  // Plans
  /** List active pricing plans */
  listPlans: () => Promise<PlansListResponse>;

  // Subscription
  /** Get current user's subscription */
  getSubscription: () => Promise<SubscriptionResponse>;
  /** Create checkout session for subscription */
  createCheckout: (data: CheckoutRequest) => Promise<CheckoutResponse>;
  /** Cancel subscription */
  cancelSubscription: (data?: CancelSubscriptionRequest) => Promise<SubscriptionActionResponse>;
  /** Resume subscription before period end */
  resumeSubscription: () => Promise<SubscriptionActionResponse>;
  /** Change subscription plan */
  updateSubscription: (data: UpdateSubscriptionRequest) => Promise<SubscriptionActionResponse>;

  // Invoices
  /** List user's invoices */
  listInvoices: () => Promise<InvoicesListResponse>;

  // Payment Methods
  /** List saved payment methods */
  listPaymentMethods: () => Promise<PaymentMethodsListResponse>;
  /** Add a payment method */
  addPaymentMethod: (data: AddPaymentMethodRequest) => Promise<PaymentMethodResponse>;
  /** Remove a payment method */
  removePaymentMethod: (paymentMethodId: string) => Promise<SubscriptionActionResponse>;
  /** Set payment method as default */
  setDefaultPaymentMethod: (paymentMethodId: string) => Promise<PaymentMethodResponse>;
  /** Create setup intent for adding card */
  createSetupIntent: () => Promise<SetupIntentResponse>;
}

// ============================================================================
// Client Implementation
// ============================================================================

/**
 * Create a billing API client
 *
 * @param config - Client configuration
 * @returns Billing client instance
 *
 * @example
 * ```ts
 * const client = createBillingClient({
 *   baseUrl: 'http://localhost:3001',
 *   getToken: () => localStorage.getItem('token'),
 * });
 *
 * // List plans (public)
 * const { plans } = await client.listPlans();
 *
 * // Get subscription
 * const { subscription } = await client.getSubscription();
 *
 * // Create checkout
 * const { url } = await client.createCheckout({ planId: 'plan-123' });
 * window.location.href = url;
 * ```
 */
export function createBillingClient(config: BillingClientConfig): BillingClient {
  const factory = createRequestFactory(config);

  return {
    // Plans
    async listPlans(): Promise<PlansListResponse> {
      return apiRequest<PlansListResponse>(factory, '/billing/plans', undefined, false);
    },

    // Subscription
    async getSubscription(): Promise<SubscriptionResponse> {
      return apiRequest<SubscriptionResponse>(factory, '/billing/subscription');
    },

    async createCheckout(data: CheckoutRequest): Promise<CheckoutResponse> {
      const validated = checkoutRequestSchema.parse(data);
      return apiRequest<CheckoutResponse>(factory, '/billing/checkout', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    async cancelSubscription(
      data?: CancelSubscriptionRequest,
    ): Promise<SubscriptionActionResponse> {
      const validated = cancelSubscriptionRequestSchema.parse(data ?? {});
      return apiRequest<SubscriptionActionResponse>(factory, '/billing/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    async resumeSubscription(): Promise<SubscriptionActionResponse> {
      return apiRequest<SubscriptionActionResponse>(factory, '/billing/subscription/resume', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    async updateSubscription(data: UpdateSubscriptionRequest): Promise<SubscriptionActionResponse> {
      const validated = updateSubscriptionRequestSchema.parse(data);
      return apiRequest<SubscriptionActionResponse>(factory, '/billing/subscription/update', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    // Invoices
    async listInvoices(): Promise<InvoicesListResponse> {
      return apiRequest<InvoicesListResponse>(factory, '/billing/invoices');
    },

    // Payment Methods
    async listPaymentMethods(): Promise<PaymentMethodsListResponse> {
      return apiRequest<PaymentMethodsListResponse>(factory, '/billing/payment-methods');
    },

    async addPaymentMethod(data: AddPaymentMethodRequest): Promise<PaymentMethodResponse> {
      const validated = addPaymentMethodRequestSchema.parse(data);
      return apiRequest<PaymentMethodResponse>(factory, '/billing/payment-methods/add', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    async removePaymentMethod(paymentMethodId: string): Promise<SubscriptionActionResponse> {
      return apiRequest<SubscriptionActionResponse>(
        factory,
        `/billing/payment-methods/${paymentMethodId}`,
        {
          method: 'DELETE',
        },
      );
    },

    async setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethodResponse> {
      return apiRequest<PaymentMethodResponse>(
        factory,
        `/billing/payment-methods/${paymentMethodId}/default`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
    },

    async createSetupIntent(): Promise<SetupIntentResponse> {
      return apiRequest<SetupIntentResponse>(factory, '/billing/setup-intent', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
  };
}
