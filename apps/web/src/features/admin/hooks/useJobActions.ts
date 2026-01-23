// apps/web/src/features/admin/hooks/useJobActions.ts
/**
 * useJobActions hook
 *
 * Provides retry and cancel actions for jobs.
 */

import { tokenStore } from '@abe-stack/core';
import { useMutation, type UseMutationResult } from '@abe-stack/sdk';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useMemo } from 'react';

import { createAdminApiClient } from '../services/adminApi';

import type { JobActionResponse } from '@abe-stack/core';

// ============================================================================
// Types
// ============================================================================

export interface UseJobActionsResult {
  retryJob: (jobId: string) => Promise<JobActionResponse>;
  cancelJob: (jobId: string) => Promise<JobActionResponse>;
  isRetrying: boolean;
  isCancelling: boolean;
  retryError: Error | null;
  cancelError: Error | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useJobActions(): UseJobActionsResult {
  const { config, queryCache } = useClientEnvironment();

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: () => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const invalidateJobs = useCallback(() => {
    // Invalidate jobs list and stats queries
    queryCache.invalidateQueries((key) => key[0] === 'jobs' || key[0] === 'queueStats');
  }, [queryCache]);

  const retryMutation: UseMutationResult<JobActionResponse, Error, string> = useMutation({
    mutationFn: async (jobId: string) => adminApi.retryJob(jobId),
    onSuccess: () => {
      invalidateJobs();
    },
  });

  const cancelMutation: UseMutationResult<JobActionResponse, Error, string> = useMutation({
    mutationFn: async (jobId: string) => adminApi.cancelJob(jobId),
    onSuccess: () => {
      invalidateJobs();
    },
  });

  const retryJob = useCallback(
    async (jobId: string): Promise<JobActionResponse> => {
      return retryMutation.mutateAsync(jobId);
    },
    [retryMutation],
  );

  const cancelJob = useCallback(
    async (jobId: string): Promise<JobActionResponse> => {
      return cancelMutation.mutateAsync(jobId);
    },
    [cancelMutation],
  );

  return {
    retryJob,
    cancelJob,
    isRetrying: retryMutation.isPending,
    isCancelling: cancelMutation.isPending,
    retryError: retryMutation.error,
    cancelError: cancelMutation.error,
  };
}
