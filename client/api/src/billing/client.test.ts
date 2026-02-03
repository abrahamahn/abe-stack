// client/src/billing/client.test.ts
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
  PlansListResponse,
  SubscriptionActionResponse,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
} from '@abe-stack/shared';

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
      getToken: token !== undefined ? () => token : undefined,
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
            id: 'plan-1',
            name: 'Basic',
            provider: 'stripe',
            providerId: 'price_123',
            price: 999,
            currency: 'usd',
            interval: 'month',
            active: true,
            features: [],
            createdAt: '2024-01-01T00:00:00Z',
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
          id: 'sub-123',
          userId: 'user-1',
          planId: 'plan-1',
          provider: 'stripe',
          providerId: 'sub_stripe_123',
          status: 'active',
          currentPeriodStart: '2024-01-01T00:00:00Z',
          currentPeriodEnd: '2024-02-01T00:00:00Z',
          cancelAtPeriodEnd: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
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
        planId: 'plan-premium',
      };

      const mockResponse: CheckoutResponse = {
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

      await expect(client.createCheckout({ planId: 'invalid' })).rejects.toThrow('Invalid plan ID');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately', async () => {
      const cancelRequest: CancelSubscriptionRequest = {
        cancelAtPeriodEnd: false,
      };

      const mockResponse: SubscriptionActionResponse = {
        subscription: {
          id: 'sub-123',
          userId: 'user-1',
          planId: 'plan-1',
          provider: 'stripe',
          providerId: 'sub_stripe_123',
          status: 'canceled',
          currentPeriodStart: '2024-01-01T00:00:00Z',
          currentPeriodEnd: '2024-02-01T00:00:00Z',
          cancelAtPeriodEnd: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.cancelSubscription(cancelRequest);

      expect(result).toEqual(mockResponse);
      expect(result.subscription.status).toBe('canceled');
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
        cancelAtPeriodEnd: true,
      };

      const mockResponse: SubscriptionActionResponse = {
        subscription: {
          id: 'sub-123',
          userId: 'user-1',
          planId: 'plan-1',
          provider: 'stripe',
          providerId: 'sub_stripe_123',
          status: 'active',
          currentPeriodStart: '2024-01-01T00:00:00Z',
          currentPeriodEnd: '2024-02-01T00:00:00Z',
          cancelAtPeriodEnd: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.cancelSubscription(cancelRequest);

      expect(result.subscription.cancelAtPeriodEnd).toBe(true);
      expect(result.subscription.status).toBe('active');
    });

    it('should handle cancel without parameters (defaults to empty object)', async () => {
      const mockResponse: SubscriptionActionResponse = {
        subscription: {
          id: 'sub-123',
          userId: 'user-1',
          planId: 'plan-1',
          provider: 'stripe',
          providerId: 'sub_stripe_123',
          status: 'canceled',
          currentPeriodStart: '2024-01-01T00:00:00Z',
          currentPeriodEnd: '2024-02-01T00:00:00Z',
          cancelAtPeriodEnd: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
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
          body: JSON.stringify({}),
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
        subscription: {
          id: 'sub-123',
          userId: 'user-1',
          planId: 'plan-1',
          provider: 'stripe',
          providerId: 'sub_stripe_123',
          status: 'active',
          currentPeriodStart: '2024-01-01T00:00:00Z',
          currentPeriodEnd: '2024-02-01T00:00:00Z',
          cancelAtPeriodEnd: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.resumeSubscription();

      expect(result).toEqual(mockResponse);
      expect(result.subscription.cancelAtPeriodEnd).toBe(false);
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
        planId: 'plan-premium',
      };

      const mockResponse: SubscriptionActionResponse = {
        subscription: {
          id: 'sub-123',
          userId: 'user-1',
          planId: 'plan-premium',
          provider: 'stripe',
          providerId: 'sub_stripe_123',
          status: 'active',
          currentPeriodStart: '2024-01-01T00:00:00Z',
          currentPeriodEnd: '2024-02-01T00:00:00Z',
          cancelAtPeriodEnd: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('test-token');
      const result = await client.updateSubscription(updateRequest);

      expect(result).toEqual(mockResponse);
      expect(result.subscription.planId).toBe('plan-premium');
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

      await expect(client.updateSubscription({ planId: 'plan-basic' })).rejects.toThrow(
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
            subscriptionId: 'sub-123',
            provider: 'stripe',
            providerId: 'in_123',
            amountPaid: 999,
            currency: 'usd',
            status: 'paid',
            pdfUrl: 'https://invoice.pdf',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
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
        json: () => Promise.resolve({ invoices: [] }),
      });

      const client = createClient('test-token');
      const result = await client.listInvoices();

      expect(result.invoices).toEqual([]);
    });
  });

  describe('listPaymentMethods', () => {
    it('should fetch payment methods', async () => {
      const mockPaymentMethods: PaymentMethodsListResponse = {
        paymentMethods: [
          {
            id: 'pm-1',
            userId: 'user-1',
            provider: 'stripe',
            providerId: 'pm_123',
            type: 'card',
            last4: '4242',
            brand: 'visa',
            expiryMonth: 12,
            expiryYear: 2025,
            isDefault: true,
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
          userId: 'user-1',
          provider: 'stripe',
          providerId: 'pm_stripe_new',
          type: 'card',
          last4: '5555',
          brand: 'mastercard',
          expiryMonth: 6,
          expiryYear: 2026,
          isDefault: false,
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
        subscription: {
          id: 'sub-123',
          userId: 'user-1',
          planId: 'plan-1',
          provider: 'stripe',
          providerId: 'sub_stripe_123',
          status: 'active',
          currentPeriodStart: '2024-01-01T00:00:00Z',
          currentPeriodEnd: '2024-02-01T00:00:00Z',
          cancelAtPeriodEnd: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
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
          userId: 'user-1',
          provider: 'stripe',
          providerId: 'pm_stripe_123',
          type: 'card',
          last4: '5555',
          brand: 'mastercard',
          expiryMonth: 6,
          expiryYear: 2026,
          isDefault: true,
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

      const result = await client.listPlans();

      // Should return empty object when JSON parsing fails
      expect(result).toEqual({});
    });

    it('should include correct method in NetworkError for POST requests', async () => {
      mockFetch.mockRejectedValue(new Error('Connection timeout'));

      const client = createClient('test-token');

      await expect(client.createCheckout({ planId: 'plan-1' })).rejects.toThrow(
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

    it('should handle bad request errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            message: 'Validation failed',
            details: { planId: 'Required field' },
          }),
      });

      const client = createClient('test-token');

      try {
        await client.createCheckout({ planId: '' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toHaveProperty('message', 'Validation failed');
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
        json: () => Promise.resolve({ invoices: [] }),
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
