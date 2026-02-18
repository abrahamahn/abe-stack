// main/client/api/src/billing/client.ts
/**
 * Billing API Client
 *
 * Type-safe client for interacting with the billing API endpoints.
 */

import {
  addPaymentMethodRequestSchema,
  cancelSubscriptionRequestSchema,
  checkoutRequestSchema,
  checkoutResponseSchema,
  invoicesListResponseSchema,
  paymentMethodResponseSchema,
  paymentMethodsListResponseSchema,
  plansListResponseSchema,
  portalSessionRequestSchema,
  portalSessionResultSchema,
  setupIntentResponseSchema,
  subscriptionActionResponseSchema,
  subscriptionResponseSchema,
  updateSubscriptionRequestSchema,
} from '@bslt/shared';

import { apiRequest, createRequestFactory } from '../utils';

import type {
  AddPaymentMethodRequest,
  CancelSubscriptionRequest,
  CheckoutRequest,
  CheckoutResponse,
  InvoiceResponse,
  InvoicesListResponse,
  PaymentMethodResponse,
  PaymentMethodsListResponse,
  PlansListResponse,
  PortalSessionRequest,
  PortalSessionResult,
  SetupIntentResponse,
  SubscriptionActionResponse,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
} from '@bslt/shared';
import type { BaseClientConfig } from '../utils';

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
  /** Create customer portal session */
  createPortal: (data: PortalSessionRequest) => Promise<PortalSessionResult>;
  /** Cancel subscription */
  cancelSubscription: (data?: CancelSubscriptionRequest) => Promise<SubscriptionActionResponse>;
  /** Resume subscription before period end */
  resumeSubscription: () => Promise<SubscriptionActionResponse>;
  /** Change subscription plan */
  updateSubscription: (data: UpdateSubscriptionRequest) => Promise<SubscriptionActionResponse>;

  // Invoices
  /** List user's invoices */
  listInvoices: () => Promise<InvoicesListResponse>;
  /** Get a single invoice by id */
  getInvoice: (invoiceId: string) => Promise<InvoiceResponse>;

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
      return apiRequest(factory, '/billing/plans', undefined, false, plansListResponseSchema);
    },

    // Subscription
    async getSubscription(): Promise<SubscriptionResponse> {
      return apiRequest(
        factory,
        '/billing/subscription',
        undefined,
        true,
        subscriptionResponseSchema,
      );
    },

    async createCheckout(data: CheckoutRequest): Promise<CheckoutResponse> {
      const validated = checkoutRequestSchema.parse(data);
      return apiRequest(
        factory,
        '/billing/checkout',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        checkoutResponseSchema,
      );
    },

    async createPortal(data: PortalSessionRequest): Promise<PortalSessionResult> {
      const validated = portalSessionRequestSchema.parse(data);
      return apiRequest(
        factory,
        '/billing/portal',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        portalSessionResultSchema,
      );
    },

    async cancelSubscription(
      data?: CancelSubscriptionRequest,
    ): Promise<SubscriptionActionResponse> {
      const validated = cancelSubscriptionRequestSchema.parse(data ?? {});
      return apiRequest(
        factory,
        '/billing/subscription/cancel',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        subscriptionActionResponseSchema,
      );
    },

    async resumeSubscription(): Promise<SubscriptionActionResponse> {
      return apiRequest(
        factory,
        '/billing/subscription/resume',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        true,
        subscriptionActionResponseSchema,
      );
    },

    async updateSubscription(data: UpdateSubscriptionRequest): Promise<SubscriptionActionResponse> {
      const validated = updateSubscriptionRequestSchema.parse(data);
      return apiRequest(
        factory,
        '/billing/subscription/update',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        subscriptionActionResponseSchema,
      );
    },

    // Invoices
    async listInvoices(): Promise<InvoicesListResponse> {
      return apiRequest(factory, '/billing/invoices', undefined, true, invoicesListResponseSchema);
    },
    async getInvoice(invoiceId: string): Promise<InvoiceResponse> {
      return apiRequest(factory, `/billing/invoices/${invoiceId}`, undefined, true);
    },

    // Payment Methods
    async listPaymentMethods(): Promise<PaymentMethodsListResponse> {
      return apiRequest(
        factory,
        '/billing/payment-methods',
        undefined,
        true,
        paymentMethodsListResponseSchema,
      );
    },

    async addPaymentMethod(data: AddPaymentMethodRequest): Promise<PaymentMethodResponse> {
      const validated = addPaymentMethodRequestSchema.parse(data);
      return apiRequest(
        factory,
        '/billing/payment-methods/add',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        paymentMethodResponseSchema,
      );
    },

    async removePaymentMethod(paymentMethodId: string): Promise<SubscriptionActionResponse> {
      return apiRequest(
        factory,
        `/billing/payment-methods/${paymentMethodId}`,
        {
          method: 'DELETE',
        },
        true,
        subscriptionActionResponseSchema,
      );
    },

    async setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethodResponse> {
      return apiRequest(
        factory,
        `/billing/payment-methods/${paymentMethodId}/default`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        true,
        paymentMethodResponseSchema,
      );
    },

    async createSetupIntent(): Promise<SetupIntentResponse> {
      return apiRequest(
        factory,
        '/billing/setup-intent',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        true,
        setupIntentResponseSchema,
      );
    },
  };
}
