// apps/web/src/features/admin/hooks/useJobDetails.ts
/**
 * useJobDetails hook
 *
 * Fetch detailed information for a single job.
 */

import { tokenStore } from '@abe-stack/core';
import { useQuery, type UseQueryResult } from '@abe-stack/sdk';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useMemo } from 'react';

import { createAdminApiClient } from '../services/adminApi';

import type { JobDetails } from '@abe-stack/core';

// ============================================================================
// Types
// ============================================================================

export interface UseJobDetailsOptions {
  enabled?: boolean;
}

export interface UseJobDetailsResult {
  data: JobDetails | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useJobDetails(
  jobId: string | undefined,
  options: UseJobDetailsOptions = {},
): UseJobDetailsResult {
  const { config } = useClientEnvironment();

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: () => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const queryResult: UseQueryResult<JobDetails> = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      return adminApi.getJobDetails(jobId);
    },
    enabled: options.enabled !== false && Boolean(jobId),
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
