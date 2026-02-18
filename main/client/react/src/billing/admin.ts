// main/client/react/src/billing/admin.ts
/**
 * Admin Billing React Hooks
 *
 * Provides useAdminPlans hook backed by useQuery/useMutation
 * for admin plan management operations.
 */

import { createAdminBillingClient } from '@bslt/api';
import { useMemo } from 'react';

import { useMutation } from '../query/useMutation';
import { useQuery } from '../query/useQuery';

import type { AdminBillingClientConfig } from '@bslt/api';
import type { QueryKey } from '@bslt/client-engine';
import type {
  AdminPlan,
  CreatePlanRequest,
  SyncStripeResponse,
  UpdatePlanRequest,
} from '@bslt/shared';

// ============================================================================
// Query Keys
// ============================================================================

export const adminBillingQueryKeys = {
  all: ['admin-billing'] as const,
  plans: (): QueryKey => [...adminBillingQueryKeys.all, 'plans'],
} as const;

// ============================================================================
// useAdminPlans
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
 */
export function useAdminPlans(clientConfig: AdminBillingClientConfig): AdminPlansState {
  const client = useMemo(() => createAdminBillingClient(clientConfig), [clientConfig.baseUrl]);

  const query = useQuery({
    queryKey: adminBillingQueryKeys.plans(),
    queryFn: () => client.listPlans(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePlanRequest) => client.createPlan(data),
    invalidateOnSuccess: [adminBillingQueryKeys.plans()],
  });

  const updateMutation = useMutation({
    mutationFn: (args: { planId: string; data: UpdatePlanRequest }) =>
      client.updatePlan(args.planId, args.data),
    invalidateOnSuccess: [adminBillingQueryKeys.plans()],
  });

  const syncToStripeMutation = useMutation({
    mutationFn: (planId: string) => client.syncPlanToStripe(planId),
    invalidateOnSuccess: [adminBillingQueryKeys.plans()],
  });

  const deactivateMutation = useMutation({
    mutationFn: (planId: string) => client.deactivatePlan(planId),
    invalidateOnSuccess: [adminBillingQueryKeys.plans()],
  });

  return {
    plans: query.data?.plans ?? [],
    isLoading: query.isLoading,
    isActing:
      createMutation.isPending ||
      updateMutation.isPending ||
      syncToStripeMutation.isPending ||
      deactivateMutation.isPending,
    error:
      query.error ??
      createMutation.error ??
      updateMutation.error ??
      syncToStripeMutation.error ??
      deactivateMutation.error ??
      null,
    create: async (data: CreatePlanRequest): Promise<AdminPlan> => {
      const result = await createMutation.mutateAsync(data);
      return result.plan;
    },
    update: async (planId: string, data: UpdatePlanRequest): Promise<AdminPlan> => {
      const result = await updateMutation.mutateAsync({ planId, data });
      return result.plan;
    },
    syncToStripe: async (planId: string): Promise<SyncStripeResponse> => {
      return syncToStripeMutation.mutateAsync(planId);
    },
    deactivate: async (planId: string): Promise<void> => {
      await deactivateMutation.mutateAsync(planId);
    },
    refresh: query.refetch,
  };
}
