// client/src/billing/client.ts
/**
 * Billing API Client
 *
 * Type-safe client for interacting with the billing API endpoints.
 */

import { addAuthHeader } from '@abe-stack/shared';

import { createApiError, NetworkError } from '../errors';

import type { ApiErrorBody } from '../errors';
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
export interface BillingClientConfig {
  /** Base URL for API requests */
  baseUrl: string;
  /** Function to get the current auth token */
  getToken?: () => string | null;
  /** Custom fetch implementation */
  fetchImpl?: typeof fetch;
}

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

const API_PREFIX = '/api';

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
  const baseUrl = config.baseUrl.replace(/\/+$/, ''); // trim trailing slashes
  const fetcher = config.fetchImpl ?? fetch;

  /**
   * Make an authenticated request
   */
  const request = async <T>(
    path: string,
    options?: RequestInit,
    requiresAuth = true,
  ): Promise<T> => {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');

    if (requiresAuth) {
      (addAuthHeader as (headers: Headers, token: string | null | undefined) => Headers)(
        headers,
        config.getToken?.(),
      );
    }

    const url = `${baseUrl}${API_PREFIX}${path}`;

    let response: Response;
    try {
      response = await fetcher(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (error) {
      const cause = error instanceof Error ? error : new Error(String(error));
      throw new NetworkError(`Failed to fetch ${options?.method ?? 'GET'} ${path}`, cause) as Error;
    }

    const data = (await response.json().catch(() => ({}))) as ApiErrorBody &
      Record<string, unknown>;

    if (!response.ok) {
      throw createApiError(response.status, data);
    }

    return data as T;
  };

  return {
    // Plans
    async listPlans(): Promise<PlansListResponse> {
      return request<PlansListResponse>('/billing/plans', undefined, false);
    },

    // Subscription
    async getSubscription(): Promise<SubscriptionResponse> {
      return request<SubscriptionResponse>('/billing/subscription');
    },

    async createCheckout(data: CheckoutRequest): Promise<CheckoutResponse> {
      return request<CheckoutResponse>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async cancelSubscription(
      data?: CancelSubscriptionRequest,
    ): Promise<SubscriptionActionResponse> {
      return request<SubscriptionActionResponse>('/billing/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify(data ?? {}),
      });
    },

    async resumeSubscription(): Promise<SubscriptionActionResponse> {
      return request<SubscriptionActionResponse>('/billing/subscription/resume', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    async updateSubscription(data: UpdateSubscriptionRequest): Promise<SubscriptionActionResponse> {
      return request<SubscriptionActionResponse>('/billing/subscription/update', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // Invoices
    async listInvoices(): Promise<InvoicesListResponse> {
      return request<InvoicesListResponse>('/billing/invoices');
    },

    // Payment Methods
    async listPaymentMethods(): Promise<PaymentMethodsListResponse> {
      return request<PaymentMethodsListResponse>('/billing/payment-methods');
    },

    async addPaymentMethod(data: AddPaymentMethodRequest): Promise<PaymentMethodResponse> {
      return request<PaymentMethodResponse>('/billing/payment-methods/add', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async removePaymentMethod(paymentMethodId: string): Promise<SubscriptionActionResponse> {
      return request<SubscriptionActionResponse>(`/billing/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      });
    },

    async setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethodResponse> {
      return request<PaymentMethodResponse>(`/billing/payment-methods/${paymentMethodId}/default`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    async createSetupIntent(): Promise<SetupIntentResponse> {
      return request<SetupIntentResponse>('/billing/setup-intent', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
  };
}
