// main/apps/web/src/features/workspace/hooks/useMembers.ts
/**
 * Members Hooks
 *
 * Hooks for listing and managing workspace members.
 */

import { getAccessToken } from '@app/authToken';
import { useMutation, useQuery, useQueryCache } from '@bslt/react';

import { createWorkspaceApi } from '../api';

import type { Membership, UpdateMembershipRole } from '@bslt/shared';

// ============================================================================
// API Instance
// ============================================================================

let workspaceApi: ReturnType<typeof createWorkspaceApi> | null = null;
const apiBaseUrl =
  typeof import.meta.env['VITE_API_URL'] === 'string' ? import.meta.env['VITE_API_URL'] : '';

function getWorkspaceApi(): ReturnType<typeof createWorkspaceApi> {
  workspaceApi ??= createWorkspaceApi({
    baseUrl: apiBaseUrl,
    getToken: getAccessToken,
  });
  return workspaceApi;
}

// ============================================================================
// Types
// ============================================================================

export interface UseMembersResult {
  data: Membership[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseUpdateMemberRoleResult {
  updateRole: (userId: string, data: UpdateMembershipRole) => void;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

export interface UseRemoveMemberResult {
  remove: (userId: string) => void;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

// ============================================================================
// Hooks
// ============================================================================

export function useMembers(tenantId: string | null): UseMembersResult {
  const queryCache = useQueryCache();

  const query = useQuery<{ members: Membership[] }>({
    queryKey: ['workspaces', tenantId, 'members'],
    queryFn: async (): Promise<{ members: Membership[] }> => {
      if (tenantId === null) throw new Error('No tenant ID');
      const api = getWorkspaceApi();
      return api.listMembers(tenantId);
    },
    enabled: tenantId !== null,
    staleTime: 30 * 1000,
  });

  const refetch = (): void => {
    if (tenantId !== null) {
      queryCache.invalidateQuery(['workspaces', tenantId, 'members']);
    }
  };

  return {
    data: query.data?.members ?? [],
    isLoading: query.status === 'pending',
    isError: query.status === 'error',
    error: query.error ?? null,
    refetch,
  };
}

export function useUpdateMemberRole(
  tenantId: string | null,
  options?: { onSuccess?: () => void; onError?: (error: Error) => void },
): UseUpdateMemberRoleResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<Membership, Error, { userId: string; data: UpdateMembershipRole }>({
    mutationFn: async ({ userId, data }): Promise<Membership> => {
      if (tenantId === null) throw new Error('No tenant ID');
      const api = getWorkspaceApi();
      return api.updateMemberRole(tenantId, userId, data);
    },
    onSuccess: () => {
      if (tenantId !== null) {
        queryCache.invalidateQuery(['workspaces', tenantId, 'members']);
      }
      options?.onSuccess?.();
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    updateRole: (userId: string, data: UpdateMembershipRole): void => {
      mutation.mutate({ userId, data });
    },
    isLoading: mutation.status === 'pending',
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useRemoveMember(
  tenantId: string | null,
  options?: { onSuccess?: () => void; onError?: (error: Error) => void },
): UseRemoveMemberResult {
  const queryCache = useQueryCache();

  const mutation = useMutation<{ message: string }, Error, string>({
    mutationFn: async (userId): Promise<{ message: string }> => {
      if (tenantId === null) throw new Error('No tenant ID');
      const api = getWorkspaceApi();
      return api.removeMember(tenantId, userId);
    },
    onSuccess: () => {
      if (tenantId !== null) {
        queryCache.invalidateQuery(['workspaces', tenantId, 'members']);
      }
      options?.onSuccess?.();
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    remove: mutation.mutate,
    isLoading: mutation.status === 'pending',
    error: mutation.error,
    reset: mutation.reset,
  };
}
