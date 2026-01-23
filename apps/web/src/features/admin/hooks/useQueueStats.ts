// apps/web/src/features/admin/hooks/useQueueStats.ts
/**
 * useQueueStats hook
 *
 * Fetch queue statistics for the job monitor dashboard.
 */

import { tokenStore } from '@abe-stack/core';
import { useQuery, type UseQueryResult } from '@abe-stack/sdk';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useMemo } from 'react';

import { createAdminApiClient } from '../services/adminApi';

import type { QueueStats } from '@abe-stack/core';

// ============================================================================
// Types
// ============================================================================

export interface UseQueueStatsOptions {
  enabled?: boolean;
}

export interface UseQueueStatsResult {
  data: QueueStats | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useQueueStats(options: UseQueueStatsOptions = {}): UseQueueStatsResult {
  const { config } = useClientEnvironment();

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: () => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const queryResult: UseQueryResult<QueueStats> = useQuery({
    queryKey: ['queueStats'],
    queryFn: async () => adminApi.getQueueStats(),
    enabled: options.enabled !== false,
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
