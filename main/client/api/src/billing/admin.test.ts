// main/client/api/src/billing/admin.test.ts
/**
 * Admin Billing Client Tests
 *
 * Comprehensive tests for admin billing operations including plan management
 * and Stripe synchronization.
 */

import {
  BadRequestError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  UnauthorizedError,
} from '@abe-stack/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkError } from '../errors';

import { createAdminBillingClient } from './admin';

import type { AdminBillingClientConfig } from './admin';
import type {
  AdminPlan,
  AdminPlanResponse,
  AdminPlansListResponse,
  CreatePlanRequest,
  SubscriptionActionResponse,
  SyncStripeResponse,
  UpdatePlanRequest,
  PlanId,
} from '@abe-stack/shared';

// ============================================================================
// Test Data
// ============================================================================

const mockAdminPlan: AdminPlan = {
  id: 'plan-123' as PlanId,
  name: 'Pro Plan',
  description: 'Professional tier',
  interval: 'month',
  priceInCents: 1999,
  currency: 'USD',
  features: [
    { key: 'team:invite', name: 'Feature 1', included: true },
    { key: 'api:access', name: 'Feature 2', included: true },
  ],
  trialDays: 14,
  isActive: true,
  sortOrder: 1,
  stripePriceId: 'price_stripe123',
  stripeProductId: 'prod_stripe123',
  paypalPlanId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
};

const mockAdminPlan2: AdminPlan = {
  id: 'plan-456' as PlanId,
  name: 'Enterprise Plan',
  description: 'Enterprise tier',
  interval: 'year',
  priceInCents: 19999,
  currency: 'USD',
  features: [
    { key: 'team:invite', name: 'Feature 1', included: true },
    { key: 'api:access', name: 'Feature 2', included: true },
    { key: 'branding:custom', name: 'Feature 3', included: true },
  ],
  trialDays: 30,
  isActive: true,
  sortOrder: 2,
  stripePriceId: 'price_stripe456',
  stripeProductId: 'prod_stripe456',
  paypalPlanId: 'plan_paypal456',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-20T00:00:00Z',
};

// ============================================================================
// createAdminBillingClient Tests
// ============================================================================

describe('createAdminBillingClient', () => {
  const baseUrl = 'http://localhost:3001';
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createClient = (token?: string): ReturnType<typeof createAdminBillingClient> => {
    const config: AdminBillingClientConfig = {
      baseUrl,
      fetchImpl: mockFetch as unknown as typeof fetch,
    };
    if (token !== undefined) {
      config.getToken = () => token;
    }
    return createAdminBillingClient(config);
  };

  describe('listPlans', () => {
    it('should fetch all plans including inactive', async () => {
      const mockResponse: AdminPlansListResponse = {
        plans: [mockAdminPlan, mockAdminPlan2],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('admin-token');
      const result = await client.listPlans();

      expect(result.plans).toHaveLength(2);
      expect(result.plans[0]).toEqual(mockAdminPlan);
      expect(result.plans[1]).toEqual(mockAdminPlan2);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/admin/billing/plans`,
        expect.objectContaining({
          headers: expect.any(Headers),
          credentials: 'include',
        }),
      );

      // Verify auth header
      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer admin-token');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle empty plans list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      const client = createClient('admin-token');
      const result = await client.listPlans();

      expect(result.plans).toEqual([]);
    });

    it('should work without auth token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan] }),
      });

      const client = createClient();
      await client.listPlans();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const headers = call[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should throw UnauthorizedError on 401', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const client = createClient();
      await expect(client.listPlans()).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ForbiddenError on 403', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'Insufficient permissions' }),
      });

      const client = createClient('user-token');
      await expect(client.listPlans()).rejects.toThrow(ForbiddenError);
    });

    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const client = createClient('admin-token');
      await expect(client.listPlans()).rejects.toThrow(NetworkError);
      await expect(client.listPlans()).rejects.toThrow('Failed to fetch GET /admin/billing/plans');
    });

    it('should handle non-Error rejection', async () => {
      mockFetch.mockRejectedValue('String error');

      const client = createClient('admin-token');
      await expect(client.listPlans()).rejects.toThrow(NetworkError);
    });
  });

  describe('getPlan', () => {
    it('should fetch a single plan by ID', async () => {
      const mockResponse: AdminPlanResponse = {
        plan: mockAdminPlan,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('admin-token');
      const result = await client.getPlan('plan-123');

      expect(result.plan).toEqual(mockAdminPlan);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/admin/billing/plans/plan-123`,
        expect.objectContaining({
          headers: expect.any(Headers),
          credentials: 'include',
        }),
      );
    });

    it('should throw NotFoundError when plan does not exist', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Plan not found' }),
      });

      const client = createClient('admin-token');
      await expect(client.getPlan('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should handle malformed plan ID', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid plan ID' }),
      });

      const client = createClient('admin-token');
      await expect(client.getPlan('invalid-id')).rejects.toThrow(BadRequestError);
    });
  });

  describe('createPlan', () => {
    const createRequest: CreatePlanRequest = {
      name: 'New Plan',
      description: 'A new plan',
      interval: 'month',
      priceInCents: 2999,
      currency: 'USD',
      features: [{ key: 'team:invite', name: 'Feature A', included: true }],
      trialDays: 7,
      isActive: true,
      sortOrder: 3,
    };

    it('should create a new plan', async () => {
      const createdPlan: AdminPlan = {
        ...mockAdminPlan,
        id: 'plan-789' as PlanId,
        name: createRequest.name,
        description: createRequest.description ?? null,
        priceInCents: createRequest.priceInCents,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plan: createdPlan }),
      });

      const client = createClient('admin-token');
      const result = await client.createPlan(createRequest);

      expect(result.plan.name).toBe('New Plan');
      expect(result.plan.priceInCents).toBe(2999);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/admin/billing/plans/create`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(createRequest),
          headers: expect.any(Headers),
        }),
      );
    });

    it('should create plan with minimal data', async () => {
      const minimalRequest: CreatePlanRequest = {
        name: 'Minimal Plan',
        interval: 'year',
        priceInCents: 9999,
        features: [],
        trialDays: 0,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            plan: {
              ...mockAdminPlan,
              name: 'Minimal Plan',
              description: null,
              interval: 'year',
              priceInCents: 9999,
            },
          }),
      });

      const client = createClient('admin-token');
      const result = await client.createPlan(minimalRequest);

      expect(result.plan.name).toBe('Minimal Plan');
      expect(result.plan.description).toBeNull();
    });

    it('should throw Error on client-side validation failure', async () => {
      const client = createClient('admin-token');
      const invalidRequest = { ...createRequest, name: '' };
      await expect(client.createPlan(invalidRequest)).rejects.toThrow(
        'name must be at least 1 characters',
      );
    });

    it('should throw InternalError on server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Database connection failed' }),
      });

      const client = createClient('admin-token');
      await expect(client.createPlan(createRequest)).rejects.toThrow(InternalError);
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const client = createClient('admin-token');
      await expect(client.createPlan(createRequest)).rejects.toThrow(InternalError);
    });
  });

  describe('updatePlan', () => {
    const updateRequest: UpdatePlanRequest = {
      name: 'Updated Plan Name',
      priceInCents: 3999,
      isActive: false,
    };

    it('should update an existing plan', async () => {
      const updatedPlan: AdminPlan = {
        ...mockAdminPlan,
        name: updateRequest.name ?? mockAdminPlan.name,
        priceInCents: updateRequest.priceInCents ?? mockAdminPlan.priceInCents,
        isActive: updateRequest.isActive ?? mockAdminPlan.isActive,
        updatedAt: '2026-01-28T12:00:00Z',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plan: updatedPlan }),
      });

      const client = createClient('admin-token');
      const result = await client.updatePlan('plan-123', updateRequest);

      expect(result.plan.name).toBe('Updated Plan Name');
      expect(result.plan.priceInCents).toBe(3999);
      expect(result.plan.isActive).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/admin/billing/plans/plan-123/update`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(updateRequest),
        }),
      );
    });

    it('should update partial fields', async () => {
      const partialUpdate: UpdatePlanRequest = { name: 'Only Name Changed' };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            plan: { ...mockAdminPlan, name: 'Only Name Changed' },
          }),
      });

      const client = createClient('admin-token');
      const result = await client.updatePlan('plan-123', partialUpdate);

      expect(result.plan.name).toBe('Only Name Changed');
    });

    it('should allow setting description to null', async () => {
      const updateWithNull: UpdatePlanRequest = { description: null };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            plan: { ...mockAdminPlan, description: null },
          }),
      });

      const client = createClient('admin-token');
      const result = await client.updatePlan('plan-123', updateWithNull);

      expect(result.plan.description).toBeNull();
    });

    it('should throw NotFoundError when plan does not exist', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Plan not found' }),
      });

      const client = createClient('admin-token');
      await expect(client.updatePlan('nonexistent', updateRequest)).rejects.toThrow(NotFoundError);
    });
  });

  describe('syncPlanToStripe', () => {
    it('should sync plan to Stripe successfully', async () => {
      const mockResponse: SyncStripeResponse = {
        success: true,
        stripePriceId: 'price_new123',
        stripeProductId: 'prod_new123',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('admin-token');
      const result = await client.syncPlanToStripe('plan-123');

      expect(result.success).toBe(true);
      expect(result.stripePriceId).toBe('price_new123');
      expect(result.stripeProductId).toBe('prod_new123');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/admin/billing/plans/plan-123/sync-stripe`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({}),
        }),
      );
    });

    it('should throw NotFoundError when plan does not exist', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Plan not found' }),
      });

      const client = createClient('admin-token');
      await expect(client.syncPlanToStripe('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw InternalError when Stripe API fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            message: 'Stripe API error',
            code: 'STRIPE_ERROR',
          }),
      });

      const client = createClient('admin-token');
      await expect(client.syncPlanToStripe('plan-123')).rejects.toThrow(InternalError);
    });
  });

  describe('deactivatePlan', () => {
    it('should deactivate a plan', async () => {
      const mockResponse: SubscriptionActionResponse = {
        success: true,
        message: 'Plan deactivated successfully',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient('admin-token');
      const result = await client.deactivatePlan('plan-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Plan deactivated successfully');
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/admin/billing/plans/plan-123/deactivate`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({}),
        }),
      );
    });

    it('should throw NotFoundError when plan does not exist', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Plan not found' }),
      });

      const client = createClient('admin-token');
      await expect(client.deactivatePlan('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError when plan already deactivated', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Plan is already inactive' }),
      });

      const client = createClient('admin-token');
      await expect(client.deactivatePlan('plan-123')).rejects.toThrow(BadRequestError);
    });
  });

  describe('baseUrl handling', () => {
    it('should strip trailing slashes from baseUrl', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      const clientWithSlash = createAdminBillingClient({
        baseUrl: 'http://localhost:3001/',
        getToken: () => 'token',
        fetchImpl: mockFetch as unknown as typeof fetch,
      });

      await clientWithSlash.listPlans();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const url = call[0] as string;
      expect(url).toBe('http://localhost:3001/api/admin/billing/plans');
    });

    it('should handle baseUrl with multiple trailing slashes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      const clientWithSlashes = createAdminBillingClient({
        baseUrl: 'http://localhost:3001///',
        getToken: () => 'token',
        fetchImpl: mockFetch as unknown as typeof fetch,
      });

      await clientWithSlashes.listPlans();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const url = call[0] as string;
      expect(url).toBe('http://localhost:3001/api/admin/billing/plans');
    });
  });

  describe('credentials handling', () => {
    it('should always include credentials', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      const client = createClient('admin-token');
      await client.listPlans();

      const call = mockFetch.mock.calls[0];
      if (call === undefined) throw new Error('Call not found');
      const options = call[1];
      expect(options.credentials).toBe('include');
    });
  });
});
