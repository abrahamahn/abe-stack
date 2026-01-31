// modules/admin/src/billingHandlers.test.ts
/**
 * Unit tests for Admin Billing Handlers
 *
 * Tests HTTP handlers for admin billing operations (plan management).
 * Covers happy paths, error cases, and edge conditions with proper mocking.
 */

import {
  BillingProviderNotConfiguredError,
  CannotDeactivatePlanWithActiveSubscriptionsError,
  PlanNotFoundError,
  type CreatePlanRequest,
  type UpdatePlanRequest,
} from '@abe-stack/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  handleAdminCreatePlan,
  handleAdminDeactivatePlan,
  handleAdminGetPlan,
  handleAdminListPlans,
  handleAdminSyncPlanToStripe,
  handleAdminUpdatePlan,
} from './billingHandlers';

import type { Plan as DbPlan } from '@abe-stack/db';
import type { AdminAppContext, AdminRequest } from './types';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('./billingService', () => ({
  getAllPlans: vi.fn(),
  getPlanById: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deactivatePlan: vi.fn(),
  syncPlanToStripe: vi.fn(),
}));

// Mock billing provider from @abe-stack/billing
vi.mock('@abe-stack/billing', () => ({
  createBillingProvider: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a mock database plan for testing
 */
function createMockDbPlan(overrides: Partial<DbPlan> = {}): DbPlan {
  return {
    id: 'plan-123',
    name: 'Pro Plan',
    description: 'Professional tier with advanced features',
    interval: 'month' as const,
    priceInCents: 2999,
    currency: 'usd',
    features: [
      { name: 'Unlimited projects', included: true },
      { name: 'Priority support', included: true, description: '24/7 support' },
    ],
    trialDays: 14,
    stripePriceId: 'price_123',
    stripeProductId: 'prod_123',
    paypalPlanId: null,
    isActive: true,
    sortOrder: 10,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Creates a mock app context with all required services
 */
function createMockContext(configOverrides: Partial<AdminAppContext['config']> = {}): AdminAppContext {
  return {
    config: {
      billing: {
        enabled: true,
        provider: 'stripe' as const,
        stripe: {
          secretKey: 'sk_test_123',
          publishableKey: 'pk_test_123',
          webhookSecret: 'whsec_test_123',
        },
      },
      ...configOverrides,
    } as AdminAppContext['config'],
    db: {} as AdminAppContext['db'],
    repos: {
      plans: {
        listAll: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deactivate: vi.fn(),
      },
      subscriptions: {
        countActiveByPlanId: vi.fn(),
      },
    } as unknown as AdminAppContext['repos'],
    email: {} as AdminAppContext['email'],
    storage: {} as AdminAppContext['storage'],
    pubsub: {} as AdminAppContext['pubsub'],
    cache: {} as AdminAppContext['cache'],
    billing: {} as AdminAppContext['billing'],
    notifications: {} as AdminAppContext['notifications'],
    queue: {} as AdminAppContext['queue'],
    write: {} as AdminAppContext['write'],
    search: {} as AdminAppContext['search'],
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as AdminAppContext['log'],
  };
}

/**
 * Creates a mock request with authentication
 */
function createMockRequest(overrides: Partial<AdminRequest> = {}): AdminRequest {
  return {
    cookies: {},
    headers: {},
    user: { userId: 'admin-123', email: 'admin@example.com', role: 'admin' },
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
    ...overrides,
  } as AdminRequest;
}

/**
 * Creates a valid plan creation request
 */
function createValidPlanRequest(overrides: Partial<CreatePlanRequest> = {}): CreatePlanRequest {
  return {
    name: 'Starter Plan',
    description: 'Perfect for beginners',
    interval: 'month' as const,
    priceInCents: 999,
    currency: 'usd',
    features: [{ name: 'Basic feature', included: true }],
    trialDays: 7,
    isActive: true,
    sortOrder: 5,
    ...overrides,
  };
}


// ============================================================================
// Tests: handleAdminListPlans
// ============================================================================

describe('handleAdminListPlans', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  describe('when listing plans successfully', () => {
    test('should return 200 with all plans including inactive', async () => {
      const { getAllPlans } = await import('./billingService');
      const mockPlans = [
        createMockDbPlan({ id: 'plan-1', name: 'Active Plan', isActive: true }),
        createMockDbPlan({ id: 'plan-2', name: 'Inactive Plan', isActive: false }),
      ];
      vi.mocked(getAllPlans).mockResolvedValue(mockPlans);

      const req = createMockRequest();
      const result = await handleAdminListPlans(mockCtx, undefined, req);

      expect(result.status).toBe(200);
      expect('body' in result && result.body).toBeDefined();
      if ('body' in result) {
        expect(result.body.plans).toHaveLength(2);
        expect(result.body.plans[0].id).toBe('plan-1');
        expect(result.body.plans[1].id).toBe('plan-2');
        expect(result.body.plans[1].isActive).toBe(false);
      }
      expect(getAllPlans).toHaveBeenCalledWith({
        plans: mockCtx.repos.plans,
        subscriptions: mockCtx.repos.subscriptions,
      });
    });

    test('should return empty array when no plans exist', async () => {
      const { getAllPlans } = await import('./billingService');
      vi.mocked(getAllPlans).mockResolvedValue([]);

      const req = createMockRequest();
      const result = await handleAdminListPlans(mockCtx, undefined, req);

      expect(result.status).toBe(200);
      expect('body' in result && result.body.plans).toEqual([]);
    });

    test('should format plan dates as ISO strings', async () => {
      const { getAllPlans } = await import('./billingService');
      const mockPlan = createMockDbPlan({
        createdAt: new Date('2024-06-15T12:30:00.000Z'),
        updatedAt: new Date('2024-06-20T08:15:00.000Z'),
      });
      vi.mocked(getAllPlans).mockResolvedValue([mockPlan]);

      const req = createMockRequest();
      const result = await handleAdminListPlans(mockCtx, undefined, req);

      expect('body' in result && result.body.plans[0].createdAt).toBe(
        '2024-06-15T12:30:00.000Z',
      );
      expect('body' in result && result.body.plans[0].updatedAt).toBe(
        '2024-06-20T08:15:00.000Z',
      );
    });
  });

  describe('when errors occur', () => {
    test('should return 500 with generic message for unexpected errors', async () => {
      const { getAllPlans } = await import('./billingService');
      vi.mocked(getAllPlans).mockRejectedValue(new Error('Database connection failed'));

      const req = createMockRequest();
      const result = await handleAdminListPlans(mockCtx, undefined, req);

      expect(result.status).toBe(500);
      expect('body' in result && result.body.message).toBe(
        'An error occurred processing your request',
      );
      expect(mockCtx.log.error).toHaveBeenCalled();
    });

    test('should handle non-Error thrown values', async () => {
      const { getAllPlans } = await import('./billingService');
      vi.mocked(getAllPlans).mockRejectedValue('String error');

      const req = createMockRequest();
      const result = await handleAdminListPlans(mockCtx, undefined, req);

      expect(result.status).toBe(500);
      expect(mockCtx.log.error).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Tests: handleAdminGetPlan
// ============================================================================

describe('handleAdminGetPlan', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  describe('when retrieving a plan successfully', () => {
    test('should return 200 with plan details', async () => {
      const { getPlanById } = await import('./billingService');
      const mockPlan = createMockDbPlan({ id: 'plan-456' });
      vi.mocked(getPlanById).mockResolvedValue(mockPlan);

      const req = createMockRequest();
      const result = await handleAdminGetPlan(mockCtx, undefined, req, { id: 'plan-456' });

      expect(result.status).toBe(200);
      expect('body' in result && result.body.plan.id).toBe('plan-456');
      expect(getPlanById).toHaveBeenCalledWith(
        {
          plans: mockCtx.repos.plans,
          subscriptions: mockCtx.repos.subscriptions,
        },
        'plan-456',
      );
    });

    test('should include all plan fields in response', async () => {
      const { getPlanById } = await import('./billingService');
      const mockPlan = createMockDbPlan({
        name: 'Enterprise',
        description: 'For large teams',
        interval: 'year',
        priceInCents: 99900,
        currency: 'usd',
        features: [{ name: 'Custom integrations', included: true }],
        trialDays: 30,
        stripePriceId: 'price_enterprise',
        stripeProductId: 'prod_enterprise',
        paypalPlanId: 'pp_plan',
      });
      vi.mocked(getPlanById).mockResolvedValue(mockPlan);

      const req = createMockRequest();
      const result = await handleAdminGetPlan(mockCtx, undefined, req, { id: 'plan-123' });

      expect('body' in result && result.body.plan.name).toBe('Enterprise');
      expect('body' in result && result.body.plan.interval).toBe('year');
      expect('body' in result && result.body.plan.priceInCents).toBe(99900);
      expect('body' in result && result.body.plan.stripePriceId).toBe('price_enterprise');
      expect('body' in result && result.body.plan.paypalPlanId).toBe('pp_plan');
    });
  });

  describe('when plan is not found', () => {
    test('should return 404 with not found message', async () => {
      const { getPlanById } = await import('./billingService');
      vi.mocked(getPlanById).mockRejectedValue(new PlanNotFoundError('nonexistent-plan'));

      const req = createMockRequest();
      const result = await handleAdminGetPlan(mockCtx, undefined, req, {
        id: 'nonexistent-plan',
      });

      expect(result.status).toBe(404);
      expect('body' in result && result.body.message).toBe('Plan not found: nonexistent-plan');
    });
  });

  describe('when errors occur', () => {
    test('should return 500 for unexpected errors', async () => {
      const { getPlanById } = await import('./billingService');
      vi.mocked(getPlanById).mockRejectedValue(new Error('Unexpected error'));

      const req = createMockRequest();
      const result = await handleAdminGetPlan(mockCtx, undefined, req, { id: 'plan-123' });

      expect(result.status).toBe(500);
      expect(mockCtx.log.error).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Tests: handleAdminCreatePlan
// ============================================================================

describe('handleAdminCreatePlan', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  describe('when creating a plan successfully', () => {
    test('should return 201 with created plan', async () => {
      const { createPlan } = await import('./billingService');
      const planRequest = createValidPlanRequest();
      const mockCreatedPlan = createMockDbPlan({
        id: 'new-plan-123',
        name: planRequest.name,
        priceInCents: planRequest.priceInCents,
      });
      vi.mocked(createPlan).mockResolvedValue(mockCreatedPlan);

      const req = createMockRequest();
      const result = await handleAdminCreatePlan(mockCtx, planRequest, req);

      expect(result.status).toBe(201);
      expect('body' in result && result.body.plan.id).toBe('new-plan-123');
      expect('body' in result && result.body.plan.name).toBe('Starter Plan');
      expect(createPlan).toHaveBeenCalledWith(
        {
          plans: mockCtx.repos.plans,
          subscriptions: mockCtx.repos.subscriptions,
        },
        planRequest,
      );
    });

    test('should handle minimal plan creation (only required fields)', async () => {
      const { createPlan } = await import('./billingService');
      const minimalRequest: CreatePlanRequest = {
        name: 'Basic',
        interval: 'month',
        priceInCents: 500,
      };
      const mockCreatedPlan = createMockDbPlan({
        name: 'Basic',
        description: null,
        priceInCents: 500,
        features: [],
        trialDays: 0,
      });
      vi.mocked(createPlan).mockResolvedValue(mockCreatedPlan);

      const req = createMockRequest();
      const result = await handleAdminCreatePlan(mockCtx, minimalRequest, req);

      expect(result.status).toBe(201);
      expect('body' in result && result.body.plan.name).toBe('Basic');
      expect('body' in result && result.body.plan.description).toBeNull();
    });

    test('should handle plan with complex features array', async () => {
      const { createPlan } = await import('./billingService');
      const planRequest = createValidPlanRequest({
        features: [
          { name: 'Feature 1', included: true },
          { name: 'Feature 2', included: false },
          { name: 'Feature 3', included: true, description: 'Advanced feature' },
        ],
      });
      const mockCreatedPlan = createMockDbPlan({ features: planRequest.features });
      vi.mocked(createPlan).mockResolvedValue(mockCreatedPlan);

      const req = createMockRequest();
      const result = await handleAdminCreatePlan(mockCtx, planRequest, req);

      expect(result.status).toBe(201);
      expect('body' in result && result.body.plan.features).toHaveLength(3);
      expect('body' in result && result.body.plan.features[2].description).toBe(
        'Advanced feature',
      );
    });

    test('should handle yearly billing interval', async () => {
      const { createPlan } = await import('./billingService');
      const planRequest = createValidPlanRequest({ interval: 'year', priceInCents: 9999 });
      const mockCreatedPlan = createMockDbPlan({ interval: 'year', priceInCents: 9999 });
      vi.mocked(createPlan).mockResolvedValue(mockCreatedPlan);

      const req = createMockRequest();
      const result = await handleAdminCreatePlan(mockCtx, planRequest, req);

      expect('body' in result && result.body.plan.interval).toBe('year');
      expect('body' in result && result.body.plan.priceInCents).toBe(9999);
    });
  });

  describe('when errors occur', () => {
    test('should return 500 for database errors', async () => {
      const { createPlan } = await import('./billingService');
      vi.mocked(createPlan).mockRejectedValue(new Error('Database constraint violation'));

      const req = createMockRequest();
      const result = await handleAdminCreatePlan(mockCtx, createValidPlanRequest(), req);

      expect(result.status).toBe(500);
      expect(mockCtx.log.error).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Tests: handleAdminUpdatePlan
// ============================================================================

describe('handleAdminUpdatePlan', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  describe('when updating a plan successfully', () => {
    test('should return 200 with updated plan', async () => {
      const { updatePlan } = await import('./billingService');
      const updateRequest: UpdatePlanRequest = {
        name: 'Updated Pro Plan',
        priceInCents: 3499,
      };
      const mockUpdatedPlan = createMockDbPlan({
        id: 'plan-123',
        name: 'Updated Pro Plan',
        priceInCents: 3499,
      });
      vi.mocked(updatePlan).mockResolvedValue(mockUpdatedPlan);

      const req = createMockRequest();
      const result = await handleAdminUpdatePlan(mockCtx, updateRequest, req, { id: 'plan-123' });

      expect(result.status).toBe(200);
      expect('body' in result && result.body.plan.name).toBe('Updated Pro Plan');
      expect('body' in result && result.body.plan.priceInCents).toBe(3499);
      expect(updatePlan).toHaveBeenCalledWith(
        {
          plans: mockCtx.repos.plans,
          subscriptions: mockCtx.repos.subscriptions,
        },
        'plan-123',
        updateRequest,
      );
    });

    test('should handle partial updates', async () => {
      const { updatePlan } = await import('./billingService');
      const updateRequest: UpdatePlanRequest = { trialDays: 30 };
      const mockUpdatedPlan = createMockDbPlan({ trialDays: 30 });
      vi.mocked(updatePlan).mockResolvedValue(mockUpdatedPlan);

      const req = createMockRequest();
      const result = await handleAdminUpdatePlan(mockCtx, updateRequest, req, { id: 'plan-123' });

      expect(result.status).toBe(200);
      expect('body' in result && result.body.plan.trialDays).toBe(30);
    });

    test('should handle setting description to null', async () => {
      const { updatePlan } = await import('./billingService');
      const updateRequest: UpdatePlanRequest = { description: null };
      const mockUpdatedPlan = createMockDbPlan({ description: null });
      vi.mocked(updatePlan).mockResolvedValue(mockUpdatedPlan);

      const req = createMockRequest();
      const result = await handleAdminUpdatePlan(mockCtx, updateRequest, req, { id: 'plan-123' });

      expect('body' in result && result.body.plan.description).toBeNull();
    });

    test('should handle updating features array', async () => {
      const { updatePlan } = await import('./billingService');
      const newFeatures = [
        { name: 'New Feature 1', included: true },
        { name: 'New Feature 2', included: true, description: 'Premium feature' },
      ];
      const updateRequest: UpdatePlanRequest = { features: newFeatures };
      const mockUpdatedPlan = createMockDbPlan({ features: newFeatures });
      vi.mocked(updatePlan).mockResolvedValue(mockUpdatedPlan);

      const req = createMockRequest();
      const result = await handleAdminUpdatePlan(mockCtx, updateRequest, req, { id: 'plan-123' });

      expect('body' in result && result.body.plan.features).toHaveLength(2);
      expect('body' in result && result.body.plan.features[1].description).toBe(
        'Premium feature',
      );
    });

    test('should handle deactivating a plan via update', async () => {
      const { updatePlan } = await import('./billingService');
      const updateRequest: UpdatePlanRequest = { isActive: false };
      const mockUpdatedPlan = createMockDbPlan({ isActive: false });
      vi.mocked(updatePlan).mockResolvedValue(mockUpdatedPlan);

      const req = createMockRequest();
      const result = await handleAdminUpdatePlan(mockCtx, updateRequest, req, { id: 'plan-123' });

      expect('body' in result && result.body.plan.isActive).toBe(false);
    });
  });

  describe('when plan is not found', () => {
    test('should return 404 with not found message', async () => {
      const { updatePlan } = await import('./billingService');
      vi.mocked(updatePlan).mockRejectedValue(new PlanNotFoundError('nonexistent-plan'));

      const req = createMockRequest();
      const result = await handleAdminUpdatePlan(
        mockCtx,
        { name: 'Test' },
        req,
        { id: 'nonexistent-plan' },
      );

      expect(result.status).toBe(404);
      expect('body' in result && result.body.message).toBe('Plan not found: nonexistent-plan');
    });
  });

  describe('when errors occur', () => {
    test('should return 500 for database errors', async () => {
      const { updatePlan } = await import('./billingService');
      vi.mocked(updatePlan).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest();
      const result = await handleAdminUpdatePlan(mockCtx, { name: 'Test' }, req, {
        id: 'plan-123',
      });

      expect(result.status).toBe(500);
      expect(mockCtx.log.error).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Tests: handleAdminSyncPlanToStripe
// ============================================================================

describe('handleAdminSyncPlanToStripe', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  describe('when syncing a plan successfully', () => {
    test('should return 200 with Stripe IDs', async () => {
      const { syncPlanToStripe } = await import('./billingService');
      const { createBillingProvider } = await import('@abe-stack/billing');
      const mockProvider = { updateProduct: vi.fn(), createProduct: vi.fn() };
      vi.mocked(createBillingProvider).mockReturnValue(mockProvider as never);
      vi.mocked(syncPlanToStripe).mockResolvedValue({
        stripePriceId: 'price_new_123',
        stripeProductId: 'prod_new_123',
      });

      const req = createMockRequest();
      const result = await handleAdminSyncPlanToStripe(mockCtx, undefined, req, {
        id: 'plan-123',
      });

      expect(result.status).toBe(200);
      expect('body' in result && result.body.success).toBe(true);
      expect('body' in result && result.body.stripePriceId).toBe('price_new_123');
      expect('body' in result && result.body.stripeProductId).toBe('prod_new_123');
      expect(syncPlanToStripe).toHaveBeenCalledWith(
        {
          plans: mockCtx.repos.plans,
          subscriptions: mockCtx.repos.subscriptions,
        },
        mockProvider,
        'plan-123',
      );
    });

    test('should create billing provider with correct config', async () => {
      const { syncPlanToStripe } = await import('./billingService');
      const { createBillingProvider } = await import('@abe-stack/billing');
      const mockProvider = {};
      vi.mocked(createBillingProvider).mockReturnValue(mockProvider as never);
      vi.mocked(syncPlanToStripe).mockResolvedValue({
        stripePriceId: 'price_123',
        stripeProductId: 'prod_123',
      });

      const req = createMockRequest();
      await handleAdminSyncPlanToStripe(mockCtx, undefined, req, { id: 'plan-123' });

      expect(createBillingProvider).toHaveBeenCalledWith(mockCtx.config.billing);
    });
  });

  describe('when billing is not enabled', () => {
    test('should return 500 with error message', async () => {
      mockCtx = createMockContext({ billing: { enabled: false } as never });

      const req = createMockRequest();
      const result = await handleAdminSyncPlanToStripe(mockCtx, undefined, req, {
        id: 'plan-123',
      });

      expect(result.status).toBe(500);
      expect('body' in result && result.body.message).toBe('Billing is not enabled');
    });
  });

  describe('when plan is not found', () => {
    test('should return 404 with not found message', async () => {
      const { syncPlanToStripe } = await import('./billingService');
      const { createBillingProvider } = await import('@abe-stack/billing');
      vi.mocked(createBillingProvider).mockReturnValue({} as never);
      vi.mocked(syncPlanToStripe).mockRejectedValue(new PlanNotFoundError('plan-123'));

      const req = createMockRequest();
      const result = await handleAdminSyncPlanToStripe(mockCtx, undefined, req, {
        id: 'plan-123',
      });

      expect(result.status).toBe(404);
      expect('body' in result && result.body.message).toBe('Plan not found: plan-123');
    });
  });

  describe('when billing provider is not configured', () => {
    test('should return 500 with configuration error message', async () => {
      const { syncPlanToStripe } = await import('./billingService');
      const { createBillingProvider } = await import('@abe-stack/billing');
      vi.mocked(createBillingProvider).mockReturnValue({} as never);
      vi.mocked(syncPlanToStripe).mockRejectedValue(
        new BillingProviderNotConfiguredError('stripe'),
      );

      const req = createMockRequest();
      const result = await handleAdminSyncPlanToStripe(mockCtx, undefined, req, {
        id: 'plan-123',
      });

      expect(result.status).toBe(500);
      expect('body' in result && result.body.message).toBe('Billing service is not configured');
    });
  });

  describe('when errors occur', () => {
    test('should return 500 for Stripe API errors', async () => {
      const { syncPlanToStripe } = await import('./billingService');
      const { createBillingProvider } = await import('@abe-stack/billing');
      vi.mocked(createBillingProvider).mockReturnValue({} as never);
      vi.mocked(syncPlanToStripe).mockRejectedValue(new Error('Stripe API error'));

      const req = createMockRequest();
      const result = await handleAdminSyncPlanToStripe(mockCtx, undefined, req, {
        id: 'plan-123',
      });

      expect(result.status).toBe(500);
      expect(mockCtx.log.error).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Tests: handleAdminDeactivatePlan
// ============================================================================

describe('handleAdminDeactivatePlan', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  describe('when deactivating a plan successfully', () => {
    test('should return 200 with success message', async () => {
      const { deactivatePlan } = await import('./billingService');
      vi.mocked(deactivatePlan).mockResolvedValue(undefined);

      const req = createMockRequest();
      const result = await handleAdminDeactivatePlan(mockCtx, undefined, req, { id: 'plan-123' });

      expect(result.status).toBe(200);
      expect('body' in result && result.body.success).toBe(true);
      expect('body' in result && result.body.message).toBe('Plan deactivated successfully');
      expect(deactivatePlan).toHaveBeenCalledWith(
        {
          plans: mockCtx.repos.plans,
          subscriptions: mockCtx.repos.subscriptions,
        },
        'plan-123',
      );
    });
  });

  describe('when plan is not found', () => {
    test('should return 404 with not found message', async () => {
      const { deactivatePlan } = await import('./billingService');
      vi.mocked(deactivatePlan).mockRejectedValue(new PlanNotFoundError('nonexistent-plan'));

      const req = createMockRequest();
      const result = await handleAdminDeactivatePlan(mockCtx, undefined, req, {
        id: 'nonexistent-plan',
      });

      expect(result.status).toBe(404);
      expect('body' in result && result.body.message).toBe('Plan not found: nonexistent-plan');
    });
  });

  describe('when plan has active subscriptions', () => {
    test('should return 400 with error message about active subscriptions', async () => {
      const { deactivatePlan } = await import('./billingService');
      vi.mocked(deactivatePlan).mockRejectedValue(
        new CannotDeactivatePlanWithActiveSubscriptionsError('plan-123', 5),
      );

      const req = createMockRequest();
      const result = await handleAdminDeactivatePlan(mockCtx, undefined, req, { id: 'plan-123' });

      expect(result.status).toBe(400);
      expect('body' in result && result.body.message).toBe(
        'Cannot deactivate plan plan-123: 5 active subscription(s) exist',
      );
    });

    test('should return 400 and include subscription count in error message', async () => {
      const { deactivatePlan } = await import('./billingService');
      const error = new CannotDeactivatePlanWithActiveSubscriptionsError('plan-123', 15);
      vi.mocked(deactivatePlan).mockRejectedValue(error);

      const req = createMockRequest();
      const result = await handleAdminDeactivatePlan(mockCtx, undefined, req, { id: 'plan-123' });

      expect(result.status).toBe(400);
      expect('body' in result && result.body.message).toBe(
        'Cannot deactivate plan plan-123: 15 active subscription(s) exist',
      );
    });
  });

  describe('when errors occur', () => {
    test('should return 500 for database errors', async () => {
      const { deactivatePlan } = await import('./billingService');
      vi.mocked(deactivatePlan).mockRejectedValue(new Error('Database connection lost'));

      const req = createMockRequest();
      const result = await handleAdminDeactivatePlan(mockCtx, undefined, req, { id: 'plan-123' });

      expect(result.status).toBe(500);
      expect(mockCtx.log.error).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Tests: Error Handling Edge Cases
// ============================================================================

describe('Error Handling', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  describe('when handling various error types', () => {
    test('should log error objects correctly', async () => {
      const { getAllPlans } = await import('./billingService');
      const customError = new Error('Custom error message');
      vi.mocked(getAllPlans).mockRejectedValue(customError);

      const req = createMockRequest();
      await handleAdminListPlans(mockCtx, undefined, req);

      expect(mockCtx.log.error).toHaveBeenCalledWith(customError);
    });

    test('should convert non-Error values to Error before logging', async () => {
      const { getAllPlans } = await import('./billingService');
      vi.mocked(getAllPlans).mockRejectedValue({ message: 'Object error' });

      const req = createMockRequest();
      await handleAdminListPlans(mockCtx, undefined, req);

      expect(mockCtx.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '[object Object]',
        }),
      );
    });

    test('should not log PlanNotFoundError (handled error)', async () => {
      const { getPlanById } = await import('./billingService');
      vi.mocked(getPlanById).mockRejectedValue(new PlanNotFoundError('plan-123'));

      const req = createMockRequest();
      await handleAdminGetPlan(mockCtx, undefined, req, { id: 'plan-123' });

      // Handled errors should not be logged
      expect(mockCtx.log.error).not.toHaveBeenCalled();
    });

    test('should not log CannotDeactivatePlanWithActiveSubscriptionsError (handled error)', async () => {
      const { deactivatePlan } = await import('./billingService');
      vi.mocked(deactivatePlan).mockRejectedValue(
        new CannotDeactivatePlanWithActiveSubscriptionsError('plan-123', 3),
      );

      const req = createMockRequest();
      await handleAdminDeactivatePlan(mockCtx, undefined, req, { id: 'plan-123' });

      // Handled errors should not be logged
      expect(mockCtx.log.error).not.toHaveBeenCalled();
    });

    test('should not log BillingProviderNotConfiguredError (handled error)', async () => {
      const { syncPlanToStripe } = await import('./billingService');
      const { createBillingProvider } = await import('@abe-stack/billing');
      vi.mocked(createBillingProvider).mockReturnValue({} as never);
      vi.mocked(syncPlanToStripe).mockRejectedValue(
        new BillingProviderNotConfiguredError('stripe'),
      );

      const req = createMockRequest();
      await handleAdminSyncPlanToStripe(mockCtx, undefined, req, { id: 'plan-123' });

      // Handled errors should not be logged
      expect(mockCtx.log.error).not.toHaveBeenCalled();
    });
  });
});
