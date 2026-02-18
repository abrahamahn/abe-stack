// main/server/core/src/billing/webhooks/stripe-webhook.test.ts
/**
 * Stripe Webhook Handler Unit Tests
 *
 * Tests for Stripe webhook event processing including signature verification,
 * idempotency checking, and subscription lifecycle event handling.
 */

import { Buffer } from 'node:buffer';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBillingEventRepository,
  createCustomerMappingRepository,
  createInvoiceRepository,
  createPlanRepository,
  createSubscriptionRepository,
  type RawDb,
} from '../../../../db/src';

import { handleStripeWebhook } from './stripe-webhook';

import type { NormalizedWebhookEvent, ServerLogger } from '@bslt/shared';
import type { StripeProviderConfig as StripeConfig } from '@bslt/shared/config';
import type { WebhookRepositories } from '../types';

// ============================================================================
// Mock Dependencies
// ============================================================================

const { MockStripeProvider } = vi.hoisted(() => {
  return { MockStripeProvider: vi.fn() };
});

vi.mock('../stripe-provider', () => ({
  StripeProvider: MockStripeProvider,
}));

vi.mock('@bslt/db', () => ({
  createBillingEventRepository: vi.fn(),
  createCustomerMappingRepository: vi.fn(),
  createInvoiceRepository: vi.fn(),
  createPlanRepository: vi.fn(),
  createSubscriptionRepository: vi.fn(),
}));

const mockProviderInstance = {
  verifyWebhookSignature: vi.fn(),
  parseWebhookEvent: vi.fn(),
};

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create mock Stripe configuration.
 *
 * @returns Mock Stripe config
 * @complexity O(1)
 */
function createMockStripeConfig(): StripeConfig {
  return {
    secretKey: 'sk_test_mock',
    webhookSecret: 'whsec_test_mock',
    publishableKey: 'pk_test_mock',
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
    id: 'evt_test_123',
    type: 'subscription.created',
    data: {
      subscriptionId: 'sub_test_123',
      customerId: 'cus_test_123',
      status: 'active',
      metadata: { planId: 'plan_test_123' },
      raw: {
        current_period_start: 1640000000,
        current_period_end: 1642000000,
        trial_end: null,
      },
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('handleStripeWebhook', () => {
  let mockConfig: StripeConfig;
  let mockRepos: WebhookRepositories;
  let mockLog: ServerLogger;
  let payload: Buffer;
  let signature: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = createMockStripeConfig();
    mockRepos = createMockRepositories();
    mockLog = createMockLogger();
    payload = Buffer.from('{"id": "evt_test"}');
    signature = 'sig_test';

    MockStripeProvider.mockImplementation(function (this: typeof mockProviderInstance) {
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
        handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog),
      ).rejects.toMatchObject({
        name: 'WebhookSignatureError',
      });
    });

    it('should proceed when signature is valid', async () => {
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue({
        id: 'mapping_123',
        userId: 'user_123',
        provider: 'stripe',
        providerCustomerId: 'cus_test_123',
        createdAt: new Date(),
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue({
        id: 'plan_test_123',
        name: 'Test Plan',
        description: 'Test',
        stripePriceId: 'price_test',
        stripeProductId: 'prod_test',
        paypalPlanId: null,
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

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
    });
  });

  describe('idempotency', () => {
    it('should throw WebhookEventAlreadyProcessedError when event already processed', async () => {
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(true);

      await expect(
        handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog),
      ).rejects.toMatchObject({
        name: 'WebhookEventAlreadyProcessedError',
      });

      expect(mockRepos.billingEvents.wasProcessed).toHaveBeenCalledWith('stripe', 'evt_test_123');
    });

    it('should process new event and record it', async () => {
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue({
        id: 'mapping_123',
        userId: 'user_123',
        provider: 'stripe',
        providerCustomerId: 'cus_test_123',
        createdAt: new Date(),
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue({
        id: 'plan_test_123',
        name: 'Test',
        description: 'Test',
        stripePriceId: 'price_test',
        stripeProductId: 'prod_test',
        paypalPlanId: null,
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

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.billingEvents.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'stripe',
          providerEventId: 'evt_test_123',
          eventType: 'subscription.created',
        }),
      );
    });
  });

  describe('subscription.created event', () => {
    it('should create subscription with valid data', async () => {
      const event = createNormalizedEvent({
        type: 'subscription.created',
        data: {
          subscriptionId: 'sub_test_123',
          customerId: 'cus_test_123',
          status: 'active',
          metadata: { planId: 'plan_test_123' },
          raw: {
            current_period_start: 1640000000,
            current_period_end: 1642000000,
            trial_end: 1641000000,
          },
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue({
        id: 'mapping_123',
        userId: 'user_123',
        provider: 'stripe',
        providerCustomerId: 'cus_test_123',
        createdAt: new Date(),
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue({
        id: 'plan_test_123',
        name: 'Test',
        description: 'Test',
        stripePriceId: 'price_test',
        stripeProductId: 'prod_test',
        paypalPlanId: null,
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

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          planId: 'plan_test_123',
          provider: 'stripe',
          providerSubscriptionId: 'sub_test_123',
          status: 'active',
        }),
      );
    });

    it('should skip subscription creation when subscriptionId is missing', async () => {
      const event = createNormalizedEvent({
        type: 'subscription.created',
        data: {
          customerId: 'cus_test_123',
          status: 'active',
          metadata: { planId: 'plan_test_123' },
          raw: {},
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.create).not.toHaveBeenCalled();
    });

    it('should skip subscription creation when customer mapping not found', async () => {
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue(null);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.create).not.toHaveBeenCalled();
    });
  });

  describe('subscription.updated event', () => {
    it('should update subscription with valid data', async () => {
      const event = createNormalizedEvent({
        type: 'subscription.updated',
        data: {
          subscriptionId: 'sub_test_123',
          status: 'past_due',
          raw: {
            current_period_start: 1640000000,
            current_period_end: 1642000000,
            cancel_at_period_end: true,
          },
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.subscriptions.findByProviderSubscriptionId).mockResolvedValue({
        id: 'sub_db_123',
        userId: 'user_123',
        planId: 'plan_123',
        provider: 'stripe',
        providerSubscriptionId: 'sub_test_123',
        providerCustomerId: 'cus_test_123',
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

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.update).toHaveBeenCalledWith(
        'sub_db_123',
        expect.objectContaining({
          status: 'past_due',
          cancelAtPeriodEnd: true,
        }),
      );
    });

    it('should skip update when subscription not found', async () => {
      const event = createNormalizedEvent({
        type: 'subscription.updated',
        data: {
          subscriptionId: 'sub_test_123',
          status: 'active',
          raw: {},
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(null);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.update).not.toHaveBeenCalled();
    });
  });

  describe('subscription.canceled event', () => {
    it('should cancel subscription', async () => {
      const event = createNormalizedEvent({
        type: 'subscription.canceled',
        data: {
          subscriptionId: 'sub_test_123',
          raw: {},
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.subscriptions.findByProviderSubscriptionId).mockResolvedValue({
        id: 'sub_db_123',
        userId: 'user_123',
        planId: 'plan_123',
        provider: 'stripe',
        providerSubscriptionId: 'sub_test_123',
        providerCustomerId: 'cus_test_123',
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

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

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
          invoiceId: 'in_test_123',
          customerId: 'cus_test_123',
          subscriptionId: 'sub_test_123',
          raw: {
            amount_due: 1000,
            amount_paid: 1000,
            currency: 'usd',
            period_start: 1640000000,
            period_end: 1642000000,
          },
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue({
        id: 'mapping_123',
        userId: 'user_123',
        provider: 'stripe',
        providerCustomerId: 'cus_test_123',
        createdAt: new Date(),
      });
      vi.mocked(mockRepos.subscriptions.findByProviderSubscriptionId).mockResolvedValue({
        id: 'sub_db_123',
        userId: 'user_123',
        planId: 'plan_123',
        provider: 'stripe',
        providerSubscriptionId: 'sub_test_123',
        providerCustomerId: 'cus_test_123',
        status: 'past_due',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.invoices.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          provider: 'stripe',
          providerInvoiceId: 'in_test_123',
          status: 'paid',
        }),
      );
    });
  });

  describe('invoice.payment_failed event', () => {
    it('should mark subscription as past_due', async () => {
      const event = createNormalizedEvent({
        type: 'invoice.payment_failed',
        data: {
          subscriptionId: 'sub_test_123',
          raw: {},
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.subscriptions.findByProviderSubscriptionId).mockResolvedValue({
        id: 'sub_db_123',
        userId: 'user_123',
        planId: 'plan_123',
        provider: 'stripe',
        providerSubscriptionId: 'sub_test_123',
        providerCustomerId: 'cus_test_123',
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

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

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
          customerId: 'cus_test_123',
          raw: {},
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockLog.info).toHaveBeenCalledWith(
        { eventId: 'evt_test_123', customerId: 'cus_test_123' },
        'Refund created',
      );
    });

    it('should log chargeback event with warning', async () => {
      const event = createNormalizedEvent({
        type: 'chargeback.created',
        data: {
          customerId: 'cus_test_123',
          raw: {},
        },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockLog.warn).toHaveBeenCalledWith(
        { eventId: 'evt_test_123', customerId: 'cus_test_123' },
        'Chargeback/dispute created',
      );
    });
  });

  describe('unknown event type', () => {
    it('should log info for unhandled event types', async () => {
      const event = createNormalizedEvent({
        type: 'unknown',
        data: { raw: {} },
      });

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockLog.info).toHaveBeenCalledWith({ eventType: 'unknown' }, 'Unhandled event type');
    });
  });

  describe('error handling', () => {
    it('should execute processing logic within a database transaction', async () => {
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue({
        userId: 'user_1',
      } as any);
      vi.mocked(mockRepos.plans.findById).mockResolvedValue({ id: 'plan_1' } as any);

      await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(mockRepos.db.transaction).toHaveBeenCalled();
    });

    it('should log error and throw when event processing fails', async () => {
      const event = createNormalizedEvent();
      const error = new Error('Database error');

      mockProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockRejectedValue(error);

      await expect(
        handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog),
      ).rejects.toThrow('Database error');

      expect(mockLog.error).toHaveBeenCalledWith(
        { error, eventId: event.id, eventType: event.type },
        'Error processing webhook event',
      );
      expect(mockRepos.billingEvents.recordEvent).not.toHaveBeenCalled();
    });
  });

  describe('result format', () => {
    it('should return success result with event details', async () => {
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue({
        id: 'mapping_123',
        userId: 'user_123',
        provider: 'stripe',
        providerCustomerId: 'cus_test_123',
        createdAt: new Date(),
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue({
        id: 'plan_test_123',
        name: 'Test',
        description: 'Test',
        stripePriceId: 'price_test',
        stripeProductId: 'prod_test',
        paypalPlanId: null,
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

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result).toEqual({
        success: true,
        message: 'Processed subscription.created event',
        eventId: 'evt_test_123',
      });
    });
  });
});
