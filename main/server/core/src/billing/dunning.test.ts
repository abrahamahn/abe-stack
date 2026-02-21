// main/server/core/src/billing/dunning.test.ts
/**
 * Dunning / Failed Payment Service Tests
 *
 * Validates payment failure handling, success recovery, grace period
 * calculations, and batch grace period expiry processing.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DUNNING_GRACE_PERIOD_DAYS,
  getGracePeriodStatus,
  handlePaymentFailure,
  handlePaymentSuccess,
  processGracePeriodExpiry,
} from './dunning';

import type { BillingRepositories } from './types';
import type { Subscription } from '../../../db/src';
import type { BillingService } from '@bslt/shared';

// ============================================================================
// Constants
// ============================================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ============================================================================
// Mock Helpers
// ============================================================================

function createMockRepos(): BillingRepositories {
  return {
    plans: {
      findById: vi.fn(),
      listActive: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    },
    subscriptions: {
      findActiveByUserId: vi.fn(),
      findById: vi.fn(),
      findByProviderSubscriptionId: vi.fn(),
      findPastDue: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    },
    customerMappings: {
      getOrCreate: vi.fn(),
      findByUserIdAndProvider: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoices: {
      findByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    paymentMethods: {
      findByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      setAsDefault: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as BillingRepositories;
}

function createMockProvider(): BillingService {
  return {
    provider: 'stripe',
    createCustomer: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    getSubscription: vi.fn(),
    createSetupIntent: vi.fn(),
    attachPaymentMethod: vi.fn(),
    detachPaymentMethod: vi.fn(),
    listPaymentMethods: vi.fn(),
    setDefaultPaymentMethod: vi.fn(),
    verifyWebhookSignature: vi.fn(),
    parseWebhookEvent: vi.fn(),
  } as unknown as BillingService;
}

function createMockSubscription(overrides?: Partial<Subscription>): Subscription {
  return {
    id: 'sub-1',
    userId: 'user-1',
    planId: 'plan-1',
    provider: 'stripe',
    providerSubscriptionId: 'sub_stripe_123',
    providerCustomerId: 'cus_stripe_123',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * MS_PER_DAY),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    trialEnd: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Subscription;
}

// ============================================================================
// getGracePeriodStatus
// ============================================================================

describe('getGracePeriodStatus', () => {
  it('should report not in grace period for active subscription', () => {
    const subscription = createMockSubscription({ status: 'active' });

    const status = getGracePeriodStatus(subscription);

    expect(status.inGracePeriod).toBe(false);
    expect(status.daysRemaining).toBe(0);
    expect(status.expiresAt).toBeNull();
    expect(status.expired).toBe(false);
  });

  it('should report in grace period for recent past_due subscription', () => {
    const now = new Date('2026-02-15T12:00:00Z');
    const subscription = createMockSubscription({
      status: 'past_due',
      updatedAt: new Date('2026-02-10T12:00:00Z'), // 5 days ago
    });

    const status = getGracePeriodStatus(subscription, DUNNING_GRACE_PERIOD_DAYS, now);

    expect(status.inGracePeriod).toBe(true);
    expect(status.daysRemaining).toBe(9); // 14 - 5 = 9
    expect(status.expiresAt).toEqual(new Date('2026-02-24T12:00:00Z'));
    expect(status.expired).toBe(false);
  });

  it('should report expired when past grace period', () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const subscription = createMockSubscription({
      status: 'past_due',
      updatedAt: new Date('2026-02-10T12:00:00Z'), // 19 days ago (> 14 day grace)
    });

    const status = getGracePeriodStatus(subscription, DUNNING_GRACE_PERIOD_DAYS, now);

    expect(status.inGracePeriod).toBe(false);
    expect(status.daysRemaining).toBe(0);
    expect(status.expired).toBe(true);
  });

  it('should report expired when exactly at grace period boundary', () => {
    const subscription = createMockSubscription({
      status: 'past_due',
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    });
    const exactExpiry = new Date('2026-02-15T00:00:00Z'); // Exactly 14 days later

    const status = getGracePeriodStatus(subscription, 14, exactExpiry);

    expect(status.inGracePeriod).toBe(false);
    expect(status.expired).toBe(true);
  });

  it('should use custom grace period days', () => {
    const now = new Date('2026-02-15T12:00:00Z');
    const subscription = createMockSubscription({
      status: 'past_due',
      updatedAt: new Date('2026-02-10T12:00:00Z'), // 5 days ago
    });

    // 7-day grace period -> 2 days remaining
    const status = getGracePeriodStatus(subscription, 7, now);

    expect(status.inGracePeriod).toBe(true);
    expect(status.daysRemaining).toBe(2);
  });

  it('should report not in grace period for canceled subscription', () => {
    const subscription = createMockSubscription({ status: 'canceled' });

    const status = getGracePeriodStatus(subscription);

    expect(status.inGracePeriod).toBe(false);
    expect(status.expired).toBe(false);
  });

  it('should floor partial days remaining', () => {
    const now = new Date('2026-02-15T18:00:00Z'); // 5.25 days past
    const subscription = createMockSubscription({
      status: 'past_due',
      updatedAt: new Date('2026-02-10T12:00:00Z'),
    });

    const status = getGracePeriodStatus(subscription, 14, now);

    // 14 - 5.25 = 8.75, floored to 8
    expect(status.daysRemaining).toBe(8);
  });

  it('should default grace period to 14 days', () => {
    expect(DUNNING_GRACE_PERIOD_DAYS).toBe(14);
  });
});

// ============================================================================
// handlePaymentFailure
// ============================================================================

describe('handlePaymentFailure', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should transition active subscription to past_due', async () => {
    const subscription = createMockSubscription({ status: 'active' });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'past_due' }),
    );

    const result = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.previousStatus).toBe('active');
    expect(result.newStatus).toBe('past_due');
    expect(repos.subscriptions.update).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({
        status: 'past_due',
        metadata: expect.objectContaining({
          dunningStartedAt: expect.any(String),
          lastPaymentFailureAt: expect.any(String),
        }),
      }),
    );
  });

  it('should transition trialing subscription to past_due on trial end failure', async () => {
    const subscription = createMockSubscription({ status: 'trialing' });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'past_due' }),
    );

    const result = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.previousStatus).toBe('trialing');
    expect(result.newStatus).toBe('past_due');
  });

  it('should handle already past_due subscription idempotently', async () => {
    const subscription = createMockSubscription({ status: 'past_due' });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);

    const result = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.previousStatus).toBe('past_due');
    expect(result.newStatus).toBe('past_due');
    expect(repos.subscriptions.update).not.toHaveBeenCalled();
  });

  it('should return not processed for unknown subscription', async () => {
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(null);

    const result = await handlePaymentFailure(repos, 'sub_unknown', 'stripe');

    expect(result.processed).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('should return not processed for invalid state transition', async () => {
    const subscription = createMockSubscription({ status: 'canceled' });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);

    const result = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(false);
    expect(result.message).toContain('Invalid transition');
  });

  it('should preserve existing metadata when adding dunning fields', async () => {
    const subscription = createMockSubscription({
      status: 'active',
      metadata: { existingKey: 'existingValue' },
    });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'past_due' }),
    );

    await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');

    expect(repos.subscriptions.update).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({
        metadata: expect.objectContaining({
          existingKey: 'existingValue',
          dunningStartedAt: expect.any(String),
        }),
      }),
    );
  });
});

// ============================================================================
// handlePaymentSuccess
// ============================================================================

describe('handlePaymentSuccess', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should transition past_due subscription to active', async () => {
    const subscription = createMockSubscription({
      status: 'past_due',
      metadata: {
        dunningStartedAt: '2026-02-01T00:00:00Z',
        lastPaymentFailureAt: '2026-02-01T00:00:00Z',
      },
    });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'active' }),
    );

    const result = await handlePaymentSuccess(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.previousStatus).toBe('past_due');
    expect(result.newStatus).toBe('active');
    expect(repos.subscriptions.update).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({
        status: 'active',
      }),
    );
  });

  it('should clear dunning metadata on successful payment', async () => {
    const subscription = createMockSubscription({
      status: 'past_due',
      metadata: {
        dunningStartedAt: '2026-02-01T00:00:00Z',
        lastPaymentFailureAt: '2026-02-01T00:00:00Z',
        otherKey: 'otherValue',
      },
    });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'active' }),
    );

    await handlePaymentSuccess(repos, 'sub_stripe_123', 'stripe');

    const updateCall = vi.mocked(repos.subscriptions.update).mock.calls[0];
    const updatedMetadata = (updateCall?.[1] as { metadata: Record<string, unknown> }).metadata;

    expect(updatedMetadata).not.toHaveProperty('dunningStartedAt');
    expect(updatedMetadata).not.toHaveProperty('lastPaymentFailureAt');
    expect(updatedMetadata).toHaveProperty('otherKey', 'otherValue');
  });

  it('should handle already active subscription idempotently', async () => {
    const subscription = createMockSubscription({ status: 'active' });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);

    const result = await handlePaymentSuccess(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.previousStatus).toBe('active');
    expect(result.newStatus).toBe('active');
    expect(repos.subscriptions.update).not.toHaveBeenCalled();
  });

  it('should return not processed for unknown subscription', async () => {
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(null);

    const result = await handlePaymentSuccess(repos, 'sub_unknown', 'stripe');

    expect(result.processed).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('should return not processed for invalid state transition', async () => {
    const subscription = createMockSubscription({ status: 'canceled' });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);

    const result = await handlePaymentSuccess(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(false);
    expect(result.message).toContain('Invalid transition');
  });

  it('should transition trialing to active on payment success', async () => {
    const subscription = createMockSubscription({ status: 'trialing' });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'active' }),
    );

    const result = await handlePaymentSuccess(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.newStatus).toBe('active');
  });
});

// ============================================================================
// processGracePeriodExpiry
// ============================================================================

describe('processGracePeriodExpiry', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
    provider = createMockProvider();
  });

  it('should cancel subscriptions that have exceeded the grace period', async () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const expiredSub = createMockSubscription({
      id: 'sub-expired',
      status: 'past_due',
      updatedAt: new Date('2026-02-01T12:00:00Z'), // 28 days ago > 14 day grace
    });

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([expiredSub]);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'canceled' }),
    );

    const result = await processGracePeriodExpiry(repos, provider, 14, now);

    expect(result.checked).toBe(1);
    expect(result.canceled).toBe(1);
    expect(result.stillInGracePeriod).toBe(0);
    expect(result.canceledIds).toContain('sub-expired');
    expect(provider.cancelSubscription).toHaveBeenCalledWith('sub_stripe_123', true);
    expect(repos.subscriptions.update).toHaveBeenCalledWith(
      'sub-expired',
      expect.objectContaining({
        status: 'canceled',
        canceledAt: now,
        metadata: expect.objectContaining({
          cancelReason: 'grace_period_expired',
          canceledByDunning: true,
        }),
      }),
    );
  });

  it('should not cancel subscriptions still within grace period', async () => {
    const now = new Date('2026-02-15T12:00:00Z');
    const recentSub = createMockSubscription({
      id: 'sub-recent',
      status: 'past_due',
      updatedAt: new Date('2026-02-10T12:00:00Z'), // 5 days ago < 14 day grace
    });

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([recentSub]);

    const result = await processGracePeriodExpiry(repos, provider, 14, now);

    expect(result.checked).toBe(1);
    expect(result.canceled).toBe(0);
    expect(result.stillInGracePeriod).toBe(1);
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
    expect(repos.subscriptions.update).not.toHaveBeenCalled();
  });

  it('should handle mixed expired and active grace periods', async () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const expiredSub = createMockSubscription({
      id: 'sub-expired',
      status: 'past_due',
      updatedAt: new Date('2026-02-01T12:00:00Z'), // 28 days ago
    });
    const recentSub = createMockSubscription({
      id: 'sub-recent',
      status: 'past_due',
      providerSubscriptionId: 'sub_stripe_456',
      updatedAt: new Date('2026-02-20T12:00:00Z'), // 9 days ago
    });

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([expiredSub, recentSub]);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'canceled' }),
    );

    const result = await processGracePeriodExpiry(repos, provider, 14, now);

    expect(result.checked).toBe(2);
    expect(result.canceled).toBe(1);
    expect(result.stillInGracePeriod).toBe(1);
    expect(result.canceledIds).toEqual(['sub-expired']);
  });

  it('should handle empty past_due list', async () => {
    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([]);

    const result = await processGracePeriodExpiry(repos, provider);

    expect(result.checked).toBe(0);
    expect(result.canceled).toBe(0);
    expect(result.stillInGracePeriod).toBe(0);
    expect(result.canceledIds).toEqual([]);
  });

  it('should proceed with local cancellation even if provider cancellation fails', async () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const expiredSub = createMockSubscription({
      id: 'sub-expired',
      status: 'past_due',
      updatedAt: new Date('2026-02-01T12:00:00Z'),
    });

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([expiredSub]);
    vi.mocked(provider.cancelSubscription).mockRejectedValue(new Error('Provider error'));
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'canceled' }),
    );

    const result = await processGracePeriodExpiry(repos, provider, 14, now);

    expect(result.canceled).toBe(1);
    expect(repos.subscriptions.update).toHaveBeenCalledWith(
      'sub-expired',
      expect.objectContaining({ status: 'canceled' }),
    );
  });

  it('should use custom grace period days', async () => {
    const now = new Date('2026-02-15T12:00:00Z');
    const subscription = createMockSubscription({
      id: 'sub-1',
      status: 'past_due',
      updatedAt: new Date('2026-02-10T12:00:00Z'), // 5 days ago
    });

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([subscription]);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'canceled' }),
    );

    // 3-day grace period -> 5 days past = expired
    const result = await processGracePeriodExpiry(repos, provider, 3, now);

    expect(result.canceled).toBe(1);
  });
});

// ============================================================================
// Dunning Retry Schedule
// ============================================================================

describe('dunning retry schedule', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('first payment failure transitions active subscription to past_due', async () => {
    const subscription = createMockSubscription({ status: 'active' });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'past_due' }),
    );

    const result = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.previousStatus).toBe('active');
    expect(result.newStatus).toBe('past_due');
  });

  it('subsequent payment failures while already past_due are idempotent (no duplicate transitions)', async () => {
    const subscription = createMockSubscription({ status: 'past_due' });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);

    // Simulate multiple retry failures
    const result1 = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');
    const result2 = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');
    const result3 = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');

    // All should be processed successfully but no DB updates
    expect(result1.processed).toBe(true);
    expect(result2.processed).toBe(true);
    expect(result3.processed).toBe(true);
    expect(result1.newStatus).toBe('past_due');
    expect(result2.newStatus).toBe('past_due');
    expect(result3.newStatus).toBe('past_due');
    expect(repos.subscriptions.update).not.toHaveBeenCalled();
  });

  it('successful retry during grace period restores active status', async () => {
    const now = new Date('2026-02-15T12:00:00Z');
    const subscription = createMockSubscription({
      status: 'past_due',
      updatedAt: new Date('2026-02-10T12:00:00Z'), // 5 days into grace period
      metadata: {
        dunningStartedAt: '2026-02-10T12:00:00Z',
        lastPaymentFailureAt: '2026-02-10T12:00:00Z',
      },
    });

    // Verify grace period is active before retry
    const gracePeriod = getGracePeriodStatus(subscription, DUNNING_GRACE_PERIOD_DAYS, now);
    expect(gracePeriod.inGracePeriod).toBe(true);
    expect(gracePeriod.daysRemaining).toBe(9);

    // Now simulate successful retry payment
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'active' }),
    );

    const result = await handlePaymentSuccess(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.previousStatus).toBe('past_due');
    expect(result.newStatus).toBe('active');
  });

  it('full dunning cycle: active -> past_due (fail) -> active (retry success)', async () => {
    // Step 1: Payment fails
    const activeSub = createMockSubscription({ status: 'active' });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(activeSub);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'past_due' }),
    );

    const failResult = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');
    expect(failResult.processed).toBe(true);
    expect(failResult.newStatus).toBe('past_due');

    // Step 2: Retry succeeds during grace period
    const pastDueSub = createMockSubscription({
      status: 'past_due',
      metadata: {
        dunningStartedAt: new Date().toISOString(),
        lastPaymentFailureAt: new Date().toISOString(),
      },
    });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(pastDueSub);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'active', metadata: {} }),
    );

    const successResult = await handlePaymentSuccess(repos, 'sub_stripe_123', 'stripe');
    expect(successResult.processed).toBe(true);
    expect(successResult.previousStatus).toBe('past_due');
    expect(successResult.newStatus).toBe('active');
  });
});

// ============================================================================
// Suspension Threshold (Grace Period Expiry => Cancellation)
// ============================================================================

describe('suspension threshold', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
    provider = createMockProvider();
  });

  it('subscription is canceled (suspended) when grace period of 14 days is exceeded', async () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const subscription = createMockSubscription({
      id: 'sub-threshold',
      status: 'past_due',
      updatedAt: new Date('2026-02-01T12:00:00Z'), // 28 days ago, well past 14-day grace
    });

    // Confirm grace period is expired
    const gracePeriod = getGracePeriodStatus(subscription, DUNNING_GRACE_PERIOD_DAYS, now);
    expect(gracePeriod.expired).toBe(true);
    expect(gracePeriod.inGracePeriod).toBe(false);

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([subscription]);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'canceled' }),
    );

    const result = await processGracePeriodExpiry(repos, provider, DUNNING_GRACE_PERIOD_DAYS, now);

    expect(result.canceled).toBe(1);
    expect(result.canceledIds).toContain('sub-threshold');
    expect(repos.subscriptions.update).toHaveBeenCalledWith(
      'sub-threshold',
      expect.objectContaining({
        status: 'canceled',
        metadata: expect.objectContaining({
          cancelReason: 'grace_period_expired',
          canceledByDunning: true,
        }),
      }),
    );
  });

  it('subscription is NOT suspended when within the 14-day grace period', async () => {
    const now = new Date('2026-02-10T12:00:00Z');
    const subscription = createMockSubscription({
      id: 'sub-safe',
      status: 'past_due',
      updatedAt: new Date('2026-02-05T12:00:00Z'), // Only 5 days ago
    });

    // Confirm still in grace period
    const gracePeriod = getGracePeriodStatus(subscription, DUNNING_GRACE_PERIOD_DAYS, now);
    expect(gracePeriod.inGracePeriod).toBe(true);
    expect(gracePeriod.expired).toBe(false);
    expect(gracePeriod.daysRemaining).toBe(9);

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([subscription]);

    const result = await processGracePeriodExpiry(repos, provider, DUNNING_GRACE_PERIOD_DAYS, now);

    expect(result.canceled).toBe(0);
    expect(result.stillInGracePeriod).toBe(1);
    expect(repos.subscriptions.update).not.toHaveBeenCalled();
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
  });

  it('subscription at exact 14-day boundary is treated as expired', async () => {
    const subscription = createMockSubscription({
      id: 'sub-boundary',
      status: 'past_due',
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    });
    const exactBoundary = new Date('2026-02-15T00:00:00Z'); // Exactly 14 days

    const gracePeriod = getGracePeriodStatus(subscription, 14, exactBoundary);
    expect(gracePeriod.expired).toBe(true);

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([subscription]);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'canceled' }),
    );

    const result = await processGracePeriodExpiry(repos, provider, 14, exactBoundary);

    expect(result.canceled).toBe(1);
  });

  it('canceled subscription is removed from provider even if provider call fails', async () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const subscription = createMockSubscription({
      id: 'sub-provider-fail',
      status: 'past_due',
      updatedAt: new Date('2026-02-01T12:00:00Z'),
    });

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([subscription]);
    vi.mocked(provider.cancelSubscription).mockRejectedValue(new Error('Provider unavailable'));
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'canceled' }),
    );

    const result = await processGracePeriodExpiry(repos, provider, 14, now);

    // Even though provider failed, local cancellation should proceed
    expect(result.canceled).toBe(1);
    expect(repos.subscriptions.update).toHaveBeenCalledWith(
      'sub-provider-fail',
      expect.objectContaining({ status: 'canceled' }),
    );
  });

  it('multiple subscriptions: only those past threshold are suspended', async () => {
    const now = new Date('2026-03-01T12:00:00Z');

    const expiredSub1 = createMockSubscription({
      id: 'sub-expired-1',
      status: 'past_due',
      providerSubscriptionId: 'sub_stripe_1',
      updatedAt: new Date('2026-02-01T12:00:00Z'), // 28 days ago
    });
    const expiredSub2 = createMockSubscription({
      id: 'sub-expired-2',
      status: 'past_due',
      providerSubscriptionId: 'sub_stripe_2',
      updatedAt: new Date('2026-02-10T12:00:00Z'), // 19 days ago
    });
    const safeSub = createMockSubscription({
      id: 'sub-safe',
      status: 'past_due',
      providerSubscriptionId: 'sub_stripe_3',
      updatedAt: new Date('2026-02-25T12:00:00Z'), // 4 days ago
    });

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([
      expiredSub1,
      expiredSub2,
      safeSub,
    ]);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'canceled' }),
    );

    const result = await processGracePeriodExpiry(repos, provider, 14, now);

    expect(result.checked).toBe(3);
    expect(result.canceled).toBe(2);
    expect(result.stillInGracePeriod).toBe(1);
    expect(result.canceledIds).toEqual(['sub-expired-1', 'sub-expired-2']);
  });
});

// ============================================================================
// Adversarial: Boundary — Invoice / amount edge cases
// ============================================================================

describe('adversarial: boundary — amount and retry schedule edge cases', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('$0 amount subscription failure is still processed to past_due', async () => {
    const subscription = createMockSubscription({
      status: 'active',
      metadata: { amountDue: 0 },
    });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'past_due' }),
    );

    const result = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.newStatus).toBe('past_due');
  });

  it('subscription with negative amount metadata does not corrupt state', async () => {
    const subscription = createMockSubscription({
      status: 'active',
      metadata: { amountDue: -100 },
    });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'past_due' }),
    );

    const result = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.newStatus).toBe('past_due');
    // Negative amount metadata should be preserved, not lost
    expect(repos.subscriptions.update).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({
        metadata: expect.objectContaining({
          amountDue: -100,
        }),
      }),
    );
  });

  it('subscription with amount exceeding 64-bit float precision', async () => {
    const hugeAmount = Number.MAX_SAFE_INTEGER + 1;
    const subscription = createMockSubscription({
      status: 'active',
      metadata: { amountDue: hugeAmount },
    });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'past_due' }),
    );

    const result = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.newStatus).toBe('past_due');
  });

  it('grace period with 0 days means immediately expired', () => {
    const now = new Date('2026-02-15T12:00:00Z');
    const subscription = createMockSubscription({
      status: 'past_due',
      updatedAt: new Date('2026-02-15T12:00:00Z'), // Just now
    });

    const status = getGracePeriodStatus(subscription, 0, now);

    expect(status.inGracePeriod).toBe(false);
    expect(status.expired).toBe(true);
    expect(status.daysRemaining).toBe(0);
  });

  it('grace period with MAX_SAFE_INTEGER days overflows date arithmetic', () => {
    const now = new Date('2026-02-15T12:00:00Z');
    const subscription = createMockSubscription({
      status: 'past_due',
      updatedAt: new Date('2000-01-01T00:00:00Z'), // 26 years ago
    });

    const status = getGracePeriodStatus(subscription, Number.MAX_SAFE_INTEGER, now);

    // NOTE: MAX_SAFE_INTEGER * MS_PER_DAY overflows JavaScript's number precision,
    // producing an Invalid Date for expiresAt and NaN for daysRemaining.
    // This documents a boundary limitation: extremely large grace periods
    // produce undefined behavior due to floating-point overflow.
    expect(status.expired).toBe(false);
    expect(status.inGracePeriod).toBe(true);
    // daysRemaining is NaN due to overflow — this is a known limitation
    expect(Number.isNaN(status.daysRemaining)).toBe(true);
  });

  it('grace period with negative days means always expired', () => {
    const now = new Date('2026-02-15T12:00:00Z');
    const subscription = createMockSubscription({
      status: 'past_due',
      updatedAt: new Date('2026-02-15T12:00:00Z'),
    });

    const status = getGracePeriodStatus(subscription, -1, now);

    expect(status.inGracePeriod).toBe(false);
    expect(status.expired).toBe(true);
  });
});

// ============================================================================
// Adversarial: Layer — Payment provider returning ambiguous status
// ============================================================================

describe('adversarial: payment provider ambiguous responses', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
    provider = createMockProvider();
  });

  it('provider.cancelSubscription returns undefined (ambiguous) — local cancellation proceeds', async () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const subscription = createMockSubscription({
      id: 'sub-ambiguous',
      status: 'past_due',
      updatedAt: new Date('2026-02-01T12:00:00Z'),
    });

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([subscription]);
    vi.mocked(provider.cancelSubscription).mockResolvedValue(undefined as never);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'canceled' }),
    );

    const result = await processGracePeriodExpiry(repos, provider, 14, now);

    expect(result.canceled).toBe(1);
    expect(repos.subscriptions.update).toHaveBeenCalledWith(
      'sub-ambiguous',
      expect.objectContaining({ status: 'canceled' }),
    );
  });

  it('repos.subscriptions.update throws during cancellation — error propagates', async () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const subscription = createMockSubscription({
      id: 'sub-update-fail',
      status: 'past_due',
      updatedAt: new Date('2026-02-01T12:00:00Z'),
    });

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([subscription]);
    vi.mocked(repos.subscriptions.update).mockRejectedValue(new Error('SERIALIZATION_FAILURE'));

    // Should throw because the local update failure is not caught in processGracePeriodExpiry
    await expect(processGracePeriodExpiry(repos, provider, 14, now)).rejects.toThrow(
      'SERIALIZATION_FAILURE',
    );
  });

  it('repos.subscriptions.findPastDue throws — error propagates cleanly', async () => {
    vi.mocked(repos.subscriptions.findPastDue).mockRejectedValue(new Error('Connection refused'));

    await expect(processGracePeriodExpiry(repos, provider)).rejects.toThrow('Connection refused');
  });

  it('handlePaymentFailure with repos.subscriptions.update throwing preserves original status', async () => {
    const subscription = createMockSubscription({ status: 'active' });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockRejectedValue(new Error('DB write failed'));

    await expect(handlePaymentFailure(repos, 'sub_stripe_123', 'stripe')).rejects.toThrow(
      'DB write failed',
    );

    // The update was attempted once
    expect(repos.subscriptions.update).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Adversarial: Async — Concurrent dunning runs for same subscription
// ============================================================================

describe('adversarial: concurrent dunning runs', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('two concurrent handlePaymentFailure calls for same subscription produce consistent state', async () => {
    const subscription = createMockSubscription({ status: 'active' });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'past_due' }),
    );

    // Fire two failures concurrently
    const [result1, result2] = await Promise.all([
      handlePaymentFailure(repos, 'sub_stripe_123', 'stripe'),
      handlePaymentFailure(repos, 'sub_stripe_123', 'stripe'),
    ]);

    // Both should process (both see 'active' state since mock is shared)
    expect(result1.processed).toBe(true);
    expect(result2.processed).toBe(true);
    // Both should transition to past_due
    expect(result1.newStatus).toBe('past_due');
    expect(result2.newStatus).toBe('past_due');
    // Update called twice (no locking in mock, demonstrates need for DB-level locking)
    expect(repos.subscriptions.update).toHaveBeenCalledTimes(2);
  });

  it('concurrent handlePaymentSuccess and handlePaymentFailure for same subscription', async () => {
    const subscription = createMockSubscription({
      status: 'past_due',
      metadata: {
        dunningStartedAt: '2026-02-01T00:00:00Z',
        lastPaymentFailureAt: '2026-02-01T00:00:00Z',
      },
    });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'active' }),
    );

    const [failResult, successResult] = await Promise.all([
      handlePaymentFailure(repos, 'sub_stripe_123', 'stripe'),
      handlePaymentSuccess(repos, 'sub_stripe_123', 'stripe'),
    ]);

    // Failure sees past_due -> idempotent (no update)
    expect(failResult.processed).toBe(true);
    expect(failResult.previousStatus).toBe('past_due');
    expect(failResult.newStatus).toBe('past_due');

    // Success sees past_due -> transitions to active
    expect(successResult.processed).toBe(true);
    expect(successResult.previousStatus).toBe('past_due');
    expect(successResult.newStatus).toBe('active');

    // Only the success path should have called update (failure was idempotent)
    expect(repos.subscriptions.update).toHaveBeenCalledTimes(1);
  });

  it('concurrent processGracePeriodExpiry runs for overlapping subscriptions', async () => {
    const provider = createMockProvider();
    const now = new Date('2026-03-01T12:00:00Z');
    const expiredSub = createMockSubscription({
      id: 'sub-concurrent-expired',
      status: 'past_due',
      updatedAt: new Date('2026-02-01T12:00:00Z'),
    });

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([expiredSub]);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'canceled' }),
    );

    const [result1, result2] = await Promise.all([
      processGracePeriodExpiry(repos, provider, 14, now),
      processGracePeriodExpiry(repos, provider, 14, now),
    ]);

    // Both should process the same subscription (no dedup at this level)
    expect(result1.canceled).toBe(1);
    expect(result2.canceled).toBe(1);
    // Total update calls = 2 (demonstrates need for deduplication at caller level)
    expect(repos.subscriptions.update).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// Adversarial: "Killer" test — Subscription cancelled during active dunning
// ============================================================================

describe('adversarial: subscription cancelled during active dunning + webhook race', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
    provider = createMockProvider();
  });

  it('subscription cancelled by user while dunning retry is in progress', async () => {
    // Step 1: Subscription is past_due (dunning active)
    const pastDueSub = createMockSubscription({
      status: 'past_due',
      metadata: {
        dunningStartedAt: '2026-02-01T00:00:00Z',
        lastPaymentFailureAt: '2026-02-05T00:00:00Z',
      },
    });

    // Step 2: User cancels subscription (webhook changes status)
    const canceledSub = createMockSubscription({ status: 'canceled' });

    // First lookup returns past_due, second lookup returns canceled
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId)
      .mockResolvedValueOnce(pastDueSub)
      .mockResolvedValueOnce(canceledSub);

    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'active' }),
    );

    // Step 3: Payment success webhook arrives for the past_due subscription
    const successResult = await handlePaymentSuccess(repos, 'sub_stripe_123', 'stripe');

    // The first call sees past_due and tries to transition to active
    expect(successResult.processed).toBe(true);
    expect(successResult.newStatus).toBe('active');

    // Step 4: Another payment failure webhook arrives but subscription is now canceled
    const failResult = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');

    // The second call sees canceled — invalid transition
    expect(failResult.processed).toBe(false);
    expect(failResult.message).toContain('Invalid transition');
  });

  it('grace period expiry runs while subscription is being cancelled by webhook simultaneously', async () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const expiredSub = createMockSubscription({
      id: 'sub-race-cancel',
      status: 'past_due',
      updatedAt: new Date('2026-02-01T12:00:00Z'),
    });

    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([expiredSub]);

    // Provider cancellation succeeds
    vi.mocked(provider.cancelSubscription).mockResolvedValue(undefined as never);

    // But the local update throws because the row was already modified by the webhook
    vi.mocked(repos.subscriptions.update).mockRejectedValueOnce(
      new Error('CONFLICT: row was modified by another transaction'),
    );

    await expect(processGracePeriodExpiry(repos, provider, 14, now)).rejects.toThrow('CONFLICT');

    // Provider was still called — this is the race condition: provider is cancelled
    // but local DB update failed, leaving inconsistency
    expect(provider.cancelSubscription).toHaveBeenCalledTimes(1);
  });

  it('full race scenario: failure webhook + success webhook + expiry cron all concurrent', async () => {
    const pastDueSub = createMockSubscription({
      id: 'sub-triple-race',
      status: 'past_due',
      providerSubscriptionId: 'sub_stripe_race',
      updatedAt: new Date('2026-02-01T12:00:00Z'),
      metadata: {
        dunningStartedAt: '2026-02-01T00:00:00Z',
        lastPaymentFailureAt: '2026-02-10T00:00:00Z',
      },
    });

    // All three see the same subscription state
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(pastDueSub);
    vi.mocked(repos.subscriptions.findPastDue).mockResolvedValue([pastDueSub]);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'canceled' }),
    );

    const now = new Date('2026-03-01T12:00:00Z');

    const [failResult, successResult, expiryResult] = await Promise.all([
      handlePaymentFailure(repos, 'sub_stripe_race', 'stripe'),
      handlePaymentSuccess(repos, 'sub_stripe_race', 'stripe'),
      processGracePeriodExpiry(repos, provider, 14, now),
    ]);

    // Failure sees past_due -> idempotent
    expect(failResult.processed).toBe(true);
    expect(failResult.newStatus).toBe('past_due');

    // Success sees past_due -> transitions to active
    expect(successResult.processed).toBe(true);
    expect(successResult.newStatus).toBe('active');

    // Expiry sees past_due + expired -> cancels
    expect(expiryResult.canceled).toBe(1);

    // This test documents the race: without DB-level locking, all three
    // can proceed and create conflicting state. The subscription ends up
    // with whichever update completes last "winning."
    // Total update calls: 1 from success + 1 from expiry = 2 (failure is idempotent)
    expect(repos.subscriptions.update).toHaveBeenCalledTimes(2);
  });

  it('handlePaymentFailure with null metadata on subscription', async () => {
    const subscription = createMockSubscription({
      status: 'active',
      metadata: null as unknown as Record<string, unknown>,
    });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'past_due' }),
    );

    // Should not crash when spreading null metadata
    const result = await handlePaymentFailure(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.newStatus).toBe('past_due');
  });

  it('handlePaymentSuccess with undefined metadata fields on subscription', async () => {
    const subscription = createMockSubscription({
      status: 'past_due',
      metadata: {
        dunningStartedAt: undefined as unknown as string,
        lastPaymentFailureAt: undefined as unknown as string,
      },
    });
    vi.mocked(repos.subscriptions.findByProviderSubscriptionId).mockResolvedValue(subscription);
    vi.mocked(repos.subscriptions.update).mockResolvedValue(
      createMockSubscription({ status: 'active' }),
    );

    const result = await handlePaymentSuccess(repos, 'sub_stripe_123', 'stripe');

    expect(result.processed).toBe(true);
    expect(result.newStatus).toBe('active');
  });
});
