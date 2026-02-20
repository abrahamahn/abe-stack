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
