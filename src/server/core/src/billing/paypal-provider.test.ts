// backend/core/src/billing/paypal-provider.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PayPalProvider } from './paypal-provider';

import type { CheckoutParams, CreateProductParams } from '@abe-stack/shared';
import type { PayPalProviderConfig as PayPalConfig } from '@abe-stack/shared/config';

// ============================================================================
// Mock Dependencies
// ============================================================================

global.fetch = vi.fn();

// ============================================================================
// Test Helpers
// ============================================================================

function createMockConfig(): PayPalConfig {
  return {
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    webhookId: 'test_webhook_id',
    sandbox: true,
  };
}

function mockFetchResponse(data: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response;
}

// ============================================================================
// Tests: Constructor
// ============================================================================

describe('PayPalProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with sandbox URL when sandbox is true', () => {
      const config = createMockConfig();
      config.sandbox = true;

      const provider = new PayPalProvider(config);

      expect(provider.provider).toBe('paypal');
    });

    it('should initialize with production URL when sandbox is false', () => {
      const config = createMockConfig();
      config.sandbox = false;

      const provider = new PayPalProvider(config);

      expect(provider.provider).toBe('paypal');
    });
  });

  // =========================================================================
  // Tests: OAuth Token Management
  // =========================================================================

  describe('getAccessToken', () => {
    it('should fetch and cache access token', async () => {
      const config = createMockConfig();
      const provider = new PayPalProvider(config);

      vi.mocked(fetch).mockResolvedValueOnce(
        mockFetchResponse({
          access_token: 'test_token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      );

      vi.mocked(fetch).mockResolvedValueOnce(
        mockFetchResponse({
          id: 'PLAN-123',
        }),
      );

      // Trigger token fetch by making an API call
      await provider.getSubscription('sub_123').catch(() => {
        // Ignore error, we just want to trigger token fetch
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/oauth2/token'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );
    });

    it('should reuse cached token if not expired', async () => {
      const config = createMockConfig();
      const provider = new PayPalProvider(config);

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockFetchResponse({
            access_token: 'test_token',
            token_type: 'Bearer',
            expires_in: 3600,
          }),
        )
        .mockResolvedValueOnce(mockFetchResponse({ id: 'sub_1' }))
        .mockResolvedValueOnce(mockFetchResponse({ id: 'sub_2' }));

      // First call - should fetch token
      await provider.getSubscription('sub_1').catch(() => {});

      // Second call - should reuse token
      await provider.getSubscription('sub_2').catch(() => {});

      // Should only have 3 fetch calls: token + 2 subscriptions
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw error on OAuth failure', async () => {
      const config = createMockConfig();
      const provider = new PayPalProvider(config);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      } as Response);

      await expect(provider.getSubscription('sub_123')).rejects.toThrow('PayPal OAuth failed');
    });
  });

  // =========================================================================
  // Tests: Customer Management
  // =========================================================================

  describe('createCustomer', () => {
    it('should return paypal-prefixed user ID', async () => {
      const provider = new PayPalProvider(createMockConfig());
      const customerId = await provider.createCustomer('user_123', 'test@example.com');

      expect(customerId).toBe('paypal_user_123');
    });
  });

  // =========================================================================
  // Tests: Checkout & Subscriptions
  // =========================================================================

  describe('createCheckoutSession', () => {
    it('should create subscription and return approval URL', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockFetchResponse({
            access_token: 'test_token',
            expires_in: 3600,
          }),
        )
        .mockResolvedValueOnce(
          mockFetchResponse({
            id: 'I-123',
            links: [
              { rel: 'approve', href: 'https://paypal.com/approve' },
              { rel: 'self', href: 'https://api.paypal.com/subscription' },
            ],
          }),
        );

      const params: CheckoutParams = {
        userId: 'user_123',
        email: 'test@example.com',
        planId: 'plan_123',
        priceId: 'PLAN-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        metadata: { foo: 'bar' },
      };

      const result = await provider.createCheckoutSession(params);

      expect(result.sessionId).toBe('I-123');
      expect(result.url).toBe('https://paypal.com/approve');
    });

    it('should throw if approval link is missing', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(
          mockFetchResponse({
            id: 'I-123',
            links: [{ rel: 'self', href: 'https://api.paypal.com/subscription' }],
          }),
        );

      const params: CheckoutParams = {
        userId: 'user_123',
        email: 'test@example.com',
        planId: 'plan_123',
        priceId: 'PLAN-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      await expect(provider.createCheckoutSession(params)).rejects.toThrow(
        'PayPal subscription missing approval link',
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel immediately when immediately=true', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(mockFetchResponse({}, 204));

      await provider.cancelSubscription('sub_123', true);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/billing/subscriptions/sub_123/cancel'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should suspend when immediately=false', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(mockFetchResponse({}, 204));

      await provider.cancelSubscription('sub_123', false);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/billing/subscriptions/sub_123/suspend'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  describe('resumeSubscription', () => {
    it('should activate subscription', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(mockFetchResponse({}, 204));

      await provider.resumeSubscription('sub_123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/billing/subscriptions/sub_123/activate'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  describe('updateSubscription', () => {
    it('should revise subscription plan', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(mockFetchResponse({}, 204));

      await provider.updateSubscription('sub_123', 'PLAN-456');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/billing/subscriptions/sub_123/revise'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('PLAN-456'),
        }),
      );
    });
  });

  describe('getSubscription', () => {
    it('should fetch and normalize subscription', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(
          mockFetchResponse({
            id: 'I-123',
            status: 'ACTIVE',
            plan_id: 'PLAN-123',
            subscriber: {
              email_address: 'test@example.com',
              payer_id: 'PAYER-123',
            },
            billing_info: {
              next_billing_time: '2024-01-01T00:00:00Z',
              last_payment: {
                amount: { value: '10.00', currency_code: 'USD' },
                time: '2023-12-01T00:00:00Z',
              },
            },
            start_time: '2023-11-01T00:00:00Z',
            create_time: '2023-11-01T00:00:00Z',
            update_time: '2023-12-01T00:00:00Z',
            custom_id: JSON.stringify({ userId: 'user_123' }),
            links: [],
          }),
        );

      const result = await provider.getSubscription('I-123');

      expect(result.id).toBe('I-123');
      expect(result.status).toBe('active');
      expect(result.priceId).toBe('PLAN-123');
      expect(result.customerId).toBe('PAYER-123');
      expect(result.metadata).toEqual({ userId: 'user_123' });
    });

    it('should handle suspended status as cancelAtPeriodEnd', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(
          mockFetchResponse({
            id: 'I-123',
            status: 'SUSPENDED',
            plan_id: 'PLAN-123',
            subscriber: { email_address: 'test@example.com', payer_id: 'PAYER-123' },
            billing_info: {},
            start_time: '2023-11-01T00:00:00Z',
            create_time: '2023-11-01T00:00:00Z',
            update_time: '2023-12-01T00:00:00Z',
            links: [],
          }),
        );

      const result = await provider.getSubscription('I-123');

      expect(result.cancelAtPeriodEnd).toBe(true);
    });

    it('should handle missing metadata gracefully', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(
          mockFetchResponse({
            id: 'I-123',
            status: 'ACTIVE',
            plan_id: 'PLAN-123',
            subscriber: { email_address: 'test@example.com', payer_id: 'PAYER-123' },
            billing_info: {},
            start_time: '2023-11-01T00:00:00Z',
            create_time: '2023-11-01T00:00:00Z',
            update_time: '2023-12-01T00:00:00Z',
            custom_id: 'invalid-json',
            links: [],
          }),
        );

      const result = await provider.getSubscription('I-123');

      expect(result.metadata).toEqual({});
    });
  });

  // =========================================================================
  // Tests: Payment Methods
  // =========================================================================

  describe('payment methods', () => {
    it('createSetupIntent should return placeholder', async () => {
      const provider = new PayPalProvider(createMockConfig());
      const result = await provider.createSetupIntent('cus_123');

      expect(result.clientSecret).toBe('paypal_use_subscription_flow');
    });

    it('listPaymentMethods should return empty array', async () => {
      const provider = new PayPalProvider(createMockConfig());
      const result = await provider.listPaymentMethods('cus_123');

      expect(result).toEqual([]);
    });

    it('attachPaymentMethod should be no-op', async () => {
      const provider = new PayPalProvider(createMockConfig());
      await expect(provider.attachPaymentMethod('cus_123', 'pm_123')).resolves.toBeUndefined();
    });

    it('detachPaymentMethod should be no-op', async () => {
      const provider = new PayPalProvider(createMockConfig());
      await expect(provider.detachPaymentMethod('pm_123')).resolves.toBeUndefined();
    });

    it('setDefaultPaymentMethod should be no-op', async () => {
      const provider = new PayPalProvider(createMockConfig());
      await expect(provider.setDefaultPaymentMethod('cus_123', 'pm_123')).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // Tests: Invoices
  // =========================================================================

  describe('listInvoices', () => {
    it('should return empty array when no transactions found', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(mockFetchResponse({ transaction_details: [] }));

      const result = await provider.listInvoices('cus_123');

      expect(result).toEqual([]);
    });

    it('should return empty array on API error', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockRejectedValueOnce(new Error('API error'));

      const result = await provider.listInvoices('cus_123');

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // Tests: Products & Prices
  // =========================================================================

  describe('createProduct', () => {
    it('should create product and plan', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(mockFetchResponse({ id: 'PROD-123', name: 'Test Product' }))
        .mockResolvedValueOnce(mockFetchResponse({ id: 'PLAN-123', product_id: 'PROD-123' }));

      const params: CreateProductParams = {
        name: 'Test Product',
        description: 'A test product',
        priceInCents: 1000,
        currency: 'usd',
        interval: 'month',
      };

      const result = await provider.createProduct(params);

      expect(result.productId).toBe('PROD-123');
      expect(result.priceId).toBe('PLAN-123');
    });

    it('should handle yearly interval', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(mockFetchResponse({ id: 'PROD-123', name: 'Test Product' }))
        .mockResolvedValueOnce(mockFetchResponse({ id: 'PLAN-123', product_id: 'PROD-123' }));

      const params: CreateProductParams = {
        name: 'Test Product',
        priceInCents: 10000,
        currency: 'usd',
        interval: 'year',
      };

      const result = await provider.createProduct(params);

      expect(result.priceId).toBe('PLAN-123');
    });
  });

  describe('updateProduct', () => {
    it('should patch product with name and description', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(mockFetchResponse({}, 204));

      await provider.updateProduct('PROD-123', 'New Name', 'New Description');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/catalogs/products/PROD-123'),
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    it('should handle missing description', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(mockFetchResponse({}, 204));

      await provider.updateProduct('PROD-123', 'New Name');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/catalogs/products/PROD-123'),
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });
  });

  describe('archivePrice', () => {
    it('should deactivate plan', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce(mockFetchResponse({}, 204));

      await provider.archivePrice('PLAN-123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/billing/plans/PLAN-123/deactivate'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  // =========================================================================
  // Tests: Webhooks
  // =========================================================================

  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature format', () => {
      const provider = new PayPalProvider(createMockConfig());
      const payload = Buffer.from(JSON.stringify({ event_type: 'test' }));
      const signature =
        'algo=SHA256withRSA, timestamp=2024-01-01T00:00:00Z, transmission_id=abc123';

      const result = provider.verifyWebhookSignature(payload, signature);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature format', () => {
      const provider = new PayPalProvider(createMockConfig());
      const payload = Buffer.from(JSON.stringify({ event_type: 'test' }));
      const signature = 'invalid-signature';

      const result = provider.verifyWebhookSignature(payload, signature);

      expect(result).toBe(false);
    });

    it('should return true when webhook ID is not configured', () => {
      const config = createMockConfig();
      config.webhookId = '';
      const provider = new PayPalProvider(config);
      const payload = Buffer.from(JSON.stringify({ event_type: 'test' }));
      const signature =
        'algo=SHA256withRSA, timestamp=2024-01-01T00:00:00Z, transmission_id=abc123';

      const result = provider.verifyWebhookSignature(payload, signature);

      expect(result).toBe(true);
    });
  });

  describe('parseWebhookEvent', () => {
    it('should parse subscription created event', () => {
      const provider = new PayPalProvider(createMockConfig());
      const payload = Buffer.from(
        JSON.stringify({
          id: 'WH-123',
          event_type: 'BILLING.SUBSCRIPTION.CREATED',
          resource_type: 'subscription',
          resource: {
            id: 'I-123',
            status: 'ACTIVE',
            subscriber: { payer_id: 'PAYER-123' },
            custom_id: JSON.stringify({ userId: 'user_123' }),
          },
          create_time: '2024-01-01T00:00:00Z',
        }),
      );

      const result = provider.parseWebhookEvent(payload, '');

      expect(result.type).toBe('subscription.created');
      expect(result.data.subscriptionId).toBe('I-123');
      expect(result.data.customerId).toBe('PAYER-123');
      expect(result.data.metadata).toEqual({ userId: 'user_123' });
    });

    it('should parse payment completed event', () => {
      const provider = new PayPalProvider(createMockConfig());
      const payload = Buffer.from(
        JSON.stringify({
          id: 'WH-123',
          event_type: 'PAYMENT.SALE.COMPLETED',
          resource_type: 'sale',
          resource: {
            id: 'SALE-123',
            billing_agreement_id: 'I-123',
            state: 'completed',
          },
          create_time: '2024-01-01T00:00:00Z',
        }),
      );

      const result = provider.parseWebhookEvent(payload, '');

      expect(result.type).toBe('invoice.paid');
      expect(result.data.invoiceId).toBe('SALE-123');
      expect(result.data.subscriptionId).toBe('I-123');
    });

    it('should handle unknown event types', () => {
      const provider = new PayPalProvider(createMockConfig());
      const payload = Buffer.from(
        JSON.stringify({
          id: 'WH-123',
          event_type: 'UNKNOWN.EVENT.TYPE',
          resource_type: 'unknown',
          resource: {},
          create_time: '2024-01-01T00:00:00Z',
        }),
      );

      const result = provider.parseWebhookEvent(payload, '');

      expect(result.type).toBe('unknown');
    });

    it('should handle invalid metadata gracefully', () => {
      const provider = new PayPalProvider(createMockConfig());
      const payload = Buffer.from(
        JSON.stringify({
          id: 'WH-123',
          event_type: 'BILLING.SUBSCRIPTION.CREATED',
          resource_type: 'subscription',
          resource: {
            id: 'I-123',
            status: 'ACTIVE',
            subscriber: { payer_id: 'PAYER-123' },
            custom_id: 'invalid-json',
          },
          create_time: '2024-01-01T00:00:00Z',
        }),
      );

      const result = provider.parseWebhookEvent(payload, '');

      expect(result.data.metadata).toBeUndefined();
    });
  });

  // =========================================================================
  // Tests: Error Handling
  // =========================================================================

  describe('error handling', () => {
    it('should throw on API errors', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Bad Request'),
        } as Response);

      await expect(provider.getSubscription('sub_123')).rejects.toThrow('PayPal API error (400)');
    });

    it('should handle 204 No Content responses', async () => {
      const provider = new PayPalProvider(createMockConfig());

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse({ access_token: 'test_token', expires_in: 3600 }))
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
          json: () => Promise.resolve({}),
        } as Response);

      await expect(provider.cancelSubscription('sub_123', true)).resolves.toBeUndefined();
    });
  });
});
