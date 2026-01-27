// apps/server/src/modules/billing/webhooks/paypal-webhook.test.ts
/**
 * Unit tests for PayPal webhook handler
 *
 * Tests webhook signature verification, event processing, idempotency,
 * and proper integration with repositories.
 *
 * @complexity O(1) per test - Unit tests with mocked dependencies
 */

/* eslint-disable @typescript-eslint/unbound-method */


import { WebhookEventAlreadyProcessedError, WebhookSignatureError } from '@abe-stack/core';
import { PayPalProvider } from '@infrastructure/billing';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { handlePayPalWebhook } from './paypal-webhook';

import type { WebhookRepositories, WebhookResult } from './paypal-webhook';
import type { PayPalProviderConfig as PayPalConfig } from '@abe-stack/core';
import type {
  BillingEvent,
  BillingEventRepository,
  CustomerMapping,
  CustomerMappingRepository,
  Invoice,
  InvoiceRepository,
  Plan,
  PlanRepository,
  Subscription,
  SubscriptionRepository,
} from '@abe-stack/db';
import type { FastifyBaseLogger } from 'fastify';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@infrastructure/billing', () => ({
  PayPalProvider: vi.fn(),
}));

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

function createMockLogger(): FastifyBaseLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => createMockLogger()),
    level: 'info',
    silent: vi.fn(),
  } as unknown as FastifyBaseLogger;
}

function createMockRepositories(): WebhookRepositories {
  return {
    billingEvents: {
      wasProcessed: vi.fn(),
      recordEvent: vi.fn(),
      findById: vi.fn(),
      findByProviderEventId: vi.fn(),
      deleteOlderThan: vi.fn(),
      listByType: vi.fn(),
    } as unknown as BillingEventRepository,
    subscriptions: {
      create: vi.fn(),
      update: vi.fn(),
      findByProviderSubscriptionId: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      deleteById: vi.fn(),
      list: vi.fn(),
    } as unknown as SubscriptionRepository,
    invoices: {
      upsert: vi.fn(),
      findById: vi.fn(),
      findByProviderInvoiceId: vi.fn(),
      listByUserId: vi.fn(),
      listBySubscriptionId: vi.fn(),
    } as unknown as InvoiceRepository,
    plans: {
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteById: vi.fn(),
    } as unknown as PlanRepository,
    customerMappings: {
      create: vi.fn(),
      findByProviderCustomerId: vi.fn(),
      findByUserId: vi.fn(),
      deleteById: vi.fn(),
    } as unknown as CustomerMappingRepository,
  };
}

function createMockPlan(): Plan {
  return {
    id: 'plan_123',
    name: 'Pro Plan',
    providerProductId: 'prod_123',
    providerPriceId: 'price_123',
    provider: 'paypal',
    interval: 'month',
    intervalCount: 1,
    currency: 'usd',
    amount: 2000,
    isActive: true,
    features: {},
    metadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

function createMockSubscription(): Subscription {
  return {
    id: 'sub_123',
    userId: 'user_123',
    planId: 'plan_123',
    provider: 'paypal',
    providerSubscriptionId: 'I-123456',
    providerCustomerId: 'cust_123',
    status: 'active',
    currentPeriodStart: new Date('2024-01-01'),
    currentPeriodEnd: new Date('2024-02-01'),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    trialEnd: null,
    metadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

function createPayloadBuffer(data: unknown): Buffer {
  return Buffer.from(JSON.stringify(data));
}

// ============================================================================
// Tests: Signature Verification
// ============================================================================

describe('handlePayPalWebhook', () => {
  let config: PayPalConfig;
  let repos: WebhookRepositories;
  let log: FastifyBaseLogger;
  let mockVerifyWebhookSignature: Mock;
  let mockParseWebhookEvent: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    config = createMockConfig();
    repos = createMockRepositories();
    log = createMockLogger();

    mockVerifyWebhookSignature = vi.fn();
    mockParseWebhookEvent = vi.fn();

    // Mock PayPalProvider as a class constructor
    vi.mocked(PayPalProvider).mockImplementation(
      function (this: any) {
        this.verifyWebhookSignature = mockVerifyWebhookSignature;
        this.parseWebhookEvent = mockParseWebhookEvent;
        return this;
      } as any,
    );
  });

  describe('signature verification', () => {
    it('should throw WebhookSignatureError when signature is invalid', async () => {
      const payload = createPayloadBuffer({ id: 'evt_123', event_type: 'TEST' });
      const signature = 'invalid_signature';

      mockVerifyWebhookSignature.mockReturnValue(false);

      await expect(
        handlePayPalWebhook(payload, signature, config, repos, log),
      ).rejects.toThrow(WebhookSignatureError);
    });

    it('should proceed when signature is valid', async () => {
      const eventId = 'evt_valid_123';
      const payload = createPayloadBuffer({
        id: eventId,
        event_type: 'BILLING.SUBSCRIPTION.CREATED',
        resource: {
          id: 'I-123',
          status: 'ACTIVE',
          subscriber: { payer_id: 'payer_123' },
          custom_id: JSON.stringify({ userId: 'user_123', planId: 'plan_123' }),
          start_time: '2024-01-01T00:00:00Z',
          billing_info: { next_billing_time: '2024-02-01T00:00:00Z' },
        },
        resource_type: 'subscription',
        create_time: '2024-01-01T00:00:00Z',
      });
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventId,
        type: 'subscription.created',
        data: {
          subscriptionId: 'I-123',
          customerId: 'payer_123',
          status: 'ACTIVE',
          metadata: { userId: 'user_123', planId: 'plan_123' },
          raw: JSON.parse(payload.toString()),
        },
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.plans.findById).mockResolvedValue(createMockPlan());
      vi.mocked(repos.customerMappings.findByProviderCustomerId).mockResolvedValue(null);
      vi.mocked(repos.subscriptions.create).mockResolvedValue(createMockSubscription());
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      const result = await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe(eventId);
    });
  });

  // ==========================================================================
  // Tests: Idempotency
  // ==========================================================================

  describe('idempotency', () => {
    it('should throw WebhookEventAlreadyProcessedError for duplicate events', async () => {
      const eventId = 'evt_duplicate_123';
      const payload = createPayloadBuffer({ id: eventId, event_type: 'TEST' });
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventId,
        type: 'subscription.created',
        data: {},
        createdAt: new Date(),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(true);

      await expect(
        handlePayPalWebhook(payload, signature, config, repos, log),
      ).rejects.toThrow(WebhookEventAlreadyProcessedError);

      expect(log.info).toHaveBeenCalledWith(
        { eventId },
        'Webhook event already processed, skipping',
      );
    });

    it('should process new events and record them', async () => {
      const eventId = 'evt_new_123';
      const payload = createPayloadBuffer({
        id: eventId,
        event_type: 'BILLING.SUBSCRIPTION.CREATED',
        resource: {
          id: 'I-123',
          status: 'ACTIVE',
          subscriber: { payer_id: 'payer_123' },
          custom_id: JSON.stringify({ userId: 'user_123', planId: 'plan_123' }),
          start_time: '2024-01-01T00:00:00Z',
          billing_info: { next_billing_time: '2024-02-01T00:00:00Z' },
        },
        resource_type: 'subscription',
        create_time: '2024-01-01T00:00:00Z',
      });
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventId,
        type: 'subscription.created',
        data: {
          subscriptionId: 'I-123',
          customerId: 'payer_123',
          status: 'ACTIVE',
          metadata: { userId: 'user_123', planId: 'plan_123' },
          raw: JSON.parse(payload.toString()),
        },
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.plans.findById).mockResolvedValue(createMockPlan());
      vi.mocked(repos.customerMappings.findByProviderCustomerId).mockResolvedValue(null);
      vi.mocked(repos.subscriptions.create).mockResolvedValue(createMockSubscription());
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(repos.billingEvents.recordEvent).toHaveBeenCalledWith({
        provider: 'paypal',
        providerEventId: eventId,
        eventType: 'subscription.created',
        payload: expect.any(Object),
        processedAt: expect.any(Date),
      });
    });
  });

  // ==========================================================================
  // Tests: subscription.created Event
  // ==========================================================================

  describe('subscription.created event', () => {
    function setupMocksForSubscriptionCreated(eventData: any) {
      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'subscription.created',
        data: {
          subscriptionId: eventData.resource?.id,
          customerId: eventData.resource?.subscriber?.payer_id,
          status: eventData.resource?.status,
          metadata:
            eventData.resource?.custom_id !== undefined && eventData.resource.custom_id !== ''
              ? JSON.parse(eventData.resource.custom_id)
              : undefined,
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });
    }

    it('should create subscription with valid data', async () => {
      const eventData = {
        id: 'evt_created_123',
        event_type: 'BILLING.SUBSCRIPTION.CREATED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'ACTIVE',
          subscriber: { payer_id: 'payer_123', email_address: 'user@example.com' },
          custom_id: JSON.stringify({ userId: 'user_123', planId: 'plan_123' }),
          start_time: '2024-01-01T00:00:00Z',
          billing_info: { next_billing_time: '2024-02-01T00:00:00Z' },
        },
        resource_type: 'subscription',
        create_time: '2024-01-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      setupMocksForSubscriptionCreated(eventData);

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.plans.findById).mockResolvedValue(createMockPlan());
      vi.mocked(repos.customerMappings.findByProviderCustomerId).mockResolvedValue(null);
      vi.mocked(repos.subscriptions.create).mockResolvedValue(createMockSubscription());
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      const result = await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(result.success).toBe(true);
      expect(repos.subscriptions.create).toHaveBeenCalledWith({
        userId: 'user_123',
        planId: 'plan_123',
        provider: 'paypal',
        providerSubscriptionId: 'I-SUBSCRIPTION-123',
        providerCustomerId: 'payer_123',
        status: 'active',
        currentPeriodStart: expect.any(Date),
        currentPeriodEnd: expect.any(Date),
        trialEnd: null,
        metadata: { userId: 'user_123', planId: 'plan_123' },
      });
    });

    it('should create customer mapping if it does not exist', async () => {
      const eventData = {
        id: 'evt_created_123',
        event_type: 'BILLING.SUBSCRIPTION.CREATED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'ACTIVE',
          subscriber: { payer_id: 'payer_123' },
          custom_id: JSON.stringify({ userId: 'user_123', planId: 'plan_123' }),
          start_time: '2024-01-01T00:00:00Z',
          billing_info: { next_billing_time: '2024-02-01T00:00:00Z' },
        },
        resource_type: 'subscription',
        create_time: '2024-01-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      setupMocksForSubscriptionCreated(eventData);

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.plans.findById).mockResolvedValue(createMockPlan());
      vi.mocked(repos.customerMappings.findByProviderCustomerId).mockResolvedValue(null);
      vi.mocked(repos.subscriptions.create).mockResolvedValue(createMockSubscription());
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(repos.customerMappings.create).toHaveBeenCalledWith({
        userId: 'user_123',
        provider: 'paypal',
        providerCustomerId: 'payer_123',
      });
    });

    it('should not create duplicate customer mapping if it exists', async () => {
      const eventData = {
        id: 'evt_created_123',
        event_type: 'BILLING.SUBSCRIPTION.CREATED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'ACTIVE',
          subscriber: { payer_id: 'payer_123' },
          custom_id: JSON.stringify({ userId: 'user_123', planId: 'plan_123' }),
          start_time: '2024-01-01T00:00:00Z',
          billing_info: { next_billing_time: '2024-02-01T00:00:00Z' },
        },
        resource_type: 'subscription',
        create_time: '2024-01-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      setupMocksForSubscriptionCreated(eventData);

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.plans.findById).mockResolvedValue(createMockPlan());
      vi.mocked(repos.customerMappings.findByProviderCustomerId).mockResolvedValue({
        id: 'mapping_123',
        userId: 'user_123',
        provider: 'paypal',
        providerCustomerId: 'payer_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CustomerMapping);
      vi.mocked(repos.subscriptions.create).mockResolvedValue(createMockSubscription());
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(repos.customerMappings.create).not.toHaveBeenCalled();
    });

    it('should handle missing subscription ID gracefully', async () => {
      const eventData = {
        id: 'evt_created_123',
        event_type: 'BILLING.SUBSCRIPTION.CREATED',
        resource: {
          id: '',
          status: 'ACTIVE',
          subscriber: { payer_id: 'payer_123' },
          custom_id: JSON.stringify({ userId: 'user_123', planId: 'plan_123' }),
        },
        resource_type: 'subscription',
        create_time: '2024-01-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      setupMocksForSubscriptionCreated(eventData);

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(log.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'Missing subscription ID in subscription.created event',
      );
      expect(repos.subscriptions.create).not.toHaveBeenCalled();
    });

    it('should handle missing userId in metadata', async () => {
      const eventData = {
        id: 'evt_created_123',
        event_type: 'BILLING.SUBSCRIPTION.CREATED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'ACTIVE',
          subscriber: { payer_id: 'payer_123' },
          custom_id: JSON.stringify({ planId: 'plan_123' }), // Missing userId
        },
        resource_type: 'subscription',
        create_time: '2024-01-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      setupMocksForSubscriptionCreated(eventData);

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(log.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'Missing userId or planId in subscription metadata',
      );
      expect(repos.subscriptions.create).not.toHaveBeenCalled();
    });

    it('should handle plan not found', async () => {
      const eventData = {
        id: 'evt_created_123',
        event_type: 'BILLING.SUBSCRIPTION.CREATED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'ACTIVE',
          subscriber: { payer_id: 'payer_123' },
          custom_id: JSON.stringify({ userId: 'user_123', planId: 'plan_123' }),
          start_time: '2024-01-01T00:00:00Z',
          billing_info: { next_billing_time: '2024-02-01T00:00:00Z' },
        },
        resource_type: 'subscription',
        create_time: '2024-01-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      setupMocksForSubscriptionCreated(eventData);

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.plans.findById).mockResolvedValue(null);
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(log.warn).toHaveBeenCalledWith({ planId: 'plan_123' }, 'Plan not found');
      expect(repos.subscriptions.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Tests: subscription.updated Event
  // ==========================================================================

  describe('subscription.updated event', () => {
    it('should update subscription status and dates', async () => {
      const eventData = {
        id: 'evt_updated_123',
        event_type: 'BILLING.SUBSCRIPTION.UPDATED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'ACTIVE',
          billing_info: {
            next_billing_time: '2024-03-01T00:00:00Z',
            last_payment: { time: '2024-02-01T00:00:00Z' },
          },
        },
        resource_type: 'subscription',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'subscription.updated',
        data: {
          subscriptionId: eventData.resource.id,
          status: eventData.resource.status,
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(
        createMockSubscription(),
      );
      vi.mocked(repos.subscriptions.update).mockResolvedValue(createMockSubscription());
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      const result = await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(result.success).toBe(true);
      expect(repos.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        status: 'active',
        currentPeriodStart: expect.any(Date),
        currentPeriodEnd: expect.any(Date),
        cancelAtPeriodEnd: false,
      });
    });

    it('should set cancelAtPeriodEnd when status is SUSPENDED', async () => {
      const eventData = {
        id: 'evt_updated_123',
        event_type: 'BILLING.SUBSCRIPTION.UPDATED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'SUSPENDED',
        },
        resource_type: 'subscription',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'subscription.updated',
        data: {
          subscriptionId: eventData.resource.id,
          status: eventData.resource.status,
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(
        createMockSubscription(),
      );
      vi.mocked(repos.subscriptions.update).mockResolvedValue(createMockSubscription());
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(repos.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        status: 'paused',
        currentPeriodStart: undefined,
        currentPeriodEnd: undefined,
        cancelAtPeriodEnd: true,
      });
    });

    it('should handle subscription not found', async () => {
      const eventData = {
        id: 'evt_updated_123',
        event_type: 'BILLING.SUBSCRIPTION.UPDATED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'ACTIVE',
        },
        resource_type: 'subscription',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'subscription.updated',
        data: {
          subscriptionId: eventData.resource.id,
          status: eventData.resource.status,
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(null);
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(log.warn).toHaveBeenCalledWith(
        { subscriptionId: 'I-SUBSCRIPTION-123' },
        'Subscription not found',
      );
      expect(repos.subscriptions.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Tests: subscription.canceled Event
  // ==========================================================================

  describe('subscription.canceled event', () => {
    it('should mark subscription as canceled', async () => {
      const eventData = {
        id: 'evt_canceled_123',
        event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'CANCELLED',
        },
        resource_type: 'subscription',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'subscription.canceled',
        data: {
          subscriptionId: eventData.resource.id,
          status: eventData.resource.status,
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(
        createMockSubscription(),
      );
      vi.mocked(repos.subscriptions.update).mockResolvedValue(createMockSubscription());
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      const result = await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(result.success).toBe(true);
      expect(repos.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        status: 'canceled',
        canceledAt: expect.any(Date),
      });
    });

    it('should handle subscription not found', async () => {
      const eventData = {
        id: 'evt_canceled_123',
        event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'CANCELLED',
        },
        resource_type: 'subscription',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'subscription.canceled',
        data: {
          subscriptionId: eventData.resource.id,
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(null);
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(log.warn).toHaveBeenCalledWith(
        { subscriptionId: 'I-SUBSCRIPTION-123' },
        'Subscription not found',
      );
      expect(repos.subscriptions.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Tests: invoice.paid Event
  // ==========================================================================

  describe('invoice.paid event', () => {
    it('should create paid invoice record', async () => {
      const eventData = {
        id: 'evt_paid_123',
        event_type: 'PAYMENT.SALE.COMPLETED',
        resource: {
          id: 'SALE-123',
          billing_agreement_id: 'I-SUBSCRIPTION-123',
          amount: { total: '20.00', currency: 'USD' },
          create_time: '2024-02-01T00:00:00Z',
          state: 'completed',
        },
        resource_type: 'sale',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'invoice.paid',
        data: {
          invoiceId: eventData.resource.id,
          subscriptionId: eventData.resource.billing_agreement_id,
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(
        createMockSubscription(),
      );
      vi.mocked(repos.invoices.upsert).mockResolvedValue({} as Invoice);
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      const result = await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(result.success).toBe(true);
      expect(repos.invoices.upsert).toHaveBeenCalledWith({
        userId: 'user_123',
        subscriptionId: 'sub_123',
        provider: 'paypal',
        providerInvoiceId: 'SALE-123',
        status: 'paid',
        amountDue: 2000,
        amountPaid: 2000,
        currency: 'usd',
        periodStart: expect.any(Date),
        periodEnd: expect.any(Date),
        paidAt: expect.any(Date),
        invoicePdfUrl: null,
      });
    });

    it('should update subscription to active if it was past_due', async () => {
      const eventData = {
        id: 'evt_paid_123',
        event_type: 'PAYMENT.SALE.COMPLETED',
        resource: {
          id: 'SALE-123',
          billing_agreement_id: 'I-SUBSCRIPTION-123',
          amount: { total: '20.00', currency: 'USD' },
          create_time: '2024-02-01T00:00:00Z',
        },
        resource_type: 'sale',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'invoice.paid',
        data: {
          invoiceId: eventData.resource.id,
          subscriptionId: eventData.resource.billing_agreement_id,
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      const pastDueSubscription = {
        ...createMockSubscription(),
        status: 'past_due' as const,
      };

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(
        pastDueSubscription,
      );
      vi.mocked(repos.subscriptions.update).mockResolvedValue(createMockSubscription());
      vi.mocked(repos.invoices.upsert).mockResolvedValue({} as Invoice);
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(repos.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        status: 'active',
      });
    });

    it('should handle subscription not found', async () => {
      const eventData = {
        id: 'evt_paid_123',
        event_type: 'PAYMENT.SALE.COMPLETED',
        resource: {
          id: 'SALE-123',
          billing_agreement_id: 'I-SUBSCRIPTION-123',
          amount: { total: '20.00', currency: 'USD' },
          create_time: '2024-02-01T00:00:00Z',
        },
        resource_type: 'sale',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'invoice.paid',
        data: {
          invoiceId: eventData.resource.id,
          subscriptionId: eventData.resource.billing_agreement_id,
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(null);
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(log.warn).toHaveBeenCalledWith(
        { invoiceId: 'SALE-123' },
        'Could not determine userId for PayPal sale',
      );
      expect(repos.invoices.upsert).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Tests: invoice.payment_failed Event
  // ==========================================================================

  describe('invoice.payment_failed event', () => {
    it('should mark subscription as past_due', async () => {
      const eventData = {
        id: 'evt_failed_123',
        event_type: 'PAYMENT.SALE.DENIED',
        resource: {
          id: 'SALE-FAILED-123',
          billing_agreement_id: 'I-SUBSCRIPTION-123',
          state: 'denied',
        },
        resource_type: 'sale',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'invoice.payment_failed',
        data: {
          subscriptionId: eventData.resource.billing_agreement_id,
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(
        createMockSubscription(),
      );
      vi.mocked(repos.subscriptions.update).mockResolvedValue(createMockSubscription());
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      const result = await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(result.success).toBe(true);
      expect(repos.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        status: 'past_due',
      });
    });

    it('should handle subscription not found', async () => {
      const eventData = {
        id: 'evt_failed_123',
        event_type: 'PAYMENT.SALE.DENIED',
        resource: {
          id: 'SALE-FAILED-123',
          billing_agreement_id: 'I-SUBSCRIPTION-123',
          state: 'denied',
        },
        resource_type: 'sale',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'invoice.payment_failed',
        data: {
          subscriptionId: eventData.resource.billing_agreement_id,
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(null);
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(log.warn).toHaveBeenCalledWith(
        { subscriptionId: 'I-SUBSCRIPTION-123' },
        'Subscription not found',
      );
      expect(repos.subscriptions.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Tests: refund.created Event
  // ==========================================================================

  describe('refund.created event', () => {
    it('should log refund event for auditing', async () => {
      const eventData = {
        id: 'evt_refund_123',
        event_type: 'PAYMENT.SALE.REFUNDED',
        resource: {
          id: 'REFUND-123',
          sale_id: 'SALE-123',
        },
        resource_type: 'refund',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'refund.created',
        data: {
          customerId: 'cust_123',
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      const result = await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(result.success).toBe(true);
      expect(log.info).toHaveBeenCalledWith(
        { eventId: eventData.id, customerId: 'cust_123' },
        'PayPal refund created',
      );
    });
  });

  // ==========================================================================
  // Tests: chargeback.created Event
  // ==========================================================================

  describe('chargeback.created event', () => {
    it('should log chargeback event with warning', async () => {
      const eventData = {
        id: 'evt_chargeback_123',
        event_type: 'CUSTOMER.DISPUTE.CREATED',
        resource: {
          dispute_id: 'DISPUTE-123',
          disputed_transactions: [{ seller_transaction_id: 'SALE-123' }],
        },
        resource_type: 'dispute',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'chargeback.created',
        data: {
          customerId: 'cust_123',
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      const result = await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(result.success).toBe(true);
      expect(log.warn).toHaveBeenCalledWith(
        { eventId: eventData.id, customerId: 'cust_123' },
        'PayPal chargeback/dispute created',
      );
    });
  });

  // ==========================================================================
  // Tests: Unknown Event Type
  // ==========================================================================

  describe('unknown event type', () => {
    it('should log info for unhandled event types', async () => {
      const eventData = {
        id: 'evt_unknown_123',
        event_type: 'UNKNOWN.EVENT.TYPE',
        resource: {},
        resource_type: 'unknown',
        create_time: '2024-02-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'unknown',
        data: {
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      const result = await handlePayPalWebhook(payload, signature, config, repos, log);

      expect(result.success).toBe(true);
      expect(log.info).toHaveBeenCalledWith({ eventType: 'unknown' }, 'Unhandled event type');
    });
  });

  // ==========================================================================
  // Tests: Error Handling
  // ==========================================================================

  describe('error handling', () => {
    it('should log error and rethrow when event processing fails', async () => {
      const eventData = {
        id: 'evt_error_123',
        event_type: 'BILLING.SUBSCRIPTION.CREATED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'ACTIVE',
          subscriber: { payer_id: 'payer_123' },
          custom_id: JSON.stringify({ userId: 'user_123', planId: 'plan_123' }),
        },
        resource_type: 'subscription',
        create_time: '2024-01-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'subscription.created',
        data: {
          subscriptionId: eventData.resource.id,
          customerId: eventData.resource.subscriber.payer_id,
          status: eventData.resource.status,
          metadata: JSON.parse(eventData.resource.custom_id),
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);

      const dbError = new Error('Database connection failed');
      vi.mocked(repos.plans.findById).mockRejectedValue(dbError);

      await expect(handlePayPalWebhook(payload, signature, config, repos, log)).rejects.toThrow(
        'Database connection failed',
      );

      expect(log.error).toHaveBeenCalledWith(
        {
          error: dbError,
          eventId: eventData.id,
          eventType: 'subscription.created',
        },
        'Error processing webhook event',
      );
    });

    it('should not record event when processing fails', async () => {
      const eventData = {
        id: 'evt_error_123',
        event_type: 'BILLING.SUBSCRIPTION.CREATED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'ACTIVE',
          subscriber: { payer_id: 'payer_123' },
          custom_id: JSON.stringify({ userId: 'user_123', planId: 'plan_123' }),
        },
        resource_type: 'subscription',
        create_time: '2024-01-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'subscription.created',
        data: {
          subscriptionId: eventData.resource.id,
          customerId: eventData.resource.subscriber.payer_id,
          status: eventData.resource.status,
          metadata: JSON.parse(eventData.resource.custom_id),
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.plans.findById).mockRejectedValue(new Error('Database error'));

      await expect(
        handlePayPalWebhook(payload, signature, config, repos, log),
      ).rejects.toThrow();

      expect(repos.billingEvents.recordEvent).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Tests: Return Value
  // ==========================================================================

  describe('return value', () => {
    it('should return success result with event ID and message', async () => {
      const eventData = {
        id: 'evt_success_123',
        event_type: 'BILLING.SUBSCRIPTION.CREATED',
        resource: {
          id: 'I-SUBSCRIPTION-123',
          status: 'ACTIVE',
          subscriber: { payer_id: 'payer_123' },
          custom_id: JSON.stringify({ userId: 'user_123', planId: 'plan_123' }),
          start_time: '2024-01-01T00:00:00Z',
          billing_info: { next_billing_time: '2024-02-01T00:00:00Z' },
        },
        resource_type: 'subscription',
        create_time: '2024-01-01T00:00:00Z',
      };

      const payload = createPayloadBuffer(eventData);
      const signature = 'valid_signature';

      mockVerifyWebhookSignature.mockReturnValue(true);
      mockParseWebhookEvent.mockReturnValue({
        id: eventData.id,
        type: 'subscription.created',
        data: {
          subscriptionId: eventData.resource.id,
          customerId: eventData.resource.subscriber.payer_id,
          status: eventData.resource.status,
          metadata: JSON.parse(eventData.resource.custom_id),
          raw: eventData,
        },
        createdAt: new Date(eventData.create_time),
      });

      vi.mocked(repos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(repos.plans.findById).mockResolvedValue(createMockPlan());
      vi.mocked(repos.customerMappings.findByProviderCustomerId).mockResolvedValue(null);
      vi.mocked(repos.subscriptions.create).mockResolvedValue(createMockSubscription());
      vi.mocked(repos.billingEvents.recordEvent).mockResolvedValue({} as BillingEvent);

      const result: WebhookResult = await handlePayPalWebhook(
        payload,
        signature,
        config,
        repos,
        log,
      );

      expect(result).toEqual({
        success: true,
        message: 'Processed subscription.created event',
        eventId: 'evt_success_123',
      });
    });
  });
});
