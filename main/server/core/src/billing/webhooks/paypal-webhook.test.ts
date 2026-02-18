// main/server/core/src/billing/webhooks/paypal-webhook.test.ts
/**
 * PayPal Webhook Handler Unit Tests
 *
 * Tests for PayPal webhook event processing including signature verification,
 * idempotency checking, and subscription lifecycle event handling.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBillingEventRepository,
  createCustomerMappingRepository,
  createInvoiceRepository,
  createPlanRepository,
  createSubscriptionRepository,
  type RawDb,
} from '../../../../db/src';

import { handlePayPalWebhook } from './paypal-webhook';

import type { WebhookRepositories } from '../types';
import type { NormalizedWebhookEvent } from '@abe-stack/shared';
import type { PayPalProviderConfig as PayPalConfig } from '@abe-stack/shared/config';
import type { ServerLogger } from '@abe-stack/shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

const { MockPayPalProvider } = vi.hoisted(() => {
  return { MockPayPalProvider: vi.fn() };
});

vi.mock('@abe-stack/db', () => ({
  createBillingEventRepository: vi.fn(),
  createCustomerMappingRepository: vi.fn(),
  createInvoiceRepository: vi.fn(),
  createPlanRepository: vi.fn(),
  createSubscriptionRepository: vi.fn(),
}));

vi.mock('../paypal-provider', () => ({
  PayPalProvider: MockPayPalProvider,
}));

const mockProviderInstance = {
  verifyWebhookSignature: vi.fn(),
  parseWebhookEvent: vi.fn(),
};

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create mock PayPal configuration.
 *
 * @returns Mock PayPal config
 * @complexity O(1)
 */
function createMockPayPalConfig(): PayPalConfig {
  return {
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    webhookId: 'test_webhook_id',
    sandbox: true,
  };
}

/**
 * Create mock webhook repositories.
 *
 * @returns Mocked webhook repositories
 * @complexity O(1)
 */
function createMockRepositories(): WebhookRepositories {
  return {
    db: {
      transaction: vi.fn((cb: (tx: RawDb) => Promise<any>) => cb({} as RawDb)) as any,
    },
    billingEvents: {
      wasProcessed: vi.fn(),
      recordEvent: vi.fn(),
    },
    subscriptions: {
      create: vi.fn(),
      update: vi.fn(),
      findByProviderSubscriptionId: vi.fn(),
    },
    invoices: {
      upsert: vi.fn(),
    },
    plans: {
      findById: vi.fn(),
    },
    customerMappings: {
      findByProviderCustomerId: vi.fn(),
      create: vi.fn(),
    },
  } as unknown as WebhookRepositories;
}

/**
 * Create mock ServerLogger.
 *
 * @returns Mocked logger
 * @complexity O(1)
 */
function createMockLogger(): ServerLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  } as unknown as ServerLogger;
}

/**
 * Create a normalized webhook event for testing.
 *
 * @param overrides - Optional partial overrides
 * @returns Normalized webhook event
 * @complexity O(1)
 */
function createNormalizedEvent(
  overrides?: Partial<NormalizedWebhookEvent>,
): NormalizedWebhookEvent {
  return {
    id: 'evt_paypal_123',
    type: 'subscription.created',
    data: {
      subscriptionId: 'I-SUB123',
      customerId: 'PAYPAL_CUS_123',
      status: 'ACTIVE',
      metadata: { userId: 'user_123', planId: 'plan_123' },
      raw: {
        resource: {
          start_time: '2024-01-01T00:00:00Z',
          billing_info: {
            next_billing_time: '2024-02-01T00:00:00Z',
          },
        },
      },
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('handlePayPalWebhook', () => {
  let mockConfig: PayPalConfig;
  let mockRepos: WebhookRepositories;
  let mockLog: ServerLogger;
  let payload: Buffer;
  let signature: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = createMockPayPalConfig();
    mockRepos = createMockRepositories();
    mockLog = createMockLogger();
    payload = Buffer.from('{"id": "evt_paypal_test"}');
    signature = '{"transmissionId":"test"}';

    MockPayPalProvider.mockImplementation(function (this: typeof mockProviderInstance) {
      this.verifyWebhookSignature = mockProviderInstance.verifyWebhookSignature;
      this.parseWebhookEvent = mockProviderInstance.parseWebhookEvent;
      return this;
    });

    mockProviderInstance.verifyWebhookSignature.mockReturnValue(true);
    mockProviderInstance.parseWebhookEvent.mockReturnValue(createNormalizedEvent());

    // Setup factory mocks to return our repository mocks
    vi.mocked(createBillingEventRepository).mockReturnValue(mockRepos.billingEvents);
    vi.mocked(createCustomerMappingRepository).mockReturnValue(mockRepos.customerMappings);
    vi.mocked(createInvoiceRepository).mockReturnValue(mockRepos.invoices);
    vi.mocked(createPlanRepository).mockReturnValue(mockRepos.plans);
    vi.mocked(createSubscriptionRepository).mockReturnValue(mockRepos.subscriptions);
  });

  describe('signature verification', () => {
    it('should throw WebhookSignatureError when signature is invalid', async () => {
      mockProviderInstance.verifyWebhookSignature = vi.fn().mockReturnValue(false);

      await expect(
        handlePayPalWebhook(payload, signature, mockConfig, mockRepos, mockLog),
      ).rejects.toMatchObject({
        name: 'WebhookSignatureError',
      });
    });

    it('should proceed when signature is valid', async () => {
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.plans.findById).mockResolvedValue({
        id: 'plan_123',
        name: 'Test',
        description: 'Test',
        stripePriceId: null,
        stripeProductId: null,
        paypalPlanId: 'P-PAYPAL_PLAN',
        priceInCents: 1000,
        currency: 'usd',
        interval: 'month',
        isActive: true,
        features: [],
        trialDays: 0,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue(null);

      const result = await handlePayPalWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
    });
  });

  describe('idempotency', () => {
    it('should throw WebhookEventAlreadyProcessedError when event already processed', async () => {
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(true);

      await expect(
        handlePayPalWebhook(payload, signature, mockConfig, mockRepos, mockLog),
      ).rejects.toMatchObject({
        name: 'WebhookEventAlreadyProcessedError',
      });

      expect(mockRepos.billingEvents.wasProcessed).toHaveBeenCalledWith('paypal', 'evt_paypal_123');
    });
  });

  describe('subscription.created event', () => {
    it('should create subscription with valid data', async () => {
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.plans.findById).mockResolvedValue({
        id: 'plan_123',
        name: 'Test',
        description: 'Test',
        stripePriceId: null,
        stripeProductId: null,
        paypalPlanId: 'P-PAYPAL_PLAN',
        priceInCents: 1000,
        currency: 'usd',
        interval: 'month',
        isActive: true,
        features: [],
        trialDays: 0,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue(null);

      const result = await handlePayPalWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          planId: 'plan_123',
          provider: 'paypal',
          providerSubscriptionId: 'I-SUB123',
          status: 'active',
        }),
      );
    });

    it('should skip when userId is missing from metadata', async () => {
      const event = createNormalizedEvent({
        data: {
          subscriptionId: 'I-SUB123',
          status: 'ACTIVE',
          metadata: { planId: 'plan_123' },
          raw: {},
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handlePayPalWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.create).not.toHaveBeenCalled();
    });
  });

  describe('subscription.updated event', () => {
    it('should update subscription status', async () => {
      const event = createNormalizedEvent({
        type: 'subscription.updated',
        data: {
          subscriptionId: 'I-SUB123',
          status: 'SUSPENDED',
          raw: {
            resource: {
              billing_info: {
                next_billing_time: '2024-03-01T00:00:00Z',
              },
            },
          },
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.subscriptions.findByProviderSubscriptionId).mockResolvedValue({
        id: 'sub_db_123',
        userId: 'user_123',
        planId: 'plan_123',
        provider: 'paypal',
        providerSubscriptionId: 'I-SUB123',
        providerCustomerId: 'PAYPAL_CUS_123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await handlePayPalWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.update).toHaveBeenCalledWith(
        'sub_db_123',
        expect.objectContaining({
          status: 'paused',
          cancelAtPeriodEnd: true,
        }),
      );
    });
  });

  describe('subscription.canceled event', () => {
    it('should cancel subscription', async () => {
      const event = createNormalizedEvent({
        type: 'subscription.canceled',
        data: {
          subscriptionId: 'I-SUB123',
          raw: {},
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.subscriptions.findByProviderSubscriptionId).mockResolvedValue({
        id: 'sub_db_123',
        userId: 'user_123',
        planId: 'plan_123',
        provider: 'paypal',
        providerSubscriptionId: 'I-SUB123',
        providerCustomerId: 'PAYPAL_CUS_123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await handlePayPalWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.update).toHaveBeenCalledWith(
        'sub_db_123',
        expect.objectContaining({
          status: 'canceled',
          canceledAt: expect.any(Date),
        }),
      );
    });
  });

  describe('invoice.paid event', () => {
    it('should record paid invoice', async () => {
      const event = createNormalizedEvent({
        type: 'invoice.paid',
        data: {
          invoiceId: 'SALE_123',
          subscriptionId: 'I-SUB123',
          raw: {
            resource: {
              amount: { total: '19.99', currency: 'USD' },
              create_time: '2024-01-15T00:00:00Z',
            },
          },
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.subscriptions.findByProviderSubscriptionId).mockResolvedValue({
        id: 'sub_db_123',
        userId: 'user_123',
        planId: 'plan_123',
        provider: 'paypal',
        providerSubscriptionId: 'I-SUB123',
        providerCustomerId: 'PAYPAL_CUS_123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await handlePayPalWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.invoices.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          provider: 'paypal',
          providerInvoiceId: 'SALE_123',
          status: 'paid',
          amountDue: 1999,
          amountPaid: 1999,
          currency: 'usd',
        }),
      );
    });
  });

  describe('invoice.payment_failed event', () => {
    it('should mark subscription as past_due', async () => {
      const event = createNormalizedEvent({
        type: 'invoice.payment_failed',
        data: {
          subscriptionId: 'I-SUB123',
          raw: {},
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.subscriptions.findByProviderSubscriptionId).mockResolvedValue({
        id: 'sub_db_123',
        userId: 'user_123',
        planId: 'plan_123',
        provider: 'paypal',
        providerSubscriptionId: 'I-SUB123',
        providerCustomerId: 'PAYPAL_CUS_123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await handlePayPalWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.update).toHaveBeenCalledWith('sub_db_123', {
        status: 'past_due',
      });
    });
  });

  describe('refund and chargeback events', () => {
    it('should log refund event', async () => {
      const event = createNormalizedEvent({
        type: 'refund.created',
        data: {
          customerId: 'PAYPAL_CUS_123',
          raw: {},
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handlePayPalWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockLog.info).toHaveBeenCalledWith(
        { eventId: 'evt_paypal_123', customerId: 'PAYPAL_CUS_123' },
        'PayPal refund created',
      );
    });

    it('should log chargeback event with warning', async () => {
      const event = createNormalizedEvent({
        type: 'chargeback.created',
        data: {
          customerId: 'PAYPAL_CUS_123',
          raw: {},
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handlePayPalWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockLog.warn).toHaveBeenCalledWith(
        { eventId: 'evt_paypal_123', customerId: 'PAYPAL_CUS_123' },
        'PayPal chargeback/dispute created',
      );
    });
  });

  describe('error handling', () => {
    it('should log error and throw when event processing fails', async () => {
      const event = createNormalizedEvent();
      const error = new Error('Database error');

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.plans.findById).mockRejectedValue(error);

      await expect(
        handlePayPalWebhook(payload, signature, mockConfig, mockRepos, mockLog),
      ).rejects.toThrow('Database error');

      expect(mockLog.error).toHaveBeenCalledWith(
        { error, eventId: event.id, eventType: event.type },
        'Error processing webhook event',
      );
    });
  });
});
