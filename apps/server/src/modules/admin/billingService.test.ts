// apps/server/src/modules/admin/billingService.test.ts
/**
 * Admin Billing Service Tests
 *
 * Comprehensive unit tests for admin plan management operations including
 * plan CRUD operations, deactivation validation, and Stripe synchronization.
 */

import {
  CannotDeactivatePlanWithActiveSubscriptionsError,
  PlanNotFoundError,
} from '@abe-stack/core';
/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createPlan,
  deactivatePlan,
  getAllPlans,
  getPlanById,
  syncPlanToStripe,
  updatePlan,
} from './billingService';

import type {
  AdminBillingRepositories,
  CreatePlanParams,
  UpdatePlanParams,
} from './billingService';
import type { BillingService } from '@abe-stack/core';
import type { Plan as DbPlan, PlanRepository, SubscriptionRepository } from '@abe-stack/db';

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * Create a mock Plan object with reasonable defaults
 */
function createMockPlan(overrides: Partial<DbPlan> = {}): DbPlan {
  return {
    id: 'plan-123',
    name: 'Pro Plan',
    description: 'Professional plan with advanced features',
    interval: 'month',
    priceInCents: 2999,
    currency: 'usd',
    features: [
      { name: 'Unlimited API calls', included: true, description: 'No rate limits' },
      { name: 'Priority support', included: true },
    ],
    trialDays: 14,
    stripePriceId: 'price_123',
    stripeProductId: 'prod_123',
    paypalPlanId: null,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Create a mock PlanRepository with all methods stubbed
 */
function createMockPlanRepository(): PlanRepository {
  return {
    findById: vi.fn(),
    findByStripeProductId: vi.fn(),
    findByStripePriceId: vi.fn(),
    findByPaypalPlanId: vi.fn(),
    listAll: vi.fn(),
    listActive: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    delete: vi.fn(),
  } as unknown as PlanRepository;
}

/**
 * Create a mock SubscriptionRepository with all methods stubbed
 */
function createMockSubscriptionRepository(): SubscriptionRepository {
  return {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByProviderSubscriptionId: vi.fn(),
    listByUserId: vi.fn(),
    countActiveByPlanId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as SubscriptionRepository;
}

/**
 * Create a mock BillingService (Stripe provider)
 */
function createMockBillingService(): BillingService {
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
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    archivePrice: vi.fn(),
    verifyWebhookSignature: vi.fn(),
    parseWebhookEvent: vi.fn(),
  } as unknown as BillingService;
}

/**
 * Create complete mock repositories object
 */
function createMockRepositories(): AdminBillingRepositories {
  return {
    plans: createMockPlanRepository(),
    subscriptions: createMockSubscriptionRepository(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Admin Billing Service', () => {
  let mockRepos: AdminBillingRepositories;

  beforeEach(() => {
    mockRepos = createMockRepositories();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // getAllPlans
  // ==========================================================================

  describe('getAllPlans', () => {
    test('should return all plans including inactive', async () => {
      const mockPlans = [
        createMockPlan({ id: 'plan-1', isActive: true }),
        createMockPlan({ id: 'plan-2', isActive: false }),
        createMockPlan({ id: 'plan-3', isActive: true }),
      ];
      vi.mocked(mockRepos.plans.listAll).mockResolvedValue(mockPlans);

      const result = await getAllPlans(mockRepos);

      expect(result).toEqual(mockPlans);
      expect(result).toHaveLength(3);
      expect(mockRepos.plans.listAll).toHaveBeenCalledOnce();
    });

    test('should return empty array when no plans exist', async () => {
      vi.mocked(mockRepos.plans.listAll).mockResolvedValue([]);

      const result = await getAllPlans(mockRepos);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test('should not filter by active status', async () => {
      const mockPlans = [createMockPlan({ isActive: false })];
      vi.mocked(mockRepos.plans.listAll).mockResolvedValue(mockPlans);

      const result = await getAllPlans(mockRepos);

      expect(result[0]?.isActive).toBe(false);
      expect(mockRepos.plans.listAll).toHaveBeenCalledOnce();
    });
  });

  // ==========================================================================
  // getPlanById
  // ==========================================================================

  describe('getPlanById', () => {
    test('should return plan when found', async () => {
      const mockPlan = createMockPlan();
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(mockPlan);

      const result = await getPlanById(mockRepos, 'plan-123');

      expect(result).toEqual(mockPlan);
      expect(mockRepos.plans.findById).toHaveBeenCalledWith('plan-123');
    });

    test('should throw PlanNotFoundError when plan is null', async () => {
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(null);

      await expect(getPlanById(mockRepos, 'nonexistent')).rejects.toThrow(PlanNotFoundError);
      await expect(getPlanById(mockRepos, 'nonexistent')).rejects.toThrow(
        'Plan not found: nonexistent',
      );
    });

    test('should throw PlanNotFoundError when plan is undefined', async () => {
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(undefined as never);

      await expect(getPlanById(mockRepos, 'nonexistent')).rejects.toThrow(PlanNotFoundError);
    });
  });

  // ==========================================================================
  // createPlan
  // ==========================================================================

  describe('createPlan', () => {
    test('should create plan with all required fields', async () => {
      const params: CreatePlanParams = {
        name: 'Enterprise Plan',
        interval: 'year',
        priceInCents: 99900,
      };
      const createdPlan = createMockPlan({
        name: 'Enterprise Plan',
        interval: 'year',
        priceInCents: 99900,
      });
      vi.mocked(mockRepos.plans.create).mockResolvedValue(createdPlan);

      const result = await createPlan(mockRepos, params);

      expect(result).toEqual(createdPlan);
      expect(mockRepos.plans.create).toHaveBeenCalledWith({
        name: 'Enterprise Plan',
        description: null,
        interval: 'year',
        priceInCents: 99900,
        currency: 'usd',
        features: [],
        trialDays: 0,
        isActive: true,
        sortOrder: 0,
        stripePriceId: null,
        stripeProductId: null,
        paypalPlanId: null,
      });
    });

    test('should create plan with optional fields', async () => {
      const params: CreatePlanParams = {
        name: 'Startup Plan',
        description: 'Perfect for startups',
        interval: 'month',
        priceInCents: 4900,
        currency: 'eur',
        features: [
          { name: 'API Access', included: true, description: 'Full API' },
          { name: 'Support', included: false },
        ],
        trialDays: 30,
        isActive: false,
        sortOrder: 5,
      };
      const createdPlan = createMockPlan(params);
      vi.mocked(mockRepos.plans.create).mockResolvedValue(createdPlan);

      const result = await createPlan(mockRepos, params);

      expect(result.description).toBe('Perfect for startups');
      expect(result.currency).toBe('eur');
      expect(result.features).toHaveLength(2);
      expect(result.trialDays).toBe(30);
      expect(result.isActive).toBe(false);
      expect(result.sortOrder).toBe(5);
      expect(mockRepos.plans.create).toHaveBeenCalledWith({
        name: 'Startup Plan',
        description: 'Perfect for startups',
        interval: 'month',
        priceInCents: 4900,
        currency: 'eur',
        features: params.features,
        trialDays: 30,
        isActive: false,
        sortOrder: 5,
        stripePriceId: null,
        stripeProductId: null,
        paypalPlanId: null,
      });
    });

    test('should use default values when optional fields omitted', async () => {
      const params: CreatePlanParams = {
        name: 'Basic Plan',
        interval: 'month',
        priceInCents: 999,
      };
      const createdPlan = createMockPlan();
      vi.mocked(mockRepos.plans.create).mockResolvedValue(createdPlan);

      await createPlan(mockRepos, params);

      expect(mockRepos.plans.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
          currency: 'usd',
          features: [],
          trialDays: 0,
          isActive: true,
          sortOrder: 0,
        }),
      );
    });

    test('should set provider IDs to null initially', async () => {
      const params: CreatePlanParams = {
        name: 'New Plan',
        interval: 'month',
        priceInCents: 1999,
      };
      const createdPlan = createMockPlan({ stripePriceId: null, stripeProductId: null });
      vi.mocked(mockRepos.plans.create).mockResolvedValue(createdPlan);

      await createPlan(mockRepos, params);

      expect(mockRepos.plans.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stripePriceId: null,
          stripeProductId: null,
          paypalPlanId: null,
        }),
      );
    });
  });

  // ==========================================================================
  // updatePlan
  // ==========================================================================

  describe('updatePlan', () => {
    test('should update plan when it exists', async () => {
      const existingPlan = createMockPlan();
      const updatedPlan = createMockPlan({ name: 'Updated Plan' });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.plans.update).mockResolvedValue(updatedPlan);

      const params: UpdatePlanParams = { name: 'Updated Plan' };
      const result = await updatePlan(mockRepos, 'plan-123', params);

      expect(result.name).toBe('Updated Plan');
      expect(mockRepos.plans.findById).toHaveBeenCalledWith('plan-123');
      expect(mockRepos.plans.update).toHaveBeenCalledWith('plan-123', params);
    });

    test('should throw PlanNotFoundError when plan not found before update', async () => {
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(null);

      const params: UpdatePlanParams = { name: 'New Name' };
      await expect(updatePlan(mockRepos, 'nonexistent', params)).rejects.toThrow(
        PlanNotFoundError,
      );
    });

    test('should throw PlanNotFoundError when update returns null', async () => {
      const existingPlan = createMockPlan();
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.plans.update).mockResolvedValue(null);

      const params: UpdatePlanParams = { name: 'Updated Name' };
      await expect(updatePlan(mockRepos, 'plan-123', params)).rejects.toThrow(PlanNotFoundError);
    });

    test('should update multiple fields', async () => {
      const existingPlan = createMockPlan();
      const updatedPlan = createMockPlan({
        name: 'Pro Plus',
        priceInCents: 3999,
        trialDays: 21,
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.plans.update).mockResolvedValue(updatedPlan);

      const params: UpdatePlanParams = {
        name: 'Pro Plus',
        priceInCents: 3999,
        trialDays: 21,
      };
      const result = await updatePlan(mockRepos, 'plan-123', params);

      expect(result.name).toBe('Pro Plus');
      expect(result.priceInCents).toBe(3999);
      expect(result.trialDays).toBe(21);
    });

    test('should allow setting description to null', async () => {
      const existingPlan = createMockPlan({ description: 'Old description' });
      const updatedPlan = createMockPlan({ description: null });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.plans.update).mockResolvedValue(updatedPlan);

      const params: UpdatePlanParams = { description: null };
      await updatePlan(mockRepos, 'plan-123', params);

      expect(mockRepos.plans.update).toHaveBeenCalledWith('plan-123', { description: null });
    });

    test('should update plan features array', async () => {
      const existingPlan = createMockPlan();
      const newFeatures = [
        { name: 'New Feature 1', included: true },
        { name: 'New Feature 2', included: false, description: 'Paid add-on' },
      ];
      const updatedPlan = createMockPlan({ features: newFeatures });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.plans.update).mockResolvedValue(updatedPlan);

      const params: UpdatePlanParams = { features: newFeatures };
      const result = await updatePlan(mockRepos, 'plan-123', params);

      expect(result.features).toEqual(newFeatures);
      expect(mockRepos.plans.update).toHaveBeenCalledWith('plan-123', { features: newFeatures });
    });

    test('should update interval and price together', async () => {
      const existingPlan = createMockPlan({ interval: 'month', priceInCents: 2999 });
      const updatedPlan = createMockPlan({ interval: 'year', priceInCents: 29990 });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.plans.update).mockResolvedValue(updatedPlan);

      const params: UpdatePlanParams = { interval: 'year', priceInCents: 29990 };
      const result = await updatePlan(mockRepos, 'plan-123', params);

      expect(result.interval).toBe('year');
      expect(result.priceInCents).toBe(29990);
    });

    test('should update isActive status', async () => {
      const existingPlan = createMockPlan({ isActive: true });
      const updatedPlan = createMockPlan({ isActive: false });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.plans.update).mockResolvedValue(updatedPlan);

      const params: UpdatePlanParams = { isActive: false };
      const result = await updatePlan(mockRepos, 'plan-123', params);

      expect(result.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // deactivatePlan
  // ==========================================================================

  describe('deactivatePlan', () => {
    test('should deactivate plan when no active subscriptions', async () => {
      const existingPlan = createMockPlan();
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.subscriptions.countActiveByPlanId).mockResolvedValue(0);
      vi.mocked(mockRepos.plans.deactivate).mockResolvedValue(existingPlan);

      await deactivatePlan(mockRepos, 'plan-123');

      expect(mockRepos.plans.findById).toHaveBeenCalledWith('plan-123');
      expect(mockRepos.subscriptions.countActiveByPlanId).toHaveBeenCalledWith('plan-123');
      expect(mockRepos.plans.deactivate).toHaveBeenCalledWith('plan-123');
    });

    test('should throw PlanNotFoundError when plan does not exist', async () => {
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(null);

      await expect(deactivatePlan(mockRepos, 'nonexistent')).rejects.toThrow(PlanNotFoundError);
      expect(mockRepos.subscriptions.countActiveByPlanId).not.toHaveBeenCalled();
      expect(mockRepos.plans.deactivate).not.toHaveBeenCalled();
    });

    test('should throw error when plan has 1 active subscription', async () => {
      const existingPlan = createMockPlan();
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.subscriptions.countActiveByPlanId).mockResolvedValue(1);

      await expect(deactivatePlan(mockRepos, 'plan-123')).rejects.toThrow(
        CannotDeactivatePlanWithActiveSubscriptionsError,
      );
      expect(mockRepos.plans.deactivate).not.toHaveBeenCalled();
    });

    test('should throw error when plan has multiple active subscriptions', async () => {
      const existingPlan = createMockPlan();
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.subscriptions.countActiveByPlanId).mockResolvedValue(5);

      await expect(deactivatePlan(mockRepos, 'plan-123')).rejects.toThrow(
        CannotDeactivatePlanWithActiveSubscriptionsError,
      );
      await expect(deactivatePlan(mockRepos, 'plan-123')).rejects.toThrow(
        'Cannot deactivate plan plan-123: 5 active subscription(s) exist',
      );
      expect(mockRepos.plans.deactivate).not.toHaveBeenCalled();
    });

    test('should check for active subscriptions before deactivating', async () => {
      const existingPlan = createMockPlan();
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.subscriptions.countActiveByPlanId).mockResolvedValue(0);
      vi.mocked(mockRepos.plans.deactivate).mockResolvedValue(existingPlan);

      await deactivatePlan(mockRepos, 'plan-123');

      const mockSubscriptions = vi.mocked(mockRepos.subscriptions.countActiveByPlanId);
      expect(mockSubscriptions).toHaveBeenCalledBefore(
        vi.mocked(mockRepos.plans.deactivate) as never,
      );
    });
  });

  // ==========================================================================
  // syncPlanToStripe
  // ==========================================================================

  describe('syncPlanToStripe', () => {
    let mockProvider: BillingService;

    beforeEach(() => {
      mockProvider = createMockBillingService();
    });

    test('should create new Stripe product when none exists', async () => {
      const existingPlan = createMockPlan({
        stripePriceId: null,
        stripeProductId: null,
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockProvider.createProduct).mockResolvedValue({
        productId: 'prod_new123',
        priceId: 'price_new123',
      });
      vi.mocked(mockRepos.plans.update).mockResolvedValue(
        createMockPlan({ stripeProductId: 'prod_new123', stripePriceId: 'price_new123' }),
      );

      const result = await syncPlanToStripe(mockRepos, mockProvider, 'plan-123');

      expect(result).toEqual({
        stripePriceId: 'price_new123',
        stripeProductId: 'prod_new123',
      });
      expect(mockProvider.createProduct).toHaveBeenCalledWith({
        name: existingPlan.name,
        description: existingPlan.description ?? undefined,
        interval: existingPlan.interval,
        priceInCents: existingPlan.priceInCents,
        currency: existingPlan.currency,
        metadata: { planId: existingPlan.id },
      });
      expect(mockRepos.plans.update).toHaveBeenCalledWith('plan-123', {
        stripeProductId: 'prod_new123',
        stripePriceId: 'price_new123',
      });
    });

    test('should update existing Stripe product when productId exists', async () => {
      const existingPlan = createMockPlan({
        stripeProductId: 'prod_existing',
        stripePriceId: 'price_existing',
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockProvider.updateProduct).mockResolvedValue();

      const result = await syncPlanToStripe(mockRepos, mockProvider, 'plan-123');

      expect(result).toEqual({
        stripePriceId: 'price_existing',
        stripeProductId: 'prod_existing',
      });
      expect(mockProvider.updateProduct).toHaveBeenCalledWith(
        'prod_existing',
        existingPlan.name,
        existingPlan.description ?? undefined,
      );
      expect(mockProvider.createProduct).not.toHaveBeenCalled();
      expect(mockRepos.plans.update).not.toHaveBeenCalled();
    });

    test('should throw PlanNotFoundError when plan does not exist', async () => {
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(null);

      await expect(syncPlanToStripe(mockRepos, mockProvider, 'nonexistent')).rejects.toThrow(
        PlanNotFoundError,
      );
      expect(mockProvider.createProduct).not.toHaveBeenCalled();
      expect(mockProvider.updateProduct).not.toHaveBeenCalled();
    });

    test('should handle plan with null description correctly', async () => {
      const existingPlan = createMockPlan({
        description: null,
        stripePriceId: null,
        stripeProductId: null,
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockProvider.createProduct).mockResolvedValue({
        productId: 'prod_123',
        priceId: 'price_123',
      });
      vi.mocked(mockRepos.plans.update).mockResolvedValue(existingPlan);

      await syncPlanToStripe(mockRepos, mockProvider, 'plan-123');

      expect(mockProvider.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
        }),
      );
    });

    test('should include plan metadata in product creation', async () => {
      const existingPlan = createMockPlan({
        id: 'plan-custom-123',
        stripePriceId: null,
        stripeProductId: null,
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockProvider.createProduct).mockResolvedValue({
        productId: 'prod_123',
        priceId: 'price_123',
      });
      vi.mocked(mockRepos.plans.update).mockResolvedValue(existingPlan);

      await syncPlanToStripe(mockRepos, mockProvider, 'plan-custom-123');

      expect(mockProvider.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { planId: 'plan-custom-123' },
        }),
      );
    });

    test('should handle empty string productId as null', async () => {
      const existingPlan = createMockPlan({
        stripeProductId: '',
        stripePriceId: null,
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockProvider.createProduct).mockResolvedValue({
        productId: 'prod_new',
        priceId: 'price_new',
      });
      vi.mocked(mockRepos.plans.update).mockResolvedValue(existingPlan);

      await syncPlanToStripe(mockRepos, mockProvider, 'plan-123');

      expect(mockProvider.createProduct).toHaveBeenCalled();
      expect(mockProvider.updateProduct).not.toHaveBeenCalled();
    });

    test('should return empty string for priceId when null on update path', async () => {
      const existingPlan = createMockPlan({
        stripeProductId: 'prod_existing',
        stripePriceId: null,
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockProvider.updateProduct).mockResolvedValue();

      const result = await syncPlanToStripe(mockRepos, mockProvider, 'plan-123');

      expect(result.stripePriceId).toBe('');
      expect(result.stripeProductId).toBe('prod_existing');
    });

    test('should pass all plan properties to createProduct', async () => {
      const existingPlan = createMockPlan({
        name: 'Ultimate Plan',
        description: 'Best plan ever',
        interval: 'year',
        priceInCents: 99999,
        currency: 'eur',
        stripePriceId: null,
        stripeProductId: null,
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockProvider.createProduct).mockResolvedValue({
        productId: 'prod_123',
        priceId: 'price_123',
      });
      vi.mocked(mockRepos.plans.update).mockResolvedValue(existingPlan);

      await syncPlanToStripe(mockRepos, mockProvider, 'plan-123');

      expect(mockProvider.createProduct).toHaveBeenCalledWith({
        name: 'Ultimate Plan',
        description: 'Best plan ever',
        interval: 'year',
        priceInCents: 99999,
        currency: 'eur',
        metadata: { planId: existingPlan.id },
      });
    });
  });

  // ==========================================================================
  // Edge Cases & Integration
  // ==========================================================================

  describe('edge cases', () => {
    test('createPlan should handle zero price', async () => {
      const params: CreatePlanParams = {
        name: 'Free Plan',
        interval: 'month',
        priceInCents: 0,
      };
      const createdPlan = createMockPlan({ priceInCents: 0 });
      vi.mocked(mockRepos.plans.create).mockResolvedValue(createdPlan);

      const result = await createPlan(mockRepos, params);

      expect(result.priceInCents).toBe(0);
    });

    test('updatePlan should handle empty features array', async () => {
      const existingPlan = createMockPlan({
        features: [{ name: 'Feature 1', included: true }],
      });
      const updatedPlan = createMockPlan({ features: [] });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.plans.update).mockResolvedValue(updatedPlan);

      const params: UpdatePlanParams = { features: [] };
      const result = await updatePlan(mockRepos, 'plan-123', params);

      expect(result.features).toEqual([]);
    });

    test('syncPlanToStripe should handle very long plan names', async () => {
      const longName = 'A'.repeat(200);
      const mockProvider = createMockBillingService();
      const existingPlan = createMockPlan({
        name: longName,
        stripePriceId: null,
        stripeProductId: null,
      });
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockProvider.createProduct).mockResolvedValue({
        productId: 'prod_123',
        priceId: 'price_123',
      });
      vi.mocked(mockRepos.plans.update).mockResolvedValue(existingPlan);

      await syncPlanToStripe(mockRepos, mockProvider, 'plan-123');

      expect(mockProvider.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: longName,
        }),
      );
    });

    test('deactivatePlan should handle boundary case of exactly 0 subscriptions', async () => {
      const existingPlan = createMockPlan();
      vi.mocked(mockRepos.plans.findById).mockResolvedValue(existingPlan);
      vi.mocked(mockRepos.subscriptions.countActiveByPlanId).mockResolvedValue(0);
      vi.mocked(mockRepos.plans.deactivate).mockResolvedValue(existingPlan);

      await expect(deactivatePlan(mockRepos, 'plan-123')).resolves.toBeUndefined();
    });
  });
});
