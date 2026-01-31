// apps/web/src/features/admin/hooks/useQueueStats.ts
/**
 * useQueueStats hook
 *
 * Fetch queue statistics for the job monitor dashboard.
 */

import { useQuery } from '@abe-stack/client';
import { tokenStore } from '@abe-stack/core';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useMemo } from 'react';

import { createAdminApiClient } from '../services/adminApi';

// ============================================================================
// Types
// ============================================================================

interface QueueStatsLocal {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  total: number;
  failureRate: number;
  recentCompleted: number;
  recentFailed: number;
}

export interface UseQueueStatsOptions {
  enabled?: boolean;
}

export interface UseQueueStatsResult {
  data: QueueStatsLocal | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
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
        getToken: (): string | null => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const queryResult = useQuery<QueueStatsLocal>({
    queryKey: ['queueStats'],
    queryFn: async (): Promise<QueueStatsLocal> => {
      const result = await adminApi.getQueueStats();
      return result as QueueStatsLocal;
    },
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
