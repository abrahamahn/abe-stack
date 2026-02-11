// src/server/core/src/billing/plan-changes.test.ts
/**
 * Plan Changes Service Tests
 *
 * Validates upgrade, downgrade, and direction detection logic
 * including edge cases and error conditions.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  determinePlanChangeDirection,
  downgradeSubscription,
  upgradeSubscription,
} from './plan-changes';

import type { BillingRepositories } from './types';
import type { Plan, Subscription } from '@abe-stack/db';
import type { BillingService } from '@abe-stack/shared';

// ============================================================================
// Mock Helpers
// ============================================================================

function createMockBillingRepos(): BillingRepositories {
  return {
    plans: {
      listActive: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    },
    subscriptions: {
      findActiveByUserId: vi.fn(),
      findById: vi.fn(),
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

function createMockBillingProvider(): BillingService {
  return {
    provider: 'stripe',
    createCustomer: vi.fn(),
    createCheckoutSession: vi.fn(),
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    getSubscription: vi.fn(),
    createSetupIntent: vi.fn(),
    listPaymentMethods: vi.fn(),
    attachPaymentMethod: vi.fn(),
    detachPaymentMethod: vi.fn(),
    setDefaultPaymentMethod: vi.fn(),
    listInvoices: vi.fn(),
  } as unknown as BillingService;
}

function createMockPlan(overrides?: Partial<Plan>): Plan {
  return {
    id: 'plan-1',
    name: 'Pro Plan',
    description: 'Professional plan',
    priceInCents: 2999,
    currency: 'usd',
    interval: 'month',
    trialDays: 14,
    isActive: true,
    stripePriceId: 'price_stripe_123',
    stripeProductId: 'prod_stripe_123',
    paypalPlanId: null,
    features: [{ name: 'Feature 1', included: true }],
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Plan;
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
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
// determinePlanChangeDirection
// ============================================================================

describe('determinePlanChangeDirection', () => {
  it('should return upgrade when new price is higher', () => {
    expect(determinePlanChangeDirection(2900, 9900)).toBe('upgrade');
  });

  it('should return downgrade when new price is lower', () => {
    expect(determinePlanChangeDirection(9900, 2900)).toBe('downgrade');
  });

  it('should return lateral when prices are equal', () => {
    expect(determinePlanChangeDirection(2900, 2900)).toBe('lateral');
  });

  it('should handle zero prices', () => {
    expect(determinePlanChangeDirection(0, 2900)).toBe('upgrade');
    expect(determinePlanChangeDirection(2900, 0)).toBe('downgrade');
    expect(determinePlanChangeDirection(0, 0)).toBe('lateral');
  });
});

// ============================================================================
// upgradeSubscription
// ============================================================================

describe('upgradeSubscription', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
    provider = createMockBillingProvider();
  });

  it('should upgrade subscription immediately', async () => {
    const currentPlan = createMockPlan({ id: 'plan-1', priceInCents: 2900 });
    const newPlan = createMockPlan({
      id: 'plan-2',
      priceInCents: 9900,
      stripePriceId: 'price_new_123',
    });
    const subscription = createMockSubscription({ planId: 'plan-1' });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById)
      .mockResolvedValueOnce(currentPlan)
      .mockResolvedValueOnce(newPlan);

    const result = await upgradeSubscription(repos, provider, 'user-1', 'plan-2');

    expect(result).toEqual({
      direction: 'upgrade',
      previousPlanId: 'plan-1',
      newPlanId: 'plan-2',
      appliedImmediately: true,
    });
    expect(provider.updateSubscription).toHaveBeenCalledWith(
      subscription.providerSubscriptionId,
      'price_new_123',
    );
    expect(repos.subscriptions.update).toHaveBeenCalledWith(subscription.id, {
      planId: 'plan-2',
    });
  });

  it('should allow upgrade for trialing subscription', async () => {
    const currentPlan = createMockPlan({ id: 'plan-1', priceInCents: 2900 });
    const newPlan = createMockPlan({
      id: 'plan-2',
      priceInCents: 9900,
      stripePriceId: 'price_new_123',
    });
    const subscription = createMockSubscription({ planId: 'plan-1', status: 'trialing' });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById)
      .mockResolvedValueOnce(currentPlan)
      .mockResolvedValueOnce(newPlan);

    const result = await upgradeSubscription(repos, provider, 'user-1', 'plan-2');

    expect(result.appliedImmediately).toBe(true);
    expect(provider.updateSubscription).toHaveBeenCalled();
  });

  it('should throw if no active subscription', async () => {
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

    await expect(upgradeSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toMatchObject({
      name: 'SubscriptionNotFoundError',
    });
  });

  it('should throw if subscription is canceled', async () => {
    const subscription = createMockSubscription({ status: 'canceled' });
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

    await expect(upgradeSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toMatchObject({
      name: 'SubscriptionNotActiveError',
    });
  });

  it('should throw if new plan not found', async () => {
    const currentPlan = createMockPlan({ id: 'plan-1' });
    const subscription = createMockSubscription({ planId: 'plan-1' });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValueOnce(currentPlan).mockResolvedValueOnce(null);

    await expect(upgradeSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toMatchObject({
      name: 'PlanNotFoundError',
    });
  });

  it('should throw if new plan is not active', async () => {
    const currentPlan = createMockPlan({ id: 'plan-1' });
    const newPlan = createMockPlan({ id: 'plan-2', isActive: false });
    const subscription = createMockSubscription({ planId: 'plan-1' });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById)
      .mockResolvedValueOnce(currentPlan)
      .mockResolvedValueOnce(newPlan);

    await expect(upgradeSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toMatchObject({
      name: 'PlanNotActiveError',
    });
  });

  it('should throw if new plan has no price ID', async () => {
    const currentPlan = createMockPlan({ id: 'plan-1' });
    const newPlan = createMockPlan({ id: 'plan-2', stripePriceId: null });
    const subscription = createMockSubscription({ planId: 'plan-1' });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById)
      .mockResolvedValueOnce(currentPlan)
      .mockResolvedValueOnce(newPlan);

    await expect(upgradeSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toThrow(
      'Plan plan-2 has no Stripe price ID configured',
    );
  });
});

// ============================================================================
// downgradeSubscription
// ============================================================================

describe('downgradeSubscription', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
    provider = createMockBillingProvider();
  });

  it('should schedule downgrade at period end', async () => {
    const currentPlan = createMockPlan({ id: 'plan-1', priceInCents: 9900 });
    const newPlan = createMockPlan({
      id: 'plan-2',
      priceInCents: 2900,
      stripePriceId: 'price_basic_123',
    });
    const subscription = createMockSubscription({ planId: 'plan-1', metadata: {} });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById)
      .mockResolvedValueOnce(currentPlan)
      .mockResolvedValueOnce(newPlan);

    const result = await downgradeSubscription(repos, provider, 'user-1', 'plan-2');

    expect(result).toEqual({
      direction: 'downgrade',
      previousPlanId: 'plan-1',
      newPlanId: 'plan-2',
      appliedImmediately: false,
    });
    expect(provider.updateSubscription).toHaveBeenCalledWith(
      subscription.providerSubscriptionId,
      'price_basic_123',
    );
    expect(repos.subscriptions.update).toHaveBeenCalledWith(subscription.id, {
      metadata: { scheduledPlanId: 'plan-2' },
    });
  });

  it('should throw CannotDowngradeInTrialError for trialing subscription', async () => {
    const currentPlan = createMockPlan({ id: 'plan-1', priceInCents: 9900 });
    const newPlan = createMockPlan({
      id: 'plan-2',
      priceInCents: 2900,
      stripePriceId: 'price_basic_123',
    });
    const subscription = createMockSubscription({ planId: 'plan-1', status: 'trialing' });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById)
      .mockResolvedValueOnce(currentPlan)
      .mockResolvedValueOnce(newPlan);

    await expect(downgradeSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toMatchObject({
      name: 'CannotDowngradeInTrialError',
    });
    expect(provider.updateSubscription).not.toHaveBeenCalled();
  });

  it('should throw if no active subscription', async () => {
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

    await expect(downgradeSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toMatchObject({
      name: 'SubscriptionNotFoundError',
    });
  });

  it('should throw if subscription is past_due', async () => {
    const subscription = createMockSubscription({ status: 'past_due' });
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

    await expect(downgradeSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toMatchObject({
      name: 'SubscriptionNotActiveError',
    });
  });

  it('should preserve existing metadata when scheduling downgrade', async () => {
    const currentPlan = createMockPlan({ id: 'plan-1', priceInCents: 9900 });
    const newPlan = createMockPlan({
      id: 'plan-2',
      priceInCents: 2900,
      stripePriceId: 'price_basic_123',
    });
    const subscription = createMockSubscription({
      planId: 'plan-1',
      metadata: { existingKey: 'existingValue' },
    });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById)
      .mockResolvedValueOnce(currentPlan)
      .mockResolvedValueOnce(newPlan);

    await downgradeSubscription(repos, provider, 'user-1', 'plan-2');

    expect(repos.subscriptions.update).toHaveBeenCalledWith(subscription.id, {
      metadata: { existingKey: 'existingValue', scheduledPlanId: 'plan-2' },
    });
  });
});
