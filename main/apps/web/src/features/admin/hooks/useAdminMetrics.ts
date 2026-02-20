// main/apps/web/src/features/admin/hooks/useAdminMetrics.ts
/**
 * useAdminMetrics hook
 *
 * Fetch system metrics (request stats, connection counts) for admin dashboard.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useQuery } from '@bslt/react';

import { createAdminApiClient } from '../services/adminApi';

import type { AdminMetricsResponse } from '../services/adminApi';
import type { UseQueryResult } from '@bslt/react';

// ============================================================================
// Types
// ============================================================================

export interface UseAdminMetricsOptions {
  enabled?: boolean;
  pollInterval?: number;
}

export interface UseAdminMetricsResult {
  data: AdminMetricsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAdminMetrics(options?: UseAdminMetricsOptions): UseAdminMetricsResult {
  const { config } = useClientEnvironment();

  const queryResult: UseQueryResult<AdminMetricsResponse> = useQuery<AdminMetricsResponse>({
    queryKey: ['adminMetrics'],
    queryFn: async (): Promise<AdminMetricsResponse> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });
      return client.getMetrics();
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
