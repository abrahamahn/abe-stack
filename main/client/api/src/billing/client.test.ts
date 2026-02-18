// main/client/api/src/billing/client.test.ts
/**
 * Billing Client Tests
 *
 * Comprehensive unit tests for the billing API client.
 * Tests all endpoints, auth handling, error cases, and edge cases.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBillingClient } from './client';

import type {
  AddPaymentMethodRequest,
  CancelSubscriptionRequest,
  CheckoutRequest,
  CheckoutResponse,
  InvoicesListResponse,
  PaymentMethodResponse,
  PaymentMethodsListResponse,
  PlanId,
  PlansListResponse,
  SubscriptionActionResponse,
  SubscriptionId,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
  UserId,
} from '@bslt/shared';

describe('createBillingClient', () => {
  const baseUrl = 'http://localhost:3001';
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to create client with optional token
   */
  const createClient = (token?: string) =>
    createBillingClient({
      baseUrl,
      getToken: token !== undefined ? () => token : () => null,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

  describe('client initialization', () => {
    it('should create client with all expected methods', () => {
      const client = createClient();

      // Plan methods
      expect(client).toHaveProperty('listPlans');

      // Subscription methods
      expect(client).toHaveProperty('getSubscription');
      expect(client).toHaveProperty('createCheckout');
      expect(client).toHaveProperty('cancelSubscription');
      expect(client).toHaveProperty('resumeSubscription');
      expect(client).toHaveProperty('updateSubscription');

      // Invoice methods
      expect(client).toHaveProperty('listInvoices');

      // Payment method methods
      expect(client).toHaveProperty('listPaymentMethods');
      expect(client).toHaveProperty('addPaymentMethod');
      expect(client).toHaveProperty('removePaymentMethod');
      expect(client).toHaveProperty('setDefaultPaymentMethod');
      expect(client).toHaveProperty('createSetupIntent');
    });

    it('should trim trailing slashes from baseUrl', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      const client = createBillingClient({
        baseUrl: 'http://localhost:3001///',
        fetchImpl: mockFetch as unknown as typeof fetch,
      });

      await client.listPlans();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/plans',
        expect.any(Object),
      );
    });
  });

  describe('listPlans', () => {
    it('should fetch plans without authentication', async () => {
      const mockPlans: PlansListResponse = {
        plans: [
          {
            id: 'plan-1' as PlanId,
            name: 'Basic',
            description: null,
            interval: 'month',
            priceInCents: 999,
            currency: 'USD',
            features: [],
            trialDays: 0,
            isActive: true,
            sortOrder: 1,
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPlans),
      });

      const client = createClient();
      const result = await client.listPlans();

      expect(result).toEqual(mockPlans);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/plans',
        expect.objectContaining({
          credentials: 'include',
        }),
      );

      // Verify no auth header is sent (public endpoint)
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle empty plans list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      const client = createClient();
      const result = await client.listPlans();

      expect(result.plans).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal Server Error' }),
      });

      const client = createClient();

      await expect(client.listPlans()).rejects.toThrow('Internal Server Error');
    });
  });

  describe('getSubscription', () => {
    it('should fetch subscription with authentication', async () => {
      const mockSubscription: SubscriptionResponse = {
        subscription: {
          id: 'sub-123' as SubscriptionId,
          userId: '550e8400-e29b-41d4-a716-446655440000' as UserId,
          planId: 'plan-1' as PlanId,
          plan: {
            id: 'plan-1' as PlanId,
            name: 'Basic',
            description: null,
            interval: 'month',
            priceInCents: 999,
            currency: 'USD',
            features: [],
            trialDays: 0,
            isActive: true,
            sortOrder: 1,
          },
          provider: 'stripe',
          status: 'active',
          currentPeriodStart: '2024-01-01T00:00:00Z',
          currentPeriodEnd: '2024-02-01T00:00:00Z',
          cancelAtPeriodEnd: false,
          canceledAt: null,
          trialEnd: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSubscription),
      });

      const client = createClient('test-token');
      const result = await client.getSubscription();

      expect(result).toEqual(mockSubscription);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/subscription',
        expect.objectContaining({
          credentials: 'include',
        }),
      );

      // Verify auth header is sent
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should handle 404 when no subscription exists', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Subscription not found' }),
      });

      const client = createClient('test-token');

      await expect(client.getSubscription()).rejects.toThrow('Subscription not found');
    });

    it('should handle unauthorized access', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const client = createClient();

      await expect(client.getSubscription()).rejects.toThrow('Unauthorized');
    });
  });

  describe('createCheckout', () => {
    it('should create checkout session with plan ID', async () => {
      const checkoutRequest: CheckoutRequest = {
        planId: 'plan-premium' as PlanId,
      };

      const mockResponse: CheckoutResponse = {
        sessionId: 'session-123',
        url: 'https://checkout.stripe.com/session-123',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.createCheckout(checkoutRequest);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/checkout',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(checkoutRequest),
          credentials: 'include',
        }),
      );

      // Verify Content-Type header
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle invalid plan ID', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid plan ID' }),
      });

      const client = createClient('test-token');

      await expect(client.createCheckout({ planId: 'invalid' as PlanId })).rejects.toThrow(
        'Invalid plan ID',
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately', async () => {
      const cancelRequest: CancelSubscriptionRequest = {
        immediately: true,
      };

      const mockResponse: SubscriptionActionResponse = {
        success: true,
        message: 'Subscription canceled successfully',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.cancelSubscription(cancelRequest);

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/subscription/cancel',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(cancelRequest),
        }),
      );
    });

    it('should cancel subscription at period end', async () => {
      const cancelRequest: CancelSubscriptionRequest = {
        immediately: false,
      };

      const mockResponse: SubscriptionActionResponse = {
        success: true,
        message: 'Subscription will be canceled at period end',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.cancelSubscription(cancelRequest);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Subscription will be canceled at period end');
    });

    it('should handle cancel without parameters (defaults to empty object)', async () => {
      const mockResponse: SubscriptionActionResponse = {
        success: true,
        message: 'Subscription canceled successfully',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.cancelSubscription();

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/subscription/cancel',
        expect.objectContaining({
          body: JSON.stringify({ immediately: false }),
        }),
      );
    });

    it('should handle already canceled subscription', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ message: 'Subscription already canceled' }),
      });

      const client = createClient('test-token');

      await expect(client.cancelSubscription()).rejects.toThrow('Subscription already canceled');
    });
  });

  describe('resumeSubscription', () => {
    it('should resume canceled subscription', async () => {
      const mockResponse: SubscriptionActionResponse = {
        success: true,
        message: 'Subscription resumed successfully',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.resumeSubscription();

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/subscription/resume',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({}),
        }),
      );
    });

    it('should handle resume on already active subscription', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ message: 'Subscription is already active' }),
      });

      const client = createClient('test-token');

      await expect(client.resumeSubscription()).rejects.toThrow('Subscription is already active');
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription plan', async () => {
      const updateRequest: UpdateSubscriptionRequest = {
        planId: 'plan-premium' as PlanId,
      };

      const mockResponse: SubscriptionActionResponse = {
        success: true,
        message: 'Subscription updated successfully',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.updateSubscription(updateRequest);

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/subscription/update',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(updateRequest),
        }),
      );
    });

    it('should handle downgrade to same plan', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Already subscribed to this plan' }),
      });

      const client = createClient('test-token');

      await expect(client.updateSubscription({ planId: 'plan-basic' as PlanId })).rejects.toThrow(
        'Already subscribed to this plan',
      );
    });
  });

  describe('listInvoices', () => {
    it('should fetch user invoices', async () => {
      const mockInvoices: InvoicesListResponse = {
        invoices: [
          {
            id: 'inv-1',
            status: 'paid',
            amountDue: 999,
            amountPaid: 999,
            currency: 'USD',
            periodStart: '2024-01-01T00:00:00Z',
            periodEnd: '2024-02-01T00:00:00Z',
            paidAt: '2024-01-05T00:00:00Z',
            invoicePdfUrl: 'https://invoice.pdf',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        hasMore: false,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockInvoices),
      });

      const client = createClient('test-token');
      const result = await client.listInvoices();

      expect(result).toEqual(mockInvoices);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/invoices',
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });

    it('should handle empty invoice list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invoices: [], hasMore: false }),
      });

      const client = createClient('test-token');
      const result = await client.listInvoices();

      expect(result.invoices).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('listPaymentMethods', () => {
    it('should fetch payment methods', async () => {
      const mockPaymentMethods: PaymentMethodsListResponse = {
        paymentMethods: [
          {
            id: 'pm-1',
            type: 'card',
            isDefault: true,
            cardDetails: {
              brand: 'visa',
              last4: '4242',
              expMonth: 12,
              expYear: 2025,
            },
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPaymentMethods),
      });

      const client = createClient('test-token');
      const result = await client.listPaymentMethods();

      expect(result).toEqual(mockPaymentMethods);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/payment-methods',
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });

    it('should handle user with no payment methods', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ paymentMethods: [] }),
      });

      const client = createClient('test-token');
      const result = await client.listPaymentMethods();

      expect(result.paymentMethods).toEqual([]);
    });
  });

  describe('addPaymentMethod', () => {
    it('should add payment method', async () => {
      const addRequest: AddPaymentMethodRequest = {
        paymentMethodId: 'pm_stripe_new',
      };

      const mockResponse: PaymentMethodResponse = {
        paymentMethod: {
          id: 'pm-2',
          type: 'card',
          isDefault: false,
          cardDetails: {
            brand: 'mastercard',
            last4: '5555',
            expMonth: 6,
            expYear: 2026,
          },
          createdAt: '2024-01-15T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.addPaymentMethod(addRequest);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/payment-methods/add',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(addRequest),
        }),
      );
    });

    it('should handle invalid payment method ID', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid payment method' }),
      });

      const client = createClient('test-token');

      await expect(client.addPaymentMethod({ paymentMethodId: 'invalid' })).rejects.toThrow(
        'Invalid payment method',
      );
    });
  });

  describe('removePaymentMethod', () => {
    it('should remove payment method', async () => {
      const mockResponse: SubscriptionActionResponse = {
        success: true,
        message: 'Payment method removed successfully',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.removePaymentMethod('pm-123');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/payment-methods/pm-123',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });

    it('should handle removing default payment method', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ message: 'Cannot remove default payment method' }),
      });

      const client = createClient('test-token');

      await expect(client.removePaymentMethod('pm-default')).rejects.toThrow(
        'Cannot remove default payment method',
      );
    });

    it('should handle non-existent payment method', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Payment method not found' }),
      });

      const client = createClient('test-token');

      await expect(client.removePaymentMethod('pm-nonexistent')).rejects.toThrow(
        'Payment method not found',
      );
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set payment method as default', async () => {
      const mockResponse: PaymentMethodResponse = {
        paymentMethod: {
          id: 'pm-2',
          type: 'card',
          isDefault: true,
          cardDetails: {
            brand: 'mastercard',
            last4: '5555',
            expMonth: 6,
            expYear: 2026,
          },
          createdAt: '2024-01-15T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.setDefaultPaymentMethod('pm-2');

      expect(result).toEqual(mockResponse);
      expect(result.paymentMethod.isDefault).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/payment-methods/pm-2/default',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({}),
        }),
      );
    });

    it('should handle already default payment method', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ message: 'Payment method is already default' }),
      });

      const client = createClient('test-token');

      await expect(client.setDefaultPaymentMethod('pm-1')).rejects.toThrow(
        'Payment method is already default',
      );
    });
  });

  describe('createSetupIntent', () => {
    it('should create setup intent for adding card', async () => {
      const mockResponse = {
        clientSecret: 'seti_123_secret_456',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.createSetupIntent();

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/setup-intent',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({}),
        }),
      );
    });

    it('should handle setup intent creation failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Failed to create setup intent' }),
      });

      const client = createClient('test-token');

      await expect(client.createSetupIntent()).rejects.toThrow('Failed to create setup intent');
    });
  });

  describe('error handling', () => {
    it('should throw NetworkError when fetch fails', async () => {
      const networkError = new Error('Network connection lost');
      mockFetch.mockRejectedValue(networkError);

      const client = createClient('test-token');

      await expect(client.getSubscription()).rejects.toThrow(
        'Failed to fetch GET /billing/subscription',
      );
    });

    it('should throw NetworkError with original error stored', async () => {
      const originalError = new Error('DNS resolution failed');
      mockFetch.mockRejectedValue(originalError);

      const client = createClient('test-token');

      try {
        await client.listInvoices();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toHaveProperty('message', 'Failed to fetch GET /billing/invoices');
        expect(error).toHaveProperty('originalError', originalError);
      }
    });

    it('should handle non-Error thrown from fetch', async () => {
      mockFetch.mockRejectedValue('string error');

      const client = createClient('test-token');

      await expect(client.listPlans()).rejects.toThrow('Failed to fetch GET /billing/plans');
    });

    it('should handle JSON parse failure gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const client = createClient('test-token');

      await expect(client.getSubscription()).rejects.toThrow();
    });

    it('should handle successful response with invalid JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Malformed JSON')),
      });

      const client = createClient('test-token');
      await expect(client.listPlans()).rejects.toThrow('plans must be an array');
    });

    it('should include correct method in NetworkError for POST requests', async () => {
      mockFetch.mockRejectedValue(new Error('Connection timeout'));

      const client = createClient('test-token');

      await expect(client.createCheckout({ planId: 'plan-1' as PlanId })).rejects.toThrow(
        'Failed to fetch POST /billing/checkout',
      );
    });

    it('should include correct method in NetworkError for DELETE requests', async () => {
      mockFetch.mockRejectedValue(new Error('Connection reset'));

      const client = createClient('test-token');

      await expect(client.removePaymentMethod('pm-123')).rejects.toThrow(
        'Failed to fetch DELETE /billing/payment-methods/pm-123',
      );
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Too many requests' }),
      });

      const client = createClient('test-token');

      await expect(client.listPlans()).rejects.toThrow('Too many requests');
    });

    it('should handle forbidden access', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'Forbidden' }),
      });

      const client = createClient('test-token');

      await expect(client.getSubscription()).rejects.toThrow('Forbidden');
    });

    it('should handle client-side validation errors', async () => {
      const client = createClient('test-token');

      try {
        await client.createCheckout({ planId: '' as PlanId });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toHaveProperty('message', 'PlanId must be at least 1 characters');
      }
    });
  });

  describe('authentication handling', () => {
    it('should include auth header for authenticated endpoints', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ subscription: null }),
      });

      const client = createClient('auth-token-123');
      await client.getSubscription();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer auth-token-123');
    });

    it('should not include auth header for public endpoints', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      const client = createClient('auth-token-123');
      await client.listPlans();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle missing token gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ subscription: null }),
      });

      const client = createClient();
      await client.getSubscription();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle null token from getToken', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invoices: [], hasMore: false }),
      });

      const client = createBillingClient({
        baseUrl,
        getToken: () => null,
        fetchImpl: mockFetch as unknown as typeof fetch,
      });

      await client.listInvoices();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });
  });

  describe('request configuration', () => {
    it('should always include credentials: include', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      const client = createClient();
      await client.listPlans();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });

    it('should always set Content-Type header to application/json', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ subscription: null }),
      });

      const client = createClient('test-token');
      await client.getSubscription();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should construct correct API URLs with /api prefix', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      const client = createClient();
      await client.listPlans();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/billing/plans',
        expect.any(Object),
      );
    });
  });
});
