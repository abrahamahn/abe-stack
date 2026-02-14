// main/server/db/src/repositories/billing/plans.test.ts
/**
 * Tests for Plans Repository
 *
 * Validates billing plan CRUD operations including provider-specific lookups,
 * activation/deactivation workflows, and JSONB feature handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createPlanRepository } from './plans';

import type { RawDb } from '../../client';
import type { Plan, NewPlan, UpdatePlan, PlanFeature } from '../../schema/index';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  raw: vi.fn() as RawDb['raw'],
  transaction: vi.fn() as RawDb['transaction'],
  healthCheck: vi.fn(),
  close: vi.fn(),
  getClient: vi.fn() as RawDb['getClient'],
  queryOne: vi.fn(),
  execute: vi.fn(),
});

// ============================================================================
// Test Data
// ============================================================================

const mockFeatures: PlanFeature[] = [
  { name: 'Unlimited storage', included: true },
  { name: 'Priority support', included: true, description: '24/7 email support' },
  { name: 'Advanced analytics', included: false },
];

const mockPlan: Plan = {
  id: 'plan-123',
  name: 'Pro Plan',
  description: 'Professional tier with advanced features',
  interval: 'month',
  priceInCents: 1999,
  currency: 'usd',
  features: mockFeatures,
  trialDays: 14,
  stripePriceId: 'price_stripe_123',
  stripeProductId: 'prod_stripe_123',
  paypalPlanId: 'plan_paypal_123',
  isActive: true,
  sortOrder: 2,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

const mockDbRow = {
  id: 'plan-123',
  name: 'Pro Plan',
  description: 'Professional tier with advanced features',
  interval: 'month',
  price_in_cents: 1999,
  currency: 'usd',
  features: JSON.stringify(mockFeatures),
  trial_days: 14,
  stripe_price_id: 'price_stripe_123',
  stripe_product_id: 'prod_stripe_123',
  paypal_plan_id: 'plan_paypal_123',
  is_active: true,
  sort_order: 2,
  created_at: new Date('2024-01-01T10:00:00Z'),
  updated_at: new Date('2024-01-01T10:00:00Z'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createPlanRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return plan when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result).toEqual(mockPlan);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('plans'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should parse JSONB features correctly', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.features).toEqual(mockFeatures);
      expect(Array.isArray(result?.features)).toBe(true);
    });

    it('should handle null features as empty array', async () => {
      const rowWithNullFeatures = { ...mockDbRow, features: null };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithNullFeatures);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.features).toEqual([]);
    });
  });

  describe('findByStripePriceId', () => {
    it('should return plan when found by Stripe price ID', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findByStripePriceId('price_stripe_123');

      expect(result).toEqual(mockPlan);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('stripe_price_id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findByStripePriceId('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle plans without Stripe integration', async () => {
      const rowWithoutStripe = {
        ...mockDbRow,
        stripe_price_id: null,
        stripe_product_id: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithoutStripe);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findByStripePriceId('price_stripe_123');

      expect(result?.stripePriceId).toBeNull();
      expect(result?.stripeProductId).toBeNull();
    });
  });

  describe('findByPaypalPlanId', () => {
    it('should return plan when found by PayPal plan ID', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findByPaypalPlanId('plan_paypal_123');

      expect(result).toEqual(mockPlan);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('paypal_plan_id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findByPaypalPlanId('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle plans without PayPal integration', async () => {
      const rowWithoutPaypal = { ...mockDbRow, paypal_plan_id: null };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithoutPaypal);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findByPaypalPlanId('plan_paypal_123');

      expect(result?.paypalPlanId).toBeNull();
    });
  });

  describe('listActive', () => {
    it('should return only active plans', async () => {
      const plans = [mockDbRow, { ...mockDbRow, id: 'plan-456', is_active: true }];
      vi.mocked(mockDb.query).mockResolvedValue(plans);

      const repo = createPlanRepository(mockDb);
      const result = await repo.listActive();

      expect(result).toHaveLength(2);
      expect(result.every((plan) => plan.isActive)).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('is_active'),
        }),
      );
    });

    it('should order by sort_order then price_in_cents ascending', async () => {
      const plans = [
        { ...mockDbRow, id: 'plan-1', sort_order: 1, price_in_cents: 999 },
        { ...mockDbRow, id: 'plan-2', sort_order: 2, price_in_cents: 1999 },
        { ...mockDbRow, id: 'plan-3', sort_order: 1, price_in_cents: 1999 },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(plans);

      const repo = createPlanRepository(mockDb);
      await repo.listActive();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*sort_order.*price_in_cents/s),
        }),
      );
    });

    it('should return empty array when no active plans exist', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createPlanRepository(mockDb);
      const result = await repo.listActive();

      expect(result).toEqual([]);
    });

    it('should parse features for all plans in list', async () => {
      const plans = [mockDbRow, { ...mockDbRow, id: 'plan-456' }];
      vi.mocked(mockDb.query).mockResolvedValue(plans);

      const repo = createPlanRepository(mockDb);
      const result = await repo.listActive();

      expect(result[0].features).toEqual(mockFeatures);
      expect(result[1].features).toEqual(mockFeatures);
    });
  });

  describe('listAll', () => {
    it('should return all plans including inactive', async () => {
      const plans = [
        mockDbRow,
        { ...mockDbRow, id: 'plan-456', is_active: false },
        { ...mockDbRow, id: 'plan-789', is_active: true },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(plans);

      const repo = createPlanRepository(mockDb);
      const result = await repo.listAll();

      expect(result).toHaveLength(3);
      expect(result.some((plan) => !plan.isActive)).toBe(true);
      expect(result.some((plan) => plan.isActive)).toBe(true);
    });

    it('should order by sort_order then price_in_cents ascending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);

      const repo = createPlanRepository(mockDb);
      await repo.listAll();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*sort_order.*price_in_cents/s),
        }),
      );
    });

    it('should return empty array when no plans exist', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createPlanRepository(mockDb);
      const result = await repo.listAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return new plan', async () => {
      const newPlan: NewPlan = {
        name: 'Enterprise Plan',
        description: 'For large organizations',
        interval: 'year',
        priceInCents: 19999,
        currency: 'usd',
        features: mockFeatures,
        trialDays: 30,
        isActive: true,
        sortOrder: 3,
      };

      const createdRow = {
        ...mockDbRow,
        id: 'plan-new',
        name: 'Enterprise Plan',
        description: 'For large organizations',
        interval: 'year',
        price_in_cents: 19999,
        trial_days: 30,
        sort_order: 3,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(createdRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.create(newPlan);

      expect(result?.name).toBe('Enterprise Plan');
      expect(result.interval).toBe('year');
      expect(result.priceInCents).toBe(19999);
      expect(result.features).toEqual(mockFeatures);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should stringify features array for storage', async () => {
      const newPlan: NewPlan = {
        name: 'Basic Plan',
        interval: 'month',
        priceInCents: 999,
        features: mockFeatures,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createPlanRepository(mockDb);
      await repo.create(newPlan);

      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    it('should handle plan with minimal required fields', async () => {
      const minimalPlan: NewPlan = {
        name: 'Minimal Plan',
        interval: 'month',
        priceInCents: 0,
      };

      const minimalRow = {
        ...mockDbRow,
        id: 'plan-minimal',
        name: 'Minimal Plan',
        description: null,
        features: JSON.stringify([]),
        trial_days: 0,
        stripe_price_id: null,
        stripe_product_id: null,
        paypal_plan_id: null,
        is_active: false,
        sort_order: 0,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(minimalRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.create(minimalPlan);

      expect(result?.name).toBe('Minimal Plan');
      expect(result.description).toBeNull();
      expect(result.features).toEqual([]);
    });

    it('should handle plan with custom ID', async () => {
      const planWithId: NewPlan = {
        id: 'custom-plan-id',
        name: 'Custom ID Plan',
        interval: 'month',
        priceInCents: 1999,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        id: 'custom-plan-id',
        name: 'Custom ID Plan',
      });

      const repo = createPlanRepository(mockDb);
      const result = await repo.create(planWithId);

      expect(result.id).toBe('custom-plan-id');
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPlanRepository(mockDb);

      await expect(
        repo.create({
          name: 'Failed Plan',
          interval: 'month',
          priceInCents: 999,
        }),
      ).rejects.toThrow('Failed to create plan');
    });

    it('should handle empty features array', async () => {
      const planWithEmptyFeatures: NewPlan = {
        name: 'No Features Plan',
        interval: 'month',
        priceInCents: 499,
        features: [],
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        features: JSON.stringify([]),
      });

      const repo = createPlanRepository(mockDb);
      const result = await repo.create(planWithEmptyFeatures);

      expect(result.features).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update and return modified plan', async () => {
      const updateData: UpdatePlan = {
        name: 'Pro Plan Updated',
        priceInCents: 2499,
        features: [{ name: 'New Feature', included: true }],
      };

      const updatedRow = {
        ...mockDbRow,
        name: 'Pro Plan Updated',
        price_in_cents: 2499,
        features: JSON.stringify([{ name: 'New Feature', included: true }]),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.update('plan-123', updateData);

      expect(result?.name).toBe('Pro Plan Updated');
      expect(result?.priceInCents).toBe(2499);
      expect(result?.features).toEqual([{ name: 'New Feature', included: true }]);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when plan not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPlanRepository(mockDb);
      const result = await repo.update('nonexistent', { name: 'New Name' });

      expect(result).toBeNull();
    });

    it('should stringify features array when updating', async () => {
      const updateData: UpdatePlan = {
        features: [{ name: 'Updated Feature', included: false }],
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        features: JSON.stringify([{ name: 'Updated Feature', included: false }]),
      });

      const repo = createPlanRepository(mockDb);
      await repo.update('plan-123', updateData);

      expect(mockDb.queryOne).toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      const partialUpdate: UpdatePlan = {
        description: 'Updated description only',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        description: 'Updated description only',
      });

      const repo = createPlanRepository(mockDb);
      const result = await repo.update('plan-123', partialUpdate);

      expect(result?.description).toBe('Updated description only');
      expect(result?.name).toBe('Pro Plan');
    });

    it('should handle updating to null values', async () => {
      const updateToNull: UpdatePlan = {
        description: null,
        stripePriceId: null,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        description: null,
        stripe_price_id: null,
      });

      const repo = createPlanRepository(mockDb);
      const result = await repo.update('plan-123', updateToNull);

      expect(result?.description).toBeNull();
      expect(result?.stripePriceId).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete plan and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createPlanRepository(mockDb);
      const result = await repo.delete('plan-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when plan not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createPlanRepository(mockDb);
      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should perform hard delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createPlanRepository(mockDb);
      await repo.delete('plan-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*plans/),
        }),
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate plan and return updated plan', async () => {
      const deactivatedRow = { ...mockDbRow, is_active: false };
      vi.mocked(mockDb.queryOne).mockResolvedValue(deactivatedRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.deactivate('plan-123');

      expect(result?.isActive).toBe(false);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('is_active'),
        }),
      );
    });

    it('should return null when plan not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPlanRepository(mockDb);
      const result = await repo.deactivate('nonexistent');

      expect(result).toBeNull();
    });

    it('should perform soft delete by setting is_active to false', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ ...mockDbRow, is_active: false });

      const repo = createPlanRepository(mockDb);
      await repo.deactivate('plan-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.not.stringContaining('DELETE FROM'),
        }),
      );
    });
  });

  describe('activate', () => {
    it('should activate plan and return updated plan', async () => {
      const activatedRow = { ...mockDbRow, is_active: true };
      vi.mocked(mockDb.queryOne).mockResolvedValue(activatedRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.activate('plan-123');

      expect(result?.isActive).toBe(true);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('is_active'),
        }),
      );
    });

    it('should return null when plan not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPlanRepository(mockDb);
      const result = await repo.activate('nonexistent');

      expect(result).toBeNull();
    });

    it('should set is_active to true', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ ...mockDbRow, is_active: true });

      const repo = createPlanRepository(mockDb);
      const result = await repo.activate('plan-123');

      expect(result?.isActive).toBe(true);
    });
  });

  describe('existsByName', () => {
    it('should return true when plan with name exists', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ exists: '1' });

      const repo = createPlanRepository(mockDb);
      const result = await repo.existsByName('Pro Plan');

      expect(result).toBe(true);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('name'),
        }),
      );
    });

    it('should return false when plan with name does not exist', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPlanRepository(mockDb);
      const result = await repo.existsByName('Nonexistent Plan');

      expect(result).toBe(false);
    });

    it('should exclude specific plan ID when provided', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPlanRepository(mockDb);
      await repo.existsByName('Pro Plan', 'plan-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('<>'),
          values: expect.arrayContaining(['Pro Plan', 'plan-123']),
        }),
      );
    });

    it('should use NOT EQUAL for excludeId to find other plans with the same name', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPlanRepository(mockDb);
      await repo.existsByName('Pro Plan', 'plan-123');

      const callArgs = vi.mocked(mockDb.queryOne).mock.calls[0][0] as {
        text: string;
        values: unknown[];
      };

      // The SQL must use <> (not equal) for the id column, not = (equal)
      // This ensures we check "does another plan with this name exist?" rather than
      // "does this exact plan exist?"
      expect(callArgs.text).toMatch(/id\s*<>/);
      expect(callArgs.text).not.toMatch(/id\s*=\s*\$/);
    });

    it('should handle empty excludeId parameter', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ exists: '1' });

      const repo = createPlanRepository(mockDb);
      const result = await repo.existsByName('Pro Plan', '');

      expect(result).toBe(true);
    });

    it('should check for name collision during updates', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPlanRepository(mockDb);
      const result = await repo.existsByName('Enterprise Plan', 'plan-456');

      expect(result).toBe(false);
    });
  });

  describe('feature parsing edge cases', () => {
    it('should handle features with all fields', async () => {
      const fullFeatures: PlanFeature[] = [
        {
          name: 'Full Feature',
          included: true,
          description: 'Complete feature description',
        },
      ];

      const rowWithFullFeatures = {
        ...mockDbRow,
        features: JSON.stringify(fullFeatures),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithFullFeatures);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.features).toEqual(fullFeatures);
      expect(result?.features[0].description).toBe('Complete feature description');
    });

    it('should handle features without optional description', async () => {
      const minimalFeatures: PlanFeature[] = [{ name: 'Minimal Feature', included: false }];

      const rowWithMinimalFeatures = {
        ...mockDbRow,
        features: JSON.stringify(minimalFeatures),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithMinimalFeatures);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.features).toEqual(minimalFeatures);
      expect(result?.features[0].description).toBeUndefined();
    });

    it('should handle empty features JSON', async () => {
      const rowWithEmptyFeatures = { ...mockDbRow, features: '[]' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithEmptyFeatures);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.features).toEqual([]);
    });

    it('should handle undefined features in create', async () => {
      const planWithoutFeatures: NewPlan = {
        name: 'No Features',
        interval: 'month',
        priceInCents: 999,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        features: JSON.stringify([]),
      });

      const repo = createPlanRepository(mockDb);
      const result = await repo.create(planWithoutFeatures);

      expect(result.features).toEqual([]);
    });

    it('should handle undefined features in update', async () => {
      const updateWithoutFeatures: UpdatePlan = {
        name: 'Updated Name',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.update('plan-123', updateWithoutFeatures);

      expect(result?.features).toEqual(mockFeatures);
    });
  });

  describe('interval handling', () => {
    it('should handle monthly plans', async () => {
      const monthlyRow = { ...mockDbRow, interval: 'month' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(monthlyRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.interval).toBe('month');
    });

    it('should handle yearly plans', async () => {
      const yearlyRow = { ...mockDbRow, interval: 'year' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(yearlyRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.interval).toBe('year');
    });
  });

  describe('currency handling', () => {
    it('should handle USD currency', async () => {
      const usdRow = { ...mockDbRow, currency: 'usd' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(usdRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.currency).toBe('usd');
    });

    it('should handle other currencies', async () => {
      const eurRow = { ...mockDbRow, currency: 'eur' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(eurRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.currency).toBe('eur');
    });
  });

  describe('price handling', () => {
    it('should handle zero price for free plans', async () => {
      const freeRow = { ...mockDbRow, price_in_cents: 0 };
      vi.mocked(mockDb.queryOne).mockResolvedValue(freeRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.priceInCents).toBe(0);
    });

    it('should handle large prices', async () => {
      const expensiveRow = { ...mockDbRow, price_in_cents: 9999999 };
      vi.mocked(mockDb.queryOne).mockResolvedValue(expensiveRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.priceInCents).toBe(9999999);
    });
  });

  describe('trial days handling', () => {
    it('should handle zero trial days', async () => {
      const noTrialRow = { ...mockDbRow, trial_days: 0 };
      vi.mocked(mockDb.queryOne).mockResolvedValue(noTrialRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.trialDays).toBe(0);
    });

    it('should handle extended trial periods', async () => {
      const longTrialRow = { ...mockDbRow, trial_days: 90 };
      vi.mocked(mockDb.queryOne).mockResolvedValue(longTrialRow);

      const repo = createPlanRepository(mockDb);
      const result = await repo.findById('plan-123');

      expect(result?.trialDays).toBe(90);
    });
  });
});
