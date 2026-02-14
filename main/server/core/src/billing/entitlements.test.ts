// main/server/core/src/billing/entitlements.test.ts
/**
 * Server-Side Entitlement Helpers Tests
 *
 * Validates resolving entitlements from database and usage limit checking.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { assertUsageWithinLimit, resolveEntitlementsForUser } from './entitlements';

import type { BillingRepositories } from './types';
import type { Plan, Subscription } from '../../../db/src';

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
    features: [
      { key: 'api:access', name: 'api_access', included: true },
      { key: 'projects:limit', name: 'max_projects', included: true, limit: 10 },
      { key: 'media:processing', name: 'media:processing', included: true },
    ],
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Plan;
}

// ============================================================================
// resolveEntitlementsForUser
// ============================================================================

describe('resolveEntitlementsForUser', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should resolve entitlements for user with active subscription', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const result = await resolveEntitlementsForUser(repos, 'user-1');

    expect(result.subscriptionState).toBe('active');
    expect(result.planId).toBe('plan-1');
    expect(result.features['basic_access']?.enabled).toBe(true);
  });

  it('should resolve free tier entitlements for user with no subscription', async () => {
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

    const result = await resolveEntitlementsForUser(repos, 'user-1');

    expect(result.subscriptionState).toBe('none');
    expect(result.planId).toBeUndefined();
    expect(result.features['basic_access']?.enabled).toBe(true);
    expect(result.features['api_access']?.enabled).toBe(false);
  });

  it('should resolve read-only entitlements for past_due subscription', async () => {
    const subscription = createMockSubscription({ status: 'past_due' });
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const result = await resolveEntitlementsForUser(repos, 'user-1');

    expect(result.subscriptionState).toBe('past_due');
    expect(result.features['basic_access']?.enabled).toBe(true);
    expect(result.features['read_only']?.enabled).toBe(true);
  });

  it('should resolve trialing subscription the same as active', async () => {
    const subscription = createMockSubscription({ status: 'trialing' });
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const result = await resolveEntitlementsForUser(repos, 'user-1');

    expect(result.subscriptionState).toBe('trialing');
    expect(result.features['basic_access']?.enabled).toBe(true);
  });

  it('should handle subscription with null plan gracefully', async () => {
    const subscription = createMockSubscription();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(null);

    const result = await resolveEntitlementsForUser(repos, 'user-1');

    // Still has basic_access from active subscription
    expect(result.subscriptionState).toBe('active');
    expect(result.features['basic_access']?.enabled).toBe(true);
  });
});

// ============================================================================
// assertUsageWithinLimit
// ============================================================================

describe('assertUsageWithinLimit', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should pass when usage is below limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(5);

    await expect(
      assertUsageWithinLimit(repos, 'user-1', 'max_projects', 'tenant-1', counter),
    ).resolves.toBeUndefined();

    expect(counter).toHaveBeenCalledWith('tenant-1');
  });

  it('should throw when usage meets limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(10);

    await expect(
      assertUsageWithinLimit(repos, 'user-1', 'max_projects', 'tenant-1', counter),
    ).rejects.toThrow('Limit exceeded');
  });

  it('should throw when usage exceeds limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(15);

    await expect(
      assertUsageWithinLimit(repos, 'user-1', 'max_projects', 'tenant-1', counter),
    ).rejects.toThrow('Limit exceeded');
  });

  it('should throw when feature is not entitled', async () => {
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

    const counter = vi.fn().mockResolvedValue(0);

    await expect(
      assertUsageWithinLimit(repos, 'user-1', 'api_access', 'tenant-1', counter),
    ).rejects.toThrow("Feature 'api_access' is not available on your plan");

    // Counter should not be called if feature is not entitled
    expect(counter).not.toHaveBeenCalled();
  });

  it('should pass when feature has no limit (unlimited)', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    // api_access is a toggle feature with no limit
    const counter = vi.fn().mockResolvedValue(999);

    await expect(
      assertUsageWithinLimit(repos, 'user-1', 'api_access', 'tenant-1', counter),
    ).resolves.toBeUndefined();

    // Counter should not be called when there is no limit
    expect(counter).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenError with FEATURE_NOT_ENTITLED code', async () => {
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

    const counter = vi.fn().mockResolvedValue(0);

    try {
      await assertUsageWithinLimit(repos, 'user-1', 'api_access', 'tenant-1', counter);
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        name: 'ForbiddenError',
      });
    }
  });

  it('should throw ForbiddenError with LIMIT_EXCEEDED code when over limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(10);

    try {
      await assertUsageWithinLimit(repos, 'user-1', 'max_projects', 'tenant-1', counter);
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        name: 'ForbiddenError',
      });
    }
  });
});
