// main/apps/web/src/features/workspace/hooks/useWorkspace.ts
/**
 * Single Workspace Hook
 *
 * Hook for fetching a single workspace by ID.
 */

import { getAccessToken } from '@app/authToken';
import { useQuery, useQueryCache } from '@bslt/react';

import { createWorkspaceApi } from '../api';

import type { Tenant } from '@bslt/shared';

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

export interface UseWorkspaceResult {
  data: Tenant | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useWorkspace(id: string | null): UseWorkspaceResult {
  const queryCache = useQueryCache();

  const query = useQuery<Tenant>({
    queryKey: ['workspaces', id],
    queryFn: async (): Promise<Tenant> => {
      if (id === null) throw new Error('No workspace ID provided');
      const api = getWorkspaceApi();
      return api.getTenant(id);
    },
    enabled: id !== null,
    staleTime: 60 * 1000,
  });

  const refetch = (): void => {
    if (id !== null) {
      queryCache.invalidateQuery(['workspaces', id]);
    }
  };

  return {
    data: query.data ?? null,
    isLoading: query.status === 'pending',
    isError: query.status === 'error',
    error: query.error ?? null,
    refetch,
  };
}
