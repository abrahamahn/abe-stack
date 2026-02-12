// src/client/api/src/billing/admin.ts
/**
 * Admin Billing API Client
 *
 * Type-safe client for admin billing operations (plan management).
 */

import { createPlanRequestSchema, updatePlanRequestSchema } from '@abe-stack/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';
import type {
  AdminPlan,
  AdminPlanResponse,
  AdminPlansListResponse,
  CreatePlanRequest,
  SubscriptionActionResponse,
  SyncStripeResponse,
  UpdatePlanRequest,
} from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the admin billing client
 */
export type AdminBillingClientConfig = BaseClientConfig;

/**
 * Admin Billing API client interface
 */
export interface AdminBillingClient {
  /** List all plans (including inactive) */
  listPlans: () => Promise<AdminPlansListResponse>;
  /** Get a single plan by ID */
  getPlan: (planId: string) => Promise<AdminPlanResponse>;
  /** Create a new plan */
  createPlan: (data: CreatePlanRequest) => Promise<AdminPlanResponse>;
  /** Update a plan */
  updatePlan: (planId: string, data: UpdatePlanRequest) => Promise<AdminPlanResponse>;
  /** Sync plan to Stripe */
  syncPlanToStripe: (planId: string) => Promise<SyncStripeResponse>;
  /** Deactivate a plan */
  deactivatePlan: (planId: string) => Promise<SubscriptionActionResponse>;
}

// ============================================================================
// Client Implementation
// ============================================================================

/**
 * Create an admin billing API client
 *
 * @param config - Client configuration
 * @returns Admin billing client instance
 *
 * @example
 * ```ts
 * const client = createAdminBillingClient({
 *   baseUrl: 'http://localhost:3001',
 *   getToken: () => localStorage.getItem('adminToken'),
 * });
 *
 * // List all plans
 * const { plans } = await client.listPlans();
 *
 * // Create a plan
 * const { plan } = await client.createPlan({
 *   name: 'Pro Plan',
 *   interval: 'month',
 *   priceInCents: 1999,
 * });
 *
 * // Sync to Stripe
 * const { stripePriceId } = await client.syncPlanToStripe(plan.id);
 * ```
 */
export function createAdminBillingClient(config: AdminBillingClientConfig): AdminBillingClient {
  const factory = createRequestFactory(config);

  return {
    async listPlans(): Promise<AdminPlansListResponse> {
      return apiRequest<AdminPlansListResponse>(factory, '/admin/billing/plans');
    },

    async getPlan(planId: string): Promise<AdminPlanResponse> {
      return apiRequest<AdminPlanResponse>(factory, `/admin/billing/plans/${planId}`);
    },

    async createPlan(data: CreatePlanRequest): Promise<AdminPlanResponse> {
      const validated = createPlanRequestSchema.parse(data);
      return apiRequest<AdminPlanResponse>(factory, '/admin/billing/plans/create', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    async updatePlan(planId: string, data: UpdatePlanRequest): Promise<AdminPlanResponse> {
      const validated = updatePlanRequestSchema.parse(data);
      return apiRequest<AdminPlanResponse>(factory, `/admin/billing/plans/${planId}/update`, {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    async syncPlanToStripe(planId: string): Promise<SyncStripeResponse> {
      return apiRequest<SyncStripeResponse>(factory, `/admin/billing/plans/${planId}/sync-stripe`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    async deactivatePlan(planId: string): Promise<SubscriptionActionResponse> {
      return apiRequest<SubscriptionActionResponse>(factory, `/admin/billing/plans/${planId}/deactivate`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
  };
}

// ============================================================================
// Admin Hooks
// ============================================================================

/**
 * Admin plans state
 */
export interface AdminPlansState {
  /** Whether loading plans */
  isLoading: boolean;
  /** Whether an action is in progress */
  isActing: boolean;
  /** All plans (including inactive) */
  plans: AdminPlan[];
  /** Error if failed */
  error: Error | null;
  /** Create a new plan */
  create: (data: CreatePlanRequest) => Promise<AdminPlan>;
  /** Update a plan */
  update: (planId: string, data: UpdatePlanRequest) => Promise<AdminPlan>;
  /** Sync plan to Stripe */
  syncToStripe: (planId: string) => Promise<SyncStripeResponse>;
  /** Deactivate a plan */
  deactivate: (planId: string) => Promise<void>;
  /** Refresh plans from server */
  refresh: () => Promise<void>;
}

/**
 * Hook for admin plan management
 *
 * @param clientConfig - API client configuration
 * @returns Admin plans state and actions
 *
 * @example
 * ```tsx
 * function AdminPlanManager() {
 *   const {
 *     plans,
 *     isLoading,
 *     create,
 *     update,
 *     syncToStripe,
 *     deactivate,
 *   } = useAdminPlans({
 *     baseUrl: '/api',
 *     getToken: () => adminToken,
 *   });
 *
 *   const handleCreate = async () => {
 *     const plan = await create({
 *       name: 'Enterprise',
 *       interval: 'year',
 *       priceInCents: 99900,
 *     });
 *     await syncToStripe(plan.id);
 *   };
 *
 *   return (
 *     <div>
 *       {plans.map(plan => (
 *         <PlanRow key={plan.id} plan={plan} />
 *       ))}
 *       <button onClick={handleCreate}>Add Plan</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAdminPlans(clientConfig: AdminBillingClientConfig): AdminPlansState {
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createAdminBillingClient(clientConfig), [clientConfig]);

  const fetchPlans = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response: AdminPlansListResponse = await client.listPlans();
      setPlans(response.plans);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch plans'));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const create = useCallback(
    async (data: CreatePlanRequest): Promise<AdminPlan> => {
      try {
        setIsActing(true);
        setError(null);
        const response: AdminPlanResponse = await client.createPlan(data);
        await fetchPlans();
        return response.plan;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create plan');
        setError(error);
        throw error;
      } finally {
        setIsActing(false);
      }
    },
    [client, fetchPlans],
  );

  const update = useCallback(
    async (planId: string, data: UpdatePlanRequest): Promise<AdminPlan> => {
      try {
        setIsActing(true);
        setError(null);
        const response: AdminPlanResponse = await client.updatePlan(planId, data);
        await fetchPlans();
        return response.plan;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update plan');
        setError(error);
        throw error;
      } finally {
        setIsActing(false);
      }
    },
    [client, fetchPlans],
  );

  const syncToStripe = useCallback(
    async (planId: string): Promise<SyncStripeResponse> => {
      try {
        setIsActing(true);
        setError(null);
        const response: SyncStripeResponse = await client.syncPlanToStripe(planId);
        await fetchPlans();
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to sync plan to Stripe');
        setError(error);
        throw error;
      } finally {
        setIsActing(false);
      }
    },
    [client, fetchPlans],
  );

  const deactivate = useCallback(
    async (planId: string): Promise<void> => {
      try {
        setIsActing(true);
        setError(null);
        await client.deactivatePlan(planId);
        await fetchPlans();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to deactivate plan');
        setError(error);
        throw error;
      } finally {
        setIsActing(false);
      }
    },
    [client, fetchPlans],
  );

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  return {
    isLoading,
    isActing,
    plans,
    error,
    create,
    update,
    syncToStripe,
    deactivate,
    refresh: fetchPlans,
  };
}
