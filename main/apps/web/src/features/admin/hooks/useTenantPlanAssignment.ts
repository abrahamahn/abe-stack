// main/apps/web/src/features/admin/hooks/useTenantPlanAssignment.ts
/**
 * useTenantPlanAssignment hook
 *
 * Assign a specific plan to a tenant.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useMutation } from '@bslt/react';

import { createAdminApiClient } from '../services/adminApi';

import type { AssignTenantPlanRequest, AssignTenantPlanResponse } from '../services/adminApi';

// ============================================================================
// Types
// ============================================================================

export interface UseTenantPlanAssignmentOptions {
  onSuccess?: (response: AssignTenantPlanResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseTenantPlanAssignmentResult {
  assignPlan: (data: { tenantId: string; planId: string }) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useTenantPlanAssignment(
  options?: UseTenantPlanAssignmentOptions,
): UseTenantPlanAssignmentResult {
  const { config } = useClientEnvironment();

  const mutation = useMutation<
    AssignTenantPlanResponse,
    Error,
    { tenantId: string; planId: string }
  >({
    mutationFn: async (vars: {
      tenantId: string;
      planId: string;
    }): Promise<AssignTenantPlanResponse> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });
      const assignRequest: AssignTenantPlanRequest = { planId: vars.planId };
      return client.assignTenantPlan(vars.tenantId, assignRequest);
    },
    onSuccess: (response: AssignTenantPlanResponse) => {
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    assignPlan: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isError: mutation.status === 'error',
    error: mutation.error,
  };
}
