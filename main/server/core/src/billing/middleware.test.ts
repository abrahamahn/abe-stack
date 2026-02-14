// main/server/core/src/billing/middleware.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireEntitlement } from './middleware';

import type { BillingRepositories } from './types';
import type { Plan, Subscription } from '../../../db/src';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRepos(): BillingRepositories {
  return {
    plans: {
      findById: vi.fn(),
      listActive: vi.fn(),
    },
    subscriptions: {
      findActiveByUserId: vi.fn(),
      update: vi.fn(),
    },
    customerMappings: {
      getOrCreate: vi.fn(),
      findByUserIdAndProvider: vi.fn(),
    },
    invoices: {
      findById: vi.fn(),
      findByUserId: vi.fn(),
    },
    paymentMethods: {
      findById: vi.fn(),
      findByUserId: vi.fn(),
    },
  } as unknown as BillingRepositories;
}

function createMockRequest(user?: { userId: string }): FastifyRequest {
  return { user } as unknown as FastifyRequest;
}

function createMockReply(): FastifyReply {
  return {} as unknown as FastifyReply;
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
      { key: 'media:processing', name: 'media:processing', included: true },
      { key: 'projects:limit', name: 'max_projects', included: true, value: 100 },
    ],
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Plan;
}

// ============================================================================
// Tests
// ============================================================================

describe('requireEntitlement', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should pass when user has entitled feature on active subscription', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const middleware = requireEntitlement('api_access', { repos });
    const request = createMockRequest({ userId: 'user-1' });
    const reply = createMockReply();

    await expect(middleware(request, reply)).resolves.toBeUndefined();
  });

  it('should throw ForbiddenError when feature is not in plan', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan({
      features: [{ key: 'branding:custom', name: 'basic_access', included: true }],
    });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const middleware = requireEntitlement('api_access', { repos });
    const request = createMockRequest({ userId: 'user-1' });
    const reply = createMockReply();

    await expect(middleware(request, reply)).rejects.toThrow(
      "Feature 'api_access' is not available on your plan",
    );
  });

  it('should throw ForbiddenError when user has no subscription (free tier)', async () => {
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

    const middleware = requireEntitlement('api_access', { repos });
    const request = createMockRequest({ userId: 'user-1' });
    const reply = createMockReply();

    await expect(middleware(request, reply)).rejects.toThrow(
      "Feature 'api_access' is not available on your plan",
    );
  });

  it('should allow free tier features when user has no subscription', async () => {
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

    const middleware = requireEntitlement('basic_access', { repos });
    const request = createMockRequest({ userId: 'user-1' });
    const reply = createMockReply();

    await expect(middleware(request, reply)).resolves.toBeUndefined();
  });

  it('should throw ForbiddenError when user is not authenticated', async () => {
    const middleware = requireEntitlement('api_access', { repos });
    const request = createMockRequest();
    const reply = createMockReply();

    await expect(middleware(request, reply)).rejects.toThrow('Authentication required');
  });

  it('should handle trialing subscription as active', async () => {
    const subscription = createMockSubscription({ status: 'trialing' });
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const middleware = requireEntitlement('api_access', { repos });
    const request = createMockRequest({ userId: 'user-1' });
    const reply = createMockReply();

    await expect(middleware(request, reply)).resolves.toBeUndefined();
  });

  it('should restrict access for past_due subscriptions', async () => {
    const subscription = createMockSubscription({ status: 'past_due' });
    const plan = createMockPlan();

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const middleware = requireEntitlement('api_access', { repos });
    const request = createMockRequest({ userId: 'user-1' });
    const reply = createMockReply();

    // past_due gives read_only + basic_access only
    await expect(middleware(request, reply)).rejects.toThrow(
      "Feature 'api_access' is not available on your plan",
    );
  });

  it('should handle plan with null features gracefully', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan({ features: null as unknown as Plan['features'] });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const middleware = requireEntitlement('basic_access', { repos });
    const request = createMockRequest({ userId: 'user-1' });
    const reply = createMockReply();

    // Active subscription with no plan features still gets basic_access
    await expect(middleware(request, reply)).resolves.toBeUndefined();
  });
});
