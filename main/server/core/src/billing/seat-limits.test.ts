// main/server/core/src/billing/seat-limits.test.ts
/**
 * Seat-Based Limit Enforcement Tests
 *
 * Validates seat limit assertions and usage reporting
 * against plan entitlements and membership counts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { assertSeatLimit, getSeatUsage } from './seat-limits';

import type { SeatLimitDeps } from './seat-limits';
import type { BillingRepositories } from './types';
import type { Plan, Subscription, MembershipRepository } from '../../../db/src';

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

function createMockMemberships(): MembershipRepository {
  return {
    findByTenantId: vi.fn(),
    findByTenantAndUser: vi.fn(),
    findByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as MembershipRepository;
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
      { key: 'team:invite', name: 'team:invite', included: true, limit: 5 },
      { key: 'storage:limit', name: 'storage:limit', included: true, limit: 1000 },
    ],
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Plan;
}

function createMockDeps(
  repos: BillingRepositories,
  memberships: MembershipRepository,
): SeatLimitDeps {
  return { repos, memberships };
}

// ============================================================================
// assertSeatLimit
// ============================================================================

describe('assertSeatLimit', () => {
  let repos: BillingRepositories;
  let memberships: MembershipRepository;
  let deps: SeatLimitDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
    memberships = createMockMemberships();
    deps = createMockDeps(repos, memberships);
  });

  it('should pass when member count is below limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);
    vi.mocked(memberships.findByTenantId).mockResolvedValue([
      { id: 'm1' },
      { id: 'm2' },
      { id: 'm3' },
    ] as any);

    await expect(assertSeatLimit(deps, 'user-1', 'tenant-1')).resolves.toBeUndefined();
  });

  it('should throw when member count meets the limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);
    vi.mocked(memberships.findByTenantId).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ id: `m${String(i)}` })) as any,
    );

    await expect(assertSeatLimit(deps, 'user-1', 'tenant-1')).rejects.toThrow('Seat limit reached');
  });

  it('should throw when member count exceeds the limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);
    vi.mocked(memberships.findByTenantId).mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => ({ id: `m${String(i)}` })) as any,
    );

    await expect(assertSeatLimit(deps, 'user-1', 'tenant-1')).rejects.toThrow('Seat limit reached');
  });

  it('should throw ForbiddenError with SEAT_LIMIT_EXCEEDED code', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);
    vi.mocked(memberships.findByTenantId).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ id: `m${String(i)}` })) as any,
    );

    try {
      await assertSeatLimit(deps, 'user-1', 'tenant-1');
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      expect(error).toMatchObject({ name: 'ForbiddenError' });
    }
  });

  it('should throw when team:invite feature is not entitled', async () => {
    // No subscription = free tier, team:invite not available
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

    await expect(assertSeatLimit(deps, 'user-1', 'tenant-1')).rejects.toThrow(
      "Feature 'team:invite' is not available on your plan",
    );

    // Should not call memberships when feature is not entitled
    expect(memberships.findByTenantId).not.toHaveBeenCalled();
  });

  it('should pass when feature has no limit (unlimited seats)', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan({
      features: [{ key: 'team:invite', name: 'team:invite', included: true }],
    });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    await expect(assertSeatLimit(deps, 'user-1', 'tenant-1')).resolves.toBeUndefined();

    // Should not query memberships when there is no limit
    expect(memberships.findByTenantId).not.toHaveBeenCalled();
  });

  it('should pass when feature limit is 1 and tenant has 0 members', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan({
      features: [
        { key: 'team:invite', name: 'team:invite', included: true, limit: 1 },
      ] as unknown as Plan['features'],
    });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);
    vi.mocked(memberships.findByTenantId).mockResolvedValue([]);

    await expect(assertSeatLimit(deps, 'user-1', 'tenant-1')).resolves.toBeUndefined();
  });
});

// ============================================================================
// getSeatUsage
// ============================================================================

describe('getSeatUsage', () => {
  let repos: BillingRepositories;
  let memberships: MembershipRepository;
  let deps: SeatLimitDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
    memberships = createMockMemberships();
    deps = createMockDeps(repos, memberships);
  });

  it('should return usage below limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);
    vi.mocked(memberships.findByTenantId).mockResolvedValue([{ id: 'm1' }, { id: 'm2' }] as any);

    const usage = await getSeatUsage(deps, 'user-1', 'tenant-1');

    expect(usage.currentSeats).toBe(2);
    expect(usage.maxSeats).toBe(5);
    expect(usage.atLimit).toBe(false);
  });

  it('should return at-limit when seats are full', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);
    vi.mocked(memberships.findByTenantId).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ id: `m${String(i)}` })) as any,
    );

    const usage = await getSeatUsage(deps, 'user-1', 'tenant-1');

    expect(usage.currentSeats).toBe(5);
    expect(usage.maxSeats).toBe(5);
    expect(usage.atLimit).toBe(true);
  });

  it('should return unlimited when feature has no limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan({
      features: [{ key: 'team:invite', name: 'team:invite', included: true }],
    });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);
    vi.mocked(memberships.findByTenantId).mockResolvedValue([{ id: 'm1' }] as any);

    const usage = await getSeatUsage(deps, 'user-1', 'tenant-1');

    expect(usage.currentSeats).toBe(1);
    expect(usage.maxSeats).toBeUndefined();
    expect(usage.atLimit).toBe(false);
  });

  it('should report at-limit with 0 max when feature is not entitled', async () => {
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);
    vi.mocked(memberships.findByTenantId).mockResolvedValue([{ id: 'm1' }, { id: 'm2' }] as any);

    const usage = await getSeatUsage(deps, 'user-1', 'tenant-1');

    expect(usage.currentSeats).toBe(2);
    expect(usage.maxSeats).toBe(0);
    expect(usage.atLimit).toBe(true);
  });

  it('should return 0 current seats for empty workspace', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);
    vi.mocked(memberships.findByTenantId).mockResolvedValue([]);

    const usage = await getSeatUsage(deps, 'user-1', 'tenant-1');

    expect(usage.currentSeats).toBe(0);
    expect(usage.maxSeats).toBe(5);
    expect(usage.atLimit).toBe(false);
  });
});
