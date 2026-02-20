// main/apps/web/src/features/admin/hooks/useAdminErrorLog.ts
/**
 * useAdminErrorLog hook
 *
 * Fetch recent error log entries for admin dashboard.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useQuery } from '@bslt/react';

import { createAdminApiClient } from '../services/adminApi';

import type { AdminErrorLogResponse } from '../services/adminApi';
import type { UseQueryResult } from '@bslt/react';

// ============================================================================
// Types
// ============================================================================

export interface UseAdminErrorLogOptions {
  limit?: number;
  enabled?: boolean;
}

export interface UseAdminErrorLogResult {
  data: AdminErrorLogResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAdminErrorLog(options?: UseAdminErrorLogOptions): UseAdminErrorLogResult {
  const { config } = useClientEnvironment();
  const limit = options?.limit ?? 50;

  const queryResult: UseQueryResult<AdminErrorLogResponse> = useQuery<AdminErrorLogResponse>({
    queryKey: ['adminErrorLog', String(limit)],
    queryFn: async (): Promise<AdminErrorLogResponse> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });
      return client.getErrorLog(limit);
    },
    staleTime: 15000,
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
