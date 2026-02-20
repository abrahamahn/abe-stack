// main/apps/web/src/features/admin/hooks/useAdminHealth.ts
/**
 * useAdminHealth hook
 *
 * Fetch system health status for the admin dashboard.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useQuery } from '@bslt/react';

import { createAdminApiClient } from '../services/adminApi';

import type { AdminHealthResponse } from '../services/adminApi';
import type { UseQueryResult } from '@bslt/react';

// ============================================================================
// Types
// ============================================================================

export interface UseAdminHealthOptions {
  enabled?: boolean;
  /** Polling interval in ms (default: 30000) */
  pollInterval?: number;
}

export interface UseAdminHealthResult {
  data: AdminHealthResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAdminHealth(options?: UseAdminHealthOptions): UseAdminHealthResult {
  const { config } = useClientEnvironment();

  const queryResult: UseQueryResult<AdminHealthResponse> = useQuery<AdminHealthResponse>({
    queryKey: ['adminHealth'],
    queryFn: async (): Promise<AdminHealthResponse> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });
      return client.getHealth();
    },
    staleTime: options?.pollInterval ?? 30000,
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
