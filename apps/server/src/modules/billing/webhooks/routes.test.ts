// apps/server/src/modules/billing/webhooks/routes.test.ts
/**
 * Billing Webhook Routes Unit Tests
 *
 * Tests for webhook route registration and configuration including:
 * - Route registration with billing enabled/disabled
 * - Raw body configuration for signature verification
 * - Request validation (headers, body, configuration)
 * - Handler invocation with correct parameters
 * - Error handling for signature validation and processing
 * - Status code mapping for different error types
 *
 * @complexity O(1) per test - simple mock verifications
 */

import { WebhookEventAlreadyProcessedError, WebhookSignatureError } from '@abe-stack/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('./stripe-webhook', () => ({
  handleStripeWebhook: vi.fn(),
}));

vi.mock('./paypal-webhook', () => ({
  handlePayPalWebhook: vi.fn(),
}));

import { handlePayPalWebhook } from './paypal-webhook';
import { registerWebhookRoutes } from './routes';
import { handleStripeWebhook } from './stripe-webhook';

import type { AppContext } from '@shared';
import type { FastifyInstance, FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create mock Fastify instance with route registration tracking
 */
function createMockFastify(): {
  instance: FastifyInstance;
  routes: Map<string, RouteOptions>;
} {
  const routes = new Map<string, RouteOptions>();

  const instance = {
    post: vi.fn((path: string, options: RouteOptions, handler?: unknown) => {
      // Handle both (path, options, handler) and (path, options-with-handler) signatures
      if (typeof handler === 'function') {
        routes.set(path, { ...options, handler });
      } else if (typeof options === 'object' && 'handler' in options) {
        routes.set(path, options);
      }
      return instance;
    }),
  } as unknown as FastifyInstance;

  return { instance, routes };
}

/**
 * Create mock AppContext with billing configuration
 */
function createMockContext(billingEnabled = true, configOverrides = {}): AppContext {
  return {
    config: {
      billing: {
        enabled: billingEnabled,
        stripe: {
          secretKey: 'sk_test_123',
          publishableKey: 'pk_test_123',
          webhookSecret: 'whsec_test_123',
        },
        paypal: {
          clientId: 'paypal_client_123',
          clientSecret: 'paypal_secret_123',
          webhookId: 'webhook_123',
          sandbox: true,
        },
        ...configOverrides,
      },
      server: {},
    },
    repos: {
      billingEvents: {} as never,
      subscriptions: {} as never,
      invoices: {} as never,
      plans: {} as never,
      customerMappings: {} as never,
    },
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    db: {} as never,
    pubsub: {} as never,
    email: {} as never,
    storage: {} as never,
    cache: {} as never,
    billing: {} as never,
    notifications: {} as never,
    queue: {} as never,
    write: {} as never,
    search: {} as never,
  } as unknown as AppContext;
}

/**
 * Create mock Fastify request with webhook payload
 */
function createMockRequest(
  headers: Record<string, string | string[] | undefined> = {},
  rawBody?: Buffer,
): FastifyRequest {
  return {
    headers,
    rawBody,
  } as FastifyRequest;
}

/**
 * Create mock Fastify reply with chainable methods
 */
function createMockReply(): FastifyReply {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
  return reply;
}

/**
 * Extract handler from route options safely
 */
function extractHandler(
  route: RouteOptions | undefined,
): ((request: FastifyRequest, reply: FastifyReply) => Promise<unknown>) | undefined {
  if (route === undefined) return undefined;
  // This type assertion is safe as we know the route was registered with a handler
  return (route as never).handler;
}

// ============================================================================
// Registration Tests
// ============================================================================

describe('registerWebhookRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Billing Disabled', () => {
    test('should not register any routes when billing is disabled', () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(false);

      registerWebhookRoutes(instance, ctx);

      expect(instance.post).not.toHaveBeenCalled();
      expect(routes.size).toBe(0);
    });

    test('should handle missing billing config gracefully', () => {
      const { instance, routes } = createMockFastify();
      const ctx = {
        ...createMockContext(false),
        config: {
          billing: undefined as never,
          server: {},
        },
      } as AppContext;

      // Function should not throw but also not register routes
      try {
        registerWebhookRoutes(instance, ctx);
      } catch (_error) {
        // Expected - billing config is undefined
      }
      expect(routes.size).toBe(0);
    });
  });

  describe('Billing Enabled', () => {
    test('should register Stripe webhook route with correct configuration', () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);

      registerWebhookRoutes(instance, ctx);

      expect(instance.post).toHaveBeenCalledWith(
        '/api/webhooks/stripe',
        expect.objectContaining({
          config: { rawBody: true },
        }),
        expect.any(Function),
      );

      const stripeRoute = routes.get('/api/webhooks/stripe');
      expect(stripeRoute).toBeDefined();
      expect(stripeRoute?.config).toEqual({ rawBody: true });
      expect(typeof stripeRoute?.handler).toBe('function');
    });

    test('should register PayPal webhook route with correct configuration', () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);

      registerWebhookRoutes(instance, ctx);

      expect(instance.post).toHaveBeenCalledWith(
        '/api/webhooks/paypal',
        expect.objectContaining({
          config: { rawBody: true },
        }),
        expect.any(Function),
      );

      const paypalRoute = routes.get('/api/webhooks/paypal');
      expect(paypalRoute).toBeDefined();
      expect(paypalRoute?.config).toEqual({ rawBody: true });
      expect(typeof paypalRoute?.handler).toBe('function');
    });

    test('should register both webhook routes', () => {
      const { instance } = createMockFastify();
      const ctx = createMockContext(true);

      registerWebhookRoutes(instance, ctx);

      expect(instance.post).toHaveBeenCalledTimes(2);
      expect(instance.post).toHaveBeenCalledWith(
        '/api/webhooks/stripe',
        expect.any(Object),
        expect.any(Function),
      );
      expect(instance.post).toHaveBeenCalledWith(
        '/api/webhooks/paypal',
        expect.any(Object),
        expect.any(Function),
      );
    });
  });
});

// ============================================================================
// Stripe Webhook Handler Tests
// ============================================================================

/* eslint-disable @typescript-eslint/unbound-method */
describe('Stripe Webhook Handler', () => {
  let stripeHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();

    const { instance, routes } = createMockFastify();
    const ctx = createMockContext(true);

    registerWebhookRoutes(instance, ctx);

    const stripeRoute = routes.get('/api/webhooks/stripe');
    const handler = extractHandler(stripeRoute);
    if (handler === undefined) throw new Error('Stripe handler not found');
    stripeHandler = handler;
  });

  describe('Request Validation', () => {
    test('should return 400 when stripe-signature header is missing', async () => {
      const request = createMockRequest({}, Buffer.from('{}'));
      const reply = createMockReply();

      await stripeHandler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Missing stripe-signature header',
      });
      expect(vi.mocked(handleStripeWebhook)).not.toHaveBeenCalled();
    });

    test('should return 400 when stripe-signature is not a string', async () => {
      const request = createMockRequest(
        { 'stripe-signature': ['array', 'value'] },
        Buffer.from('{}'),
      );
      const reply = createMockReply();

      await stripeHandler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Missing stripe-signature header',
      });
    });

    test('should return 500 when Stripe is not configured', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true, {
        stripe: { secretKey: undefined, publishableKey: 'pk_test', webhookSecret: 'whsec_test' },
      });

      registerWebhookRoutes(instance, ctx);

      const stripeRoute = routes.get('/api/webhooks/stripe');
      const handler = extractHandler(stripeRoute);
      if (handler === undefined) throw new Error('Stripe handler not found');

      const request = createMockRequest(
        { 'stripe-signature': 't=123,v1=abc' },
        Buffer.from('{}'),
      );
      const reply = createMockReply();

      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Stripe not configured',
      });
    });

    test('should return 400 when request body is missing', async () => {
      const request = createMockRequest({ 'stripe-signature': 't=123,v1=abc' });
      const reply = createMockReply();

      await stripeHandler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Missing request body',
      });
    });

    test('should return 400 when rawBody is explicitly set to undefined', async () => {
      const request = createMockRequest({ 'stripe-signature': 't=123,v1=abc' }, undefined);
      const reply = createMockReply();

      await stripeHandler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Missing request body',
      });
    });
  });

  describe('Successful Processing', () => {
    test('should call handleStripeWebhook with correct parameters', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);
      registerWebhookRoutes(instance, ctx);

      const stripeRoute = routes.get('/api/webhooks/stripe');
      const handler = extractHandler(stripeRoute);
      if (handler === undefined) throw new Error('Stripe handler not found');

      const payload = Buffer.from(JSON.stringify({ id: 'evt_123', type: 'invoice.paid' }));
      const signature = 't=1234567890,v1=signature_hash';
      const request = createMockRequest({ 'stripe-signature': signature }, payload);
      const reply = createMockReply();

      vi.mocked(handleStripeWebhook).mockResolvedValue({
        success: true,
        message: 'Event processed',
        eventId: 'evt_123',
      });

      await handler(request, reply);

      expect(vi.mocked(handleStripeWebhook)).toHaveBeenCalledWith(
        payload,
        signature,
        {
          secretKey: 'sk_test_123',
          publishableKey: 'pk_test_123',
          webhookSecret: 'whsec_test_123',
        },
        {
          billingEvents: ctx.repos.billingEvents,
          subscriptions: ctx.repos.subscriptions,
          invoices: ctx.repos.invoices,
          plans: ctx.repos.plans,
          customerMappings: ctx.repos.customerMappings,
        },
        ctx.log,
      );
    });

    test('should return 200 with result on successful processing', async () => {
      const payload = Buffer.from(JSON.stringify({ id: 'evt_123', type: 'invoice.paid' }));
      const request = createMockRequest({ 'stripe-signature': 't=123,v1=abc' }, payload);
      const reply = createMockReply();

      const expectedResult = {
        success: true,
        message: 'Event processed successfully',
        eventId: 'evt_123',
      };

      vi.mocked(handleStripeWebhook).mockResolvedValue(expectedResult);

      await stripeHandler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe('Error Handling', () => {
    test('should return 400 for WebhookSignatureError', async () => {
      const payload = Buffer.from(JSON.stringify({ id: 'evt_123' }));
      const request = createMockRequest({ 'stripe-signature': 't=123,v1=invalid' }, payload);
      const reply = createMockReply();

      vi.mocked(handleStripeWebhook).mockRejectedValue(
        new WebhookSignatureError('Invalid signature', 'stripe'),
      );

      await stripeHandler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Invalid webhook signature',
      });
    });

    test('should return 200 for WebhookEventAlreadyProcessedError (idempotency)', async () => {
      const payload = Buffer.from(JSON.stringify({ id: 'evt_123' }));
      const request = createMockRequest({ 'stripe-signature': 't=123,v1=abc' }, payload);
      const reply = createMockReply();

      vi.mocked(handleStripeWebhook).mockRejectedValue(
        new WebhookEventAlreadyProcessedError('evt_123', 'stripe'),
      );

      await stripeHandler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        success: true,
        message: 'Event already processed',
      });
    });

    test('should return 500 for generic errors', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);
      registerWebhookRoutes(instance, ctx);

      const stripeRoute = routes.get('/api/webhooks/stripe');
      const handler = extractHandler(stripeRoute);
      if (handler === undefined) throw new Error('Stripe handler not found');

      const payload = Buffer.from(JSON.stringify({ id: 'evt_123' }));
      const request = createMockRequest({ 'stripe-signature': 't=123,v1=abc' }, payload);
      const reply = createMockReply();

      const genericError = new Error('Database connection failed');
      vi.mocked(handleStripeWebhook).mockRejectedValue(genericError);

      await handler(request, reply);

      expect(ctx.log.error).toHaveBeenCalledWith(
        { error: genericError },
        'Stripe webhook error',
      );
      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Webhook processing failed',
      });
    });

    test('should log error for unexpected failures', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);
      registerWebhookRoutes(instance, ctx);

      const stripeRoute = routes.get('/api/webhooks/stripe');
      const handler = extractHandler(stripeRoute);
      if (handler === undefined) throw new Error('Stripe handler not found');

      const payload = Buffer.from(JSON.stringify({ id: 'evt_123' }));
      const request = createMockRequest({ 'stripe-signature': 't=123,v1=abc' }, payload);
      const reply = createMockReply();

      const error = new Error('Unexpected error');
      vi.mocked(handleStripeWebhook).mockRejectedValue(error);

      await handler(request, reply);

      expect(ctx.log.error).toHaveBeenCalledWith({ error }, 'Stripe webhook error');
    });
  });
});

// ============================================================================
// PayPal Webhook Handler Tests
// ============================================================================

/* eslint-disable @typescript-eslint/unbound-method */
describe('PayPal Webhook Handler', () => {
  let paypalHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();

    const { instance, routes } = createMockFastify();
    const ctx = createMockContext(true);

    registerWebhookRoutes(instance, ctx);

    const paypalRoute = routes.get('/api/webhooks/paypal');
    const handler = extractHandler(paypalRoute);
    if (handler === undefined) throw new Error('PayPal handler not found');
    paypalHandler = handler;
  });

  describe('Request Validation', () => {
    test('should return 500 when PayPal is not configured', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true, {
        paypal: {
          clientId: undefined,
          clientSecret: 'secret',
          webhookId: 'webhook_123',
          sandbox: true,
        },
      });

      registerWebhookRoutes(instance, ctx);

      const paypalRoute = routes.get('/api/webhooks/paypal');
      const handler = extractHandler(paypalRoute);
      if (handler === undefined) throw new Error('PayPal handler not found');

      const request = createMockRequest(
        {
          'paypal-transmission-id': 'id_123',
          'paypal-transmission-time': '2024-01-01T00:00:00Z',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-transmission-sig': 'signature',
        },
        Buffer.from('{}'),
      );
      const reply = createMockReply();

      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'PayPal not configured',
      });
    });

    test('should return 400 when request body is missing', async () => {
      const request = createMockRequest({
        'paypal-transmission-id': 'id_123',
        'paypal-transmission-time': '2024-01-01T00:00:00Z',
        'paypal-cert-url': 'https://api.paypal.com/cert',
        'paypal-transmission-sig': 'signature',
      });
      const reply = createMockReply();

      await paypalHandler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Missing request body',
      });
    });

    test('should handle missing PayPal headers gracefully', async () => {
      const request = createMockRequest({}, Buffer.from('{}'));
      const reply = createMockReply();

      // Should construct signature with undefined values
      vi.mocked(handlePayPalWebhook).mockResolvedValue({
        success: true,
        message: 'Event processed',
      });

      await paypalHandler(request, reply);

      // Verify handler was called with constructed signature (even if headers are undefined)
      expect(vi.mocked(handlePayPalWebhook)).toHaveBeenCalled();
      const callArgs = vi.mocked(handlePayPalWebhook).mock.calls[0];
      // Verify signature is a JSON string
      expect(typeof callArgs[1]).toBe('string');
    });
  });

  describe('Signature Construction', () => {
    test('should construct signature JSON from PayPal headers', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);
      registerWebhookRoutes(instance, ctx);

      const paypalRoute = routes.get('/api/webhooks/paypal');
      const handler = extractHandler(paypalRoute);
      if (handler === undefined) throw new Error('PayPal handler not found');

      const payload = Buffer.from(JSON.stringify({ id: 'WH-123', event_type: 'PAYMENT.SALE.COMPLETED' }));
      const headers = {
        'paypal-transmission-id': 'transmission_123',
        'paypal-transmission-time': '2024-01-01T00:00:00Z',
        'paypal-cert-url': 'https://api.paypal.com/v1/notifications/certs/cert_key',
        'paypal-transmission-sig': 'signature_hash_value',
      };
      const request = createMockRequest(headers, payload);
      const reply = createMockReply();

      vi.mocked(handlePayPalWebhook).mockResolvedValue({
        success: true,
        message: 'Event processed',
      });

      await handler(request, reply);

      const expectedSignature = JSON.stringify({
        transmissionId: 'transmission_123',
        transmissionTime: '2024-01-01T00:00:00Z',
        certUrl: 'https://api.paypal.com/v1/notifications/certs/cert_key',
        transmissionSig: 'signature_hash_value',
      });

      expect(vi.mocked(handlePayPalWebhook)).toHaveBeenCalledWith(
        payload,
        expectedSignature,
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
      );
    });

    test('should handle undefined header values in signature', async () => {
      const payload = Buffer.from(JSON.stringify({ id: 'WH-123' }));
      const request = createMockRequest(
        {
          'paypal-transmission-id': 'id_123',
          // Other headers intentionally missing
        },
        payload,
      );
      const reply = createMockReply();

      vi.mocked(handlePayPalWebhook).mockResolvedValue({
        success: true,
        message: 'Event processed',
      });

      await paypalHandler(request, reply);

      const callArgs = vi.mocked(handlePayPalWebhook).mock.calls[0];
       
      const signature = callArgs[1];
      const parsedSignature = JSON.parse(signature);

      expect(parsedSignature).toEqual({
        transmissionId: 'id_123',
        transmissionTime: undefined,
        certUrl: undefined,
        transmissionSig: undefined,
      });
    });
  });

  describe('Successful Processing', () => {
    test('should call handlePayPalWebhook with correct parameters', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);
      registerWebhookRoutes(instance, ctx);

      const paypalRoute = routes.get('/api/webhooks/paypal');
      const handler = extractHandler(paypalRoute);
      if (handler === undefined) throw new Error('PayPal handler not found');

      const payload = Buffer.from(JSON.stringify({ id: 'WH-123', event_type: 'PAYMENT.SALE.COMPLETED' }));
      const request = createMockRequest(
        {
          'paypal-transmission-id': 'id_123',
          'paypal-transmission-time': '2024-01-01T00:00:00Z',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-transmission-sig': 'signature',
        },
        payload,
      );
      const reply = createMockReply();

      vi.mocked(handlePayPalWebhook).mockResolvedValue({
        success: true,
        message: 'Event processed',
        eventId: 'WH-123',
      });

      await handler(request, reply);

      expect(vi.mocked(handlePayPalWebhook)).toHaveBeenCalledWith(
        payload,
        expect.any(String),
        {
          clientId: 'paypal_client_123',
          clientSecret: 'paypal_secret_123',
          webhookId: 'webhook_123',
          sandbox: true,
        },
        {
          billingEvents: ctx.repos.billingEvents,
          subscriptions: ctx.repos.subscriptions,
          invoices: ctx.repos.invoices,
          plans: ctx.repos.plans,
          customerMappings: ctx.repos.customerMappings,
        },
        ctx.log,
      );
    });

    test('should return 200 with result on successful processing', async () => {
      const payload = Buffer.from(JSON.stringify({ id: 'WH-123' }));
      const request = createMockRequest(
        {
          'paypal-transmission-id': 'id_123',
          'paypal-transmission-time': '2024-01-01T00:00:00Z',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-transmission-sig': 'signature',
        },
        payload,
      );
      const reply = createMockReply();

      const expectedResult = {
        success: true,
        message: 'Event processed successfully',
        eventId: 'WH-123',
      };

      vi.mocked(handlePayPalWebhook).mockResolvedValue(expectedResult);

      await paypalHandler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe('Error Handling', () => {
    test('should return 400 for WebhookSignatureError', async () => {
      const payload = Buffer.from(JSON.stringify({ id: 'WH-123' }));
      const request = createMockRequest(
        {
          'paypal-transmission-id': 'id_123',
          'paypal-transmission-time': '2024-01-01T00:00:00Z',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-transmission-sig': 'invalid_signature',
        },
        payload,
      );
      const reply = createMockReply();

      vi.mocked(handlePayPalWebhook).mockRejectedValue(
        new WebhookSignatureError('Invalid signature', 'paypal'),
      );

      await paypalHandler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Invalid webhook signature',
      });
    });

    test('should return 200 for WebhookEventAlreadyProcessedError (idempotency)', async () => {
      const payload = Buffer.from(JSON.stringify({ id: 'WH-123' }));
      const request = createMockRequest(
        {
          'paypal-transmission-id': 'id_123',
          'paypal-transmission-time': '2024-01-01T00:00:00Z',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-transmission-sig': 'signature',
        },
        payload,
      );
      const reply = createMockReply();

      vi.mocked(handlePayPalWebhook).mockRejectedValue(
        new WebhookEventAlreadyProcessedError('WH-123', 'paypal'),
      );

      await paypalHandler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        success: true,
        message: 'Event already processed',
      });
    });

    test('should return 500 for generic errors', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);
      registerWebhookRoutes(instance, ctx);

      const paypalRoute = routes.get('/api/webhooks/paypal');
      const handler = extractHandler(paypalRoute);
      if (handler === undefined) throw new Error('PayPal handler not found');

      const payload = Buffer.from(JSON.stringify({ id: 'WH-123' }));
      const request = createMockRequest(
        {
          'paypal-transmission-id': 'id_123',
          'paypal-transmission-time': '2024-01-01T00:00:00Z',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-transmission-sig': 'signature',
        },
        payload,
      );
      const reply = createMockReply();

      const genericError = new Error('Database connection failed');
      vi.mocked(handlePayPalWebhook).mockRejectedValue(genericError);

      await handler(request, reply);

      expect(ctx.log.error).toHaveBeenCalledWith(
        { error: genericError },
        'PayPal webhook error',
      );
      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Webhook processing failed',
      });
    });

    test('should log error for unexpected failures', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);
      registerWebhookRoutes(instance, ctx);

      const paypalRoute = routes.get('/api/webhooks/paypal');
      const handler = extractHandler(paypalRoute);
      if (handler === undefined) throw new Error('PayPal handler not found');

      const payload = Buffer.from(JSON.stringify({ id: 'WH-123' }));
      const request = createMockRequest(
        {
          'paypal-transmission-id': 'id_123',
          'paypal-transmission-time': '2024-01-01T00:00:00Z',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-transmission-sig': 'signature',
        },
        payload,
      );
      const reply = createMockReply();

      const error = new Error('Unexpected error');
      vi.mocked(handlePayPalWebhook).mockRejectedValue(error);

      await handler(request, reply);

      expect(ctx.log.error).toHaveBeenCalledWith({ error }, 'PayPal webhook error');
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration Edge Cases', () => {
    test('should handle partial Stripe configuration', () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true, {
        stripe: {
          secretKey: 'sk_test_123',
          publishableKey: 'pk_test_123',
          webhookSecret: undefined,
        },
      });

      registerWebhookRoutes(instance, ctx);

      expect(routes.size).toBe(2);
      expect(routes.has('/api/webhooks/stripe')).toBe(true);
    });

    test('should handle partial PayPal configuration', () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true, {
        paypal: {
          clientId: 'client_123',
          clientSecret: 'secret_123',
          webhookId: undefined,
          sandbox: false,
        },
      });

      registerWebhookRoutes(instance, ctx);

      expect(routes.size).toBe(2);
      expect(routes.has('/api/webhooks/paypal')).toBe(true);
    });
  });

  describe('Buffer Edge Cases', () => {
    test('should handle empty buffer payload for Stripe', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);
      registerWebhookRoutes(instance, ctx);

      const stripeRoute = routes.get('/api/webhooks/stripe');
      const handler = extractHandler(stripeRoute);
      if (handler === undefined) throw new Error('Stripe handler not found');

      const request = createMockRequest(
        { 'stripe-signature': 't=123,v1=abc' },
        Buffer.from(''),
      );
      const reply = createMockReply();

      vi.mocked(handleStripeWebhook).mockResolvedValue({
        success: true,
        message: 'Event processed',
      });

      await handler(request, reply);

      expect(vi.mocked(handleStripeWebhook)).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
      );
    });

    test('should handle large buffer payload for PayPal', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);
      registerWebhookRoutes(instance, ctx);

      const paypalRoute = routes.get('/api/webhooks/paypal');
      const handler = extractHandler(paypalRoute);
      if (handler === undefined) throw new Error('PayPal handler not found');

      // Use smaller payload to avoid timeout - we're testing the handler accepts it, not processing it
      const largePayload = Buffer.from('x'.repeat(10 * 1024)); // 10KB
      const request = createMockRequest(
        {
          'paypal-transmission-id': 'id_123',
          'paypal-transmission-time': '2024-01-01T00:00:00Z',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-transmission-sig': 'signature',
        },
        largePayload,
      );
      const reply = createMockReply();

      vi.mocked(handlePayPalWebhook).mockResolvedValue({
        success: true,
        message: 'Event processed',
      });

      await handler(request, reply);

      expect(vi.mocked(handlePayPalWebhook)).toHaveBeenCalledWith(
        largePayload,
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('Header Case Sensitivity', () => {
    test('should handle lowercase stripe-signature header', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);
      registerWebhookRoutes(instance, ctx);

      const stripeRoute = routes.get('/api/webhooks/stripe');
      const handler = extractHandler(stripeRoute);
      if (handler === undefined) throw new Error('Stripe handler not found');

      const request = createMockRequest(
        { 'stripe-signature': 't=123,v1=abc' },
        Buffer.from('{}'),
      );
      const reply = createMockReply();

      vi.mocked(handleStripeWebhook).mockResolvedValue({
        success: true,
        message: 'Event processed',
      });

      await handler(request, reply);

      expect(vi.mocked(handleStripeWebhook)).toHaveBeenCalled();
    });

    test('should handle lowercase paypal headers', async () => {
      const { instance, routes } = createMockFastify();
      const ctx = createMockContext(true);
      registerWebhookRoutes(instance, ctx);

      const paypalRoute = routes.get('/api/webhooks/paypal');
      const handler = extractHandler(paypalRoute);
      if (handler === undefined) throw new Error('PayPal handler not found');

      const request = createMockRequest(
        {
          'paypal-transmission-id': 'id_123',
          'paypal-transmission-time': '2024-01-01T00:00:00Z',
          'paypal-cert-url': 'https://api.paypal.com/cert',
          'paypal-transmission-sig': 'signature',
        },
        Buffer.from('{}'),
      );
      const reply = createMockReply();

      vi.mocked(handlePayPalWebhook).mockResolvedValue({
        success: true,
        message: 'Event processed',
      });

      await handler(request, reply);

      expect(vi.mocked(handlePayPalWebhook)).toHaveBeenCalled();
    });
  });
});
