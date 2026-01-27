/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/modules/billing/webhooks/stripe-webhook.test.ts
/**
 * Stripe Webhook Handler Tests
 *
 * Comprehensive unit tests for Stripe webhook event processing including
 * signature verification, event handling, idempotency, and error scenarios.
 *
 * @complexity O(1) per test - all mocked operations
 */

import { WebhookEventAlreadyProcessedError, WebhookSignatureError } from '@abe-stack/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleStripeWebhook,
  type WebhookRepositories,
  type WebhookResult,
} from './stripe-webhook';

import type { StripeProviderConfig as StripeConfig } from '@abe-stack/core';
import type {
  BillingEventRepository,
  CustomerMappingRepository,
  InvoiceRepository,
  PlanRepository,
  SubscriptionRepository,
} from '@abe-stack/db';
import type { NormalizedWebhookEvent } from '@infrastructure/billing';
import type { FastifyBaseLogger } from 'fastify';



// ============================================================================
// Mock Dependencies
// ============================================================================

const mockStripeProviderInstance = {
  verifyWebhookSignature: vi.fn(),
  parseWebhookEvent: vi.fn(),
};

vi.mock('@infrastructure/billing', () => ({
  StripeProvider: vi.fn(function () {
    return mockStripeProviderInstance;
  }),
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create mock Stripe configuration
 */
function createMockStripeConfig(): StripeConfig {
  return {
    secretKey: 'sk_test_mock',
    webhookSecret: 'whsec_test_mock',
    publishableKey: 'pk_test_mock',
  };
}

/**
 * Create mock repositories
 */
function createMockRepositories(): WebhookRepositories {
  return {
    billingEvents: {
      wasProcessed: vi.fn(),
      recordEvent: vi.fn(),
    } as unknown as BillingEventRepository,
    subscriptions: {
      create: vi.fn(),
      update: vi.fn(),
      findByProviderSubscriptionId: vi.fn(),
    } as unknown as SubscriptionRepository,
    invoices: {
      upsert: vi.fn(),
    } as unknown as InvoiceRepository,
    plans: {
      findById: vi.fn(),
    } as unknown as PlanRepository,
    customerMappings: {
      findByProviderCustomerId: vi.fn(),
    } as unknown as CustomerMappingRepository,
  };
}

/**
 * Create mock logger
 */
function createMockLogger(): FastifyBaseLogger {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => createMockLogger()),
  } as unknown as FastifyBaseLogger;
}

/**
 * Create normalized webhook event
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
  let mockLog: FastifyBaseLogger;
  let payload: Buffer;
  let signature: string;

  beforeEach(() => {
    mockConfig = createMockStripeConfig();
    mockRepos = createMockRepositories();
    mockLog = createMockLogger();
    payload = Buffer.from('{"id": "evt_test"}');
    signature = 'sig_test';

    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock provider methods to default behavior
    mockStripeProviderInstance.verifyWebhookSignature.mockReturnValue(true);
    mockStripeProviderInstance.parseWebhookEvent.mockReturnValue(createNormalizedEvent());
  });

  describe('signature verification', () => {
    it('should throw WebhookSignatureError when signature is invalid', async () => {
      mockStripeProviderInstance.verifyWebhookSignature = vi.fn().mockReturnValue(false);

      await expect(
        handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog),
      ).rejects.toThrow(WebhookSignatureError);

      expect(mockStripeProviderInstance.verifyWebhookSignature).toHaveBeenCalledWith(payload, signature);
    });

    it('should proceed when signature is valid', async () => {
      const event = createNormalizedEvent();
      mockStripeProviderInstance.verifyWebhookSignature = vi.fn().mockReturnValue(true);
      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
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
      expect(mockStripeProviderInstance.verifyWebhookSignature).toHaveBeenCalledWith(payload, signature);
    });
  });

  describe('idempotency', () => {
    it('should throw WebhookEventAlreadyProcessedError when event already processed', async () => {
      const event = createNormalizedEvent();
      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(true);

      await expect(
        handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog),
      ).rejects.toThrow(WebhookEventAlreadyProcessedError);

      expect(mockRepos.billingEvents.wasProcessed).toHaveBeenCalledWith('stripe', event.id);
      expect(mockLog.info).toHaveBeenCalledWith(
        { eventId: event.id },
        'Webhook event already processed, skipping',
      );
    });

    it('should process new event and record it', async () => {
      const event = createNormalizedEvent();
      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
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
      expect(mockRepos.billingEvents.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'stripe',
          providerEventId: event.id,
          eventType: 'subscription.created',
          payload: event.data.raw,
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

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
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
      expect(mockRepos.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          planId: 'plan_test_123',
          provider: 'stripe',
          providerSubscriptionId: 'sub_test_123',
          providerCustomerId: 'cus_test_123',
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

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.create).not.toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith(
        { event },
        'Missing subscription or customer ID in subscription.created event',
      );
    });

    it('should skip subscription creation when customer mapping not found', async () => {
      const event = createNormalizedEvent();
      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue(null);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.create).not.toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith(
        { customerId: 'cus_test_123' },
        'No customer mapping found for Stripe customer',
      );
    });

    it('should skip subscription creation when plan not found', async () => {
      const event = createNormalizedEvent();
      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue({
        id: 'mapping_123',
        userId: 'user_123',
        provider: 'stripe',
        providerCustomerId: 'cus_test_123',
        createdAt: new Date(),
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(null);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.create).not.toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith({ planId: 'plan_test_123' }, 'Plan not found');
    });

    it('should skip subscription creation when planId is missing from metadata', async () => {
      const event = createNormalizedEvent({
        data: {
          subscriptionId: 'sub_test_123',
          customerId: 'cus_test_123',
          status: 'active',
          metadata: {},
          raw: {},
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue({
        id: 'mapping_123',
        userId: 'user_123',
        provider: 'stripe',
        providerCustomerId: 'cus_test_123',
        createdAt: new Date(),
      });

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.create).not.toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith(
        { event },
        'No planId in subscription metadata',
      );
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
            canceled_at: 1641500000,
            trial_end: null,
          },
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
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

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(null);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.update).not.toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith(
        { subscriptionId: 'sub_test_123' },
        'Subscription not found',
      );
    });

    it('should skip update when subscriptionId is missing', async () => {
      const event = createNormalizedEvent({
        type: 'subscription.updated',
        data: {
          subscriptionId: '',
          status: 'active',
          raw: {},
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.update).not.toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith(
        { event },
        'Missing subscription ID in subscription.updated event',
      );
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

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
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

    it('should skip cancel when subscription not found', async () => {
      const event = createNormalizedEvent({
        type: 'subscription.canceled',
        data: {
          subscriptionId: 'sub_test_123',
          raw: {},
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(null);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.update).not.toHaveBeenCalled();
    });
  });

  describe('invoice.paid event', () => {
    it('should record paid invoice and update subscription status', async () => {
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
            invoice_pdf: 'https://stripe.com/invoice.pdf',
          },
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
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
          subscriptionId: 'sub_db_123',
          provider: 'stripe',
          providerInvoiceId: 'in_test_123',
          status: 'paid',
          amountDue: 1000,
          amountPaid: 1000,
          currency: 'usd',
        }),
      );
      expect(mockRepos.subscriptions.update).toHaveBeenCalledWith('sub_db_123', {
        status: 'active',
      });
    });

    it('should record invoice without subscription ID', async () => {
      const event = createNormalizedEvent({
        type: 'invoice.paid',
        data: {
          invoiceId: 'in_test_123',
          customerId: 'cus_test_123',
          raw: {
            amount_due: 1000,
            amount_paid: 1000,
            currency: 'usd',
            period_start: 1640000000,
            period_end: 1642000000,
            invoice_pdf: null,
          },
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue({
        id: 'mapping_123',
        userId: 'user_123',
        provider: 'stripe',
        providerCustomerId: 'cus_test_123',
        createdAt: new Date(),
      });

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.invoices.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          subscriptionId: null,
          provider: 'stripe',
          providerInvoiceId: 'in_test_123',
        }),
      );
      expect(mockRepos.subscriptions.update).not.toHaveBeenCalled();
    });

    it('should skip invoice when customer mapping not found', async () => {
      const event = createNormalizedEvent({
        type: 'invoice.paid',
        data: {
          invoiceId: 'in_test_123',
          customerId: 'cus_test_123',
          raw: {},
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue(null);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.invoices.upsert).not.toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith(
        { customerId: 'cus_test_123' },
        'No customer mapping found for Stripe customer',
      );
    });

    it('should skip invoice when invoiceId is missing', async () => {
      const event = createNormalizedEvent({
        type: 'invoice.paid',
        data: {
          invoiceId: '',
          customerId: 'cus_test_123',
          raw: {},
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.invoices.upsert).not.toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith(
        { event },
        'Missing invoice or customer ID in invoice.paid event',
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

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
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

    it('should skip when subscription not found', async () => {
      const event = createNormalizedEvent({
        type: 'invoice.payment_failed',
        data: {
          subscriptionId: 'sub_test_123',
          raw: {},
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(null);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.update).not.toHaveBeenCalled();
    });
  });

  describe('refund.created event', () => {
    it('should log refund event', async () => {
      const event = createNormalizedEvent({
        type: 'refund.created',
        data: {
          customerId: 'cus_test_123',
          raw: {},
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockLog.info).toHaveBeenCalledWith(
        { eventId: event.id, customerId: 'cus_test_123' },
        'Refund created',
      );
    });
  });

  describe('chargeback.created event', () => {
    it('should log chargeback event with warning', async () => {
      const event = createNormalizedEvent({
        type: 'chargeback.created',
        data: {
          customerId: 'cus_test_123',
          raw: {},
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockLog.warn).toHaveBeenCalledWith(
        { eventId: event.id, customerId: 'cus_test_123' },
        'Chargeback/dispute created',
      );
    });
  });

  describe('unknown event type', () => {
    it('should log info for unhandled event types', async () => {
      const event = createNormalizedEvent({
        type: 'unknown',
        data: {
          raw: {},
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockLog.info).toHaveBeenCalledWith({ eventType: 'unknown' }, 'Unhandled event type');
    });
  });

  describe('error handling', () => {
    it('should log error and throw when event processing fails', async () => {
      const event = createNormalizedEvent();
      const error = new Error('Database error');

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
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

    it('should not record event when processing fails', async () => {
      const event = createNormalizedEvent();
      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockRejectedValue(
        new Error('Test error'),
      );

      await expect(
        handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog),
      ).rejects.toThrow();

      expect(mockRepos.billingEvents.recordEvent).not.toHaveBeenCalled();
    });
  });

  describe('result format', () => {
    it('should return success result with event details', async () => {
      const event = createNormalizedEvent();
      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
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

      const result: WebhookResult = await handleStripeWebhook(
        payload,
        signature,
        mockConfig,
        mockRepos,
        mockLog,
      );

      expect(result).toEqual({
        success: true,
        message: 'Processed subscription.created event',
        eventId: 'evt_test_123',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty customerId', async () => {
      const event = createNormalizedEvent({
        data: {
          subscriptionId: 'sub_test_123',
          customerId: '',
          status: 'active',
          metadata: { planId: 'plan_test_123' },
          raw: {},
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.create).not.toHaveBeenCalled();
    });

    it('should handle missing raw data fields gracefully', async () => {
      const event = createNormalizedEvent({
        type: 'subscription.created',
        data: {
          subscriptionId: 'sub_test_123',
          customerId: 'cus_test_123',
          status: 'active',
          metadata: { planId: 'plan_test_123' },
          raw: {},
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
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
      expect(mockRepos.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPeriodStart: new Date(0),
          currentPeriodEnd: new Date(0),
          trialEnd: null,
        }),
      );
    });

    it('should handle non-string metadata planId', async () => {
      const event = createNormalizedEvent({
        data: {
          subscriptionId: 'sub_test_123',
          customerId: 'cus_test_123',
          status: 'active',
          metadata: { planId: 123 as unknown as string },
          raw: {},
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
      vi.mocked(mockRepos.billingEvents.wasProcessed).mockResolvedValue(false);
      vi.mocked(mockRepos.customerMappings.findByProviderCustomerId).mockResolvedValue({
        id: 'mapping_123',
        userId: 'user_123',
        provider: 'stripe',
        providerCustomerId: 'cus_test_123',
        createdAt: new Date(),
      });

      const result = await handleStripeWebhook(payload, signature, mockConfig, mockRepos, mockLog);

      expect(result.success).toBe(true);
      expect(mockRepos.subscriptions.create).not.toHaveBeenCalled();
      expect(mockLog.warn).toHaveBeenCalledWith(
        { event },
        'No planId in subscription metadata',
      );
    });

    it('should not update subscription status when subscription is not past_due', async () => {
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
            invoice_pdf: null,
          },
        },
      });

      mockStripeProviderInstance.parseWebhookEvent = vi.fn().mockReturnValue(event);
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
      expect(mockRepos.invoices.upsert).toHaveBeenCalled();
      expect(mockRepos.subscriptions.update).not.toHaveBeenCalled();
    });
  });
});
