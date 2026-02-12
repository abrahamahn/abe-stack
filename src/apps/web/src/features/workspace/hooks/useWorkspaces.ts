// src/apps/web/src/features/workspace/hooks/useWorkspaces.ts
/**
 * Workspaces List Hook
 *
 * Hook for fetching the list of workspaces the user belongs to.
 */

import { useQuery, useQueryCache } from '@abe-stack/react';
import { tokenStore } from '@abe-stack/shared';

import { createWorkspaceApi } from '../api';

import type { Tenant } from '@abe-stack/shared';

// ============================================================================
// API Instance
// ============================================================================

let workspaceApi: ReturnType<typeof createWorkspaceApi> | null = null;
const apiBaseUrl =
  typeof import.meta.env['VITE_API_URL'] === 'string' ? import.meta.env['VITE_API_URL'] : '';

function getWorkspaceApi(): ReturnType<typeof createWorkspaceApi> {
  workspaceApi ??= createWorkspaceApi({
    baseUrl: apiBaseUrl,
    getToken: (): string | null => tokenStore.get(),
  });
  return workspaceApi;
}

// ============================================================================
// Types
// ============================================================================

export interface UseWorkspacesResult {
  data: Tenant[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useWorkspaces(): UseWorkspacesResult {
  const queryCache = useQueryCache();

  const query = useQuery<{ tenants: Tenant[] }>({
    queryKey: ['workspaces'],
    queryFn: async (): Promise<{ tenants: Tenant[] }> => {
      const api = getWorkspaceApi();
      return api.listTenants();
    },
    staleTime: 60 * 1000,
  });

  const refetch = (): void => {
    queryCache.invalidateQuery(['workspaces']);
  };

  return {
    data: query.data?.tenants ?? [],
    isLoading: query.status === 'pending',
    isError: query.status === 'error',
    error: query.error ?? null,
    refetch,
  };
}
