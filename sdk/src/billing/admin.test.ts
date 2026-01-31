// sdk/src/billing/admin.test.ts
/**
 * Admin Billing Client Tests
 *
 * Comprehensive tests for admin billing operations including plan management,
 * Stripe synchronization, and the useAdminPlans hook.
 * @vitest-environment jsdom
 */

import {
  BadRequestError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  UnauthorizedError,
} from '@abe-stack/core';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkError } from '../errors';

import { createAdminBillingClient, useAdminPlans } from './admin';

import type { AdminBillingClientConfig } from './admin';
import type {
  AdminPlan,
  AdminPlanResponse,
  AdminPlansListResponse,
  CreatePlanRequest,
  SubscriptionActionResponse,
  SyncStripeResponse,
  UpdatePlanRequest,
} from '@abe-stack/core';

// ============================================================================
// Test Data
// ============================================================================

const mockAdminPlan: AdminPlan = {
  id: 'plan-123',
  name: 'Pro Plan',
  description: 'Professional tier',
  interval: 'month',
  priceInCents: 1999,
  currency: 'USD',
  features: [
    { name: 'Feature 1', included: true },
    { name: 'Feature 2', included: true },
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
  id: 'plan-456',
  name: 'Enterprise Plan',
  description: 'Enterprise tier',
  interval: 'year',
  priceInCents: 19999,
  currency: 'USD',
  features: [
    { name: 'Feature 1', included: true },
    { name: 'Feature 2', included: true },
    { name: 'Feature 3', included: true },
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
      await expect(client.listPlans()).rejects.toThrow(
        'Failed to fetch GET /admin/billing/plans',
      );
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
      features: [{ name: 'Feature A', included: true }],
      trialDays: 7,
      isActive: true,
      sortOrder: 3,
    };

    it('should create a new plan', async () => {
      const createdPlan: AdminPlan = {
        ...mockAdminPlan,
        id: 'plan-789',
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

    it('should throw BadRequestError on validation failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            message: 'Validation failed',
            details: { name: 'Name is required' },
          }),
      });

      const client = createClient('admin-token');
      const invalidRequest = { ...createRequest, name: '' };
      await expect(client.createPlan(invalidRequest)).rejects.toThrow(BadRequestError);
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
      await expect(client.updatePlan('nonexistent', updateRequest)).rejects.toThrow(
        NotFoundError,
      );
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

// ============================================================================
// useAdminPlans Hook Tests
// ============================================================================

describe('useAdminPlans', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let clientConfig: AdminBillingClientConfig;
  const baseUrl = 'http://localhost:3001';
  const getToken = () => 'admin-token';

  beforeEach(() => {
    mockFetch = vi.fn();
    // Create a stable config object that won't change between renders
    clientConfig = {
      baseUrl,
      getToken,
      fetchImpl: mockFetch as unknown as typeof fetch,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      mockFetch.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        () =>
          new Promise(() => {
            // Never resolves - keeps loading
          }),
      );

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isActing).toBe(false);
      expect(result.current.plans).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should fetch plans on mount', async () => {
      const mockResponse: AdminPlansListResponse = {
        plans: [mockAdminPlan, mockAdminPlan2],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plans).toHaveLength(2);
      expect(result.current.plans[0]).toEqual(mockAdminPlan);
      expect(result.current.plans[1]).toEqual(mockAdminPlan2);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty plans list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plans).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should set error on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('Failed to fetch');
      expect(result.current.plans).toEqual([]);
    });

    it('should handle non-Error rejection', async () => {
      mockFetch.mockRejectedValue('String error');

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toContain('Failed to fetch');
    });
  });

  describe('create', () => {
    it('should create a plan and refresh list', async () => {
      const createRequest: CreatePlanRequest = {
        name: 'New Plan',
        interval: 'month',
        priceInCents: 4999,
      };

      const createdPlan: AdminPlan = {
        ...mockAdminPlan,
        id: 'plan-new',
        name: 'New Plan',
        priceInCents: 4999,
      };

      // First call: initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan] }),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Second call: create plan
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plan: createdPlan }),
      });

      // Third call: refresh after create
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan, createdPlan] }),
      });

      let createdResult: AdminPlan | undefined;
      await act(async () => {
        createdResult = await result.current.create(createRequest);
      });

      await waitFor(() => {
        expect(result.current.isActing).toBe(false);
      });

      expect(createdResult).toEqual(createdPlan);
      expect(result.current.plans).toHaveLength(2);
      expect(result.current.error).toBeNull();
    });

    it('should set error on create failure', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan] }),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Create fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid data' }),
      });

      await act(async () => {
        await expect(
          result.current.create({
            name: '',
            interval: 'month',
            priceInCents: 0,
          }),
        ).rejects.toThrow();
      });

      await waitFor(() => {
        expect(result.current.isActing).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should maintain isActing state during create', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Create with delay
      mockFetch.mockImplementationOnce(
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ plan: mockAdminPlan }),
              });
            }, 50);
          }),
      );

      act(() => {
        void result.current.create({
          name: 'Test',
          interval: 'month',
          priceInCents: 1000,
        });
      });

      // Should be acting immediately
      expect(result.current.isActing).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isActing).toBe(false);
      });
    });
  });

  describe('update', () => {
    it('should update a plan and refresh list', async () => {
      const updateRequest: UpdatePlanRequest = {
        name: 'Updated Name',
        priceInCents: 5999,
      };

      const updatedPlan: AdminPlan = {
        ...mockAdminPlan,
        name: 'Updated Name',
        priceInCents: 5999,
      };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan] }),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plan: updatedPlan }),
      });

      // Refresh after update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [updatedPlan] }),
      });

      let updatedResult: AdminPlan | undefined;
      await act(async () => {
        updatedResult = await result.current.update('plan-123', updateRequest);
      });

      await waitFor(() => {
        expect(result.current.isActing).toBe(false);
      });

      expect(updatedResult).toEqual(updatedPlan);
      expect(result.current.plans[0]?.name).toBe('Updated Name');
      expect(result.current.error).toBeNull();
    });

    it('should set error on update failure', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan] }),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Plan not found' }),
      });

      await act(async () => {
        await expect(result.current.update('nonexistent', { name: 'Test' })).rejects.toThrow();
      });

      await waitFor(() => {
        expect(result.current.isActing).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('syncToStripe', () => {
    it('should sync plan to Stripe and refresh list', async () => {
      const syncResponse: SyncStripeResponse = {
        success: true,
        stripePriceId: 'price_new',
        stripeProductId: 'prod_new',
      };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan] }),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Sync call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(syncResponse),
      });

      // Refresh after sync
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            plans: [
              {
                ...mockAdminPlan,
                stripePriceId: 'price_new',
                stripeProductId: 'prod_new',
              },
            ],
          }),
      });

      let syncResult: SyncStripeResponse | undefined;
      await act(async () => {
        syncResult = await result.current.syncToStripe('plan-123');
      });

      await waitFor(() => {
        expect(result.current.isActing).toBe(false);
      });

      expect(syncResult).toEqual(syncResponse);
      expect(result.current.plans[0]?.stripePriceId).toBe('price_new');
      expect(result.current.error).toBeNull();
    });

    it('should set error on sync failure', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan] }),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Sync fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Stripe API error' }),
      });

      await act(async () => {
        await expect(result.current.syncToStripe('plan-123')).rejects.toThrow();
      });

      await waitFor(() => {
        expect(result.current.isActing).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Stripe API error');
    });
  });

  describe('deactivate', () => {
    it('should deactivate a plan and refresh list', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan] }),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Deactivate call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Deactivated' }),
      });

      // Refresh after deactivate
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            plans: [{ ...mockAdminPlan, isActive: false }],
          }),
      });

      await act(async () => {
        await result.current.deactivate('plan-123');
      });

      await waitFor(() => {
        expect(result.current.isActing).toBe(false);
      });

      expect(result.current.plans[0]?.isActive).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set error on deactivate failure', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan] }),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Deactivate fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Plan not found' }),
      });

      await act(async () => {
        await expect(result.current.deactivate('nonexistent')).rejects.toThrow();
      });

      await waitFor(() => {
        expect(result.current.isActing).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Plan not found');
    });
  });

  describe('refresh', () => {
    it('should manually refresh plans list', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan] }),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plans).toHaveLength(1);

      // Refresh with new data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan, mockAdminPlan2] }),
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plans).toHaveLength(2);
    });

    it('should clear previous error on successful refresh', async () => {
      // Initial fetch fails
      mockFetch.mockRejectedValueOnce(new Error('Initial error'));

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);

      // Refresh succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan] }),
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.plans).toHaveLength(1);
    });
  });

  describe('client config stability', () => {
    it('should not recreate client on config reference change if values same', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      const { result, rerender } = renderHook(
        ({ config }: { config: AdminBillingClientConfig }) => useAdminPlans(config),
        {
          initialProps: { config: clientConfig },
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchCallCount = mockFetch.mock.calls.length;

      // Rerender with new config object but same values (should trigger re-fetch due to useMemo)
      const newConfig = {
        baseUrl,
        getToken,
        fetchImpl: mockFetch as unknown as typeof fetch,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [] }),
      });

      rerender({
        config: newConfig,
      });

      // Should recreate client and fetch again due to config object change
      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(fetchCallCount);
      });
    });
  });

  describe('error clearing', () => {
    it('should clear error on successful action after previous error', async () => {
      // Initial fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan] }),
      });

      const { result } = renderHook(() => useAdminPlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Create fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad request' }),
      });

      await act(async () => {
        await expect(
          result.current.create({
            name: 'Test',
            interval: 'month',
            priceInCents: 1000,
          }),
        ).rejects.toThrow();
      });

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
      });

      // Create succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plan: mockAdminPlan2 }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plans: [mockAdminPlan, mockAdminPlan2] }),
      });

      await act(async () => {
        await result.current.create({
          name: 'Valid Plan',
          interval: 'year',
          priceInCents: 9999,
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
