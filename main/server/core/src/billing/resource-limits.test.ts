// main/server/core/src/billing/resource-limits.test.ts
/**
 * Storage / Resource Limit Enforcement Tests
 *
 * Validates storage limit assertions and usage reporting
 * against plan entitlements and storage consumption.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { assertStorageLimit, getStorageUsage } from './resource-limits';

import type { BillingRepositories } from './types';
import type { Plan, Subscription } from '../../../db/src';

// ============================================================================
// Constants
// ============================================================================

const BYTES_PER_MB = 1024 * 1024;

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
      { key: 'storage:limit', name: 'storage:limit', included: true, limit: 100 },
      { key: 'team:invite', name: 'team:invite', included: true },
    ],
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Plan;
}

// ============================================================================
// assertStorageLimit
// ============================================================================

describe('assertStorageLimit', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should pass when storage usage plus additional bytes is below limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan(); // 100 MB limit

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(50 * BYTES_PER_MB); // 50 MB used
    const additionalBytes = 10 * BYTES_PER_MB; // 10 MB upload

    await expect(
      assertStorageLimit(repos, 'user-1', 'tenant-1', additionalBytes, counter),
    ).resolves.toBeUndefined();

    expect(counter).toHaveBeenCalledWith('tenant-1');
  });

  it('should throw when additional bytes would exceed the limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan(); // 100 MB limit

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(95 * BYTES_PER_MB); // 95 MB used
    const additionalBytes = 10 * BYTES_PER_MB; // 10 MB upload -> 105 MB total

    await expect(
      assertStorageLimit(repos, 'user-1', 'tenant-1', additionalBytes, counter),
    ).rejects.toThrow('Storage limit exceeded');
  });

  it('should pass when upload exactly fills remaining storage', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan(); // 100 MB limit

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(90 * BYTES_PER_MB); // 90 MB used
    const additionalBytes = 10 * BYTES_PER_MB; // 10 MB upload -> exactly 100 MB

    await expect(
      assertStorageLimit(repos, 'user-1', 'tenant-1', additionalBytes, counter),
    ).resolves.toBeUndefined();
  });

  it('should throw when storage is already at limit even with 0 additional bytes', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan(); // 100 MB limit

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(100 * BYTES_PER_MB); // Exactly at limit
    const additionalBytes = 1; // 1 byte over

    await expect(
      assertStorageLimit(repos, 'user-1', 'tenant-1', additionalBytes, counter),
    ).rejects.toThrow('Storage limit exceeded');
  });

  it('should throw ForbiddenError with STORAGE_LIMIT_EXCEEDED code', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(100 * BYTES_PER_MB);
    const additionalBytes = 1 * BYTES_PER_MB;

    try {
      await assertStorageLimit(repos, 'user-1', 'tenant-1', additionalBytes, counter);
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      expect(error).toMatchObject({ name: 'ForbiddenError' });
    }
  });

  it('should throw when storage feature is not entitled', async () => {
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

    const counter = vi.fn().mockResolvedValue(0);

    await expect(assertStorageLimit(repos, 'user-1', 'tenant-1', 1024, counter)).rejects.toThrow(
      "Feature 'storage:limit' is not available on your plan",
    );

    // Counter should not be called when feature is not entitled
    expect(counter).not.toHaveBeenCalled();
  });

  it('should pass when feature has no limit (unlimited storage)', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan({
      features: [{ key: 'storage:limit', name: 'storage:limit', included: true, value: Infinity }],
    });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(999 * BYTES_PER_MB);

    await expect(
      assertStorageLimit(repos, 'user-1', 'tenant-1', 100 * BYTES_PER_MB, counter),
    ).resolves.toBeUndefined();

    // Counter should not be called when there is no limit
    expect(counter).not.toHaveBeenCalled();
  });

  it('should pass with zero additional bytes when under limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(50 * BYTES_PER_MB);

    await expect(
      assertStorageLimit(repos, 'user-1', 'tenant-1', 0, counter),
    ).resolves.toBeUndefined();
  });
});

// ============================================================================
// getStorageUsage
// ============================================================================

describe('getStorageUsage', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should return usage below limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan(); // 100 MB limit

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(50 * BYTES_PER_MB);

    const usage = await getStorageUsage(repos, 'user-1', 'tenant-1', counter);

    expect(usage.currentBytes).toBe(50 * BYTES_PER_MB);
    expect(usage.maxBytes).toBe(100 * BYTES_PER_MB);
    expect(usage.percentUsed).toBe(50);
    expect(usage.atLimit).toBe(false);
  });

  it('should return 100% when at limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(100 * BYTES_PER_MB);

    const usage = await getStorageUsage(repos, 'user-1', 'tenant-1', counter);

    expect(usage.currentBytes).toBe(100 * BYTES_PER_MB);
    expect(usage.maxBytes).toBe(100 * BYTES_PER_MB);
    expect(usage.percentUsed).toBe(100);
    expect(usage.atLimit).toBe(true);
  });

  it('should cap percentUsed at 100 even when over limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(150 * BYTES_PER_MB);

    const usage = await getStorageUsage(repos, 'user-1', 'tenant-1', counter);

    expect(usage.percentUsed).toBe(100);
    expect(usage.atLimit).toBe(true);
  });

  it('should return unlimited when feature has no limit', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan({
      features: [{ key: 'storage:limit', name: 'storage:limit', included: true, value: Infinity }],
    });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(50 * BYTES_PER_MB);

    const usage = await getStorageUsage(repos, 'user-1', 'tenant-1', counter);

    expect(usage.currentBytes).toBe(50 * BYTES_PER_MB);
    expect(usage.maxBytes).toBeUndefined();
    expect(usage.percentUsed).toBe(0);
    expect(usage.atLimit).toBe(false);
  });

  it('should report at-limit with 0 max when feature is not entitled', async () => {
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

    const counter = vi.fn().mockResolvedValue(50 * BYTES_PER_MB);

    const usage = await getStorageUsage(repos, 'user-1', 'tenant-1', counter);

    expect(usage.currentBytes).toBe(50 * BYTES_PER_MB);
    expect(usage.maxBytes).toBe(0);
    expect(usage.percentUsed).toBe(100);
    expect(usage.atLimit).toBe(true);
  });

  it('should return 0 percent used for empty workspace', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const counter = vi.fn().mockResolvedValue(0);

    const usage = await getStorageUsage(repos, 'user-1', 'tenant-1', counter);

    expect(usage.currentBytes).toBe(0);
    expect(usage.maxBytes).toBe(100 * BYTES_PER_MB);
    expect(usage.percentUsed).toBe(0);
    expect(usage.atLimit).toBe(false);
  });
});
