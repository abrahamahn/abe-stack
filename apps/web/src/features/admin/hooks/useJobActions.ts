// apps/web/src/features/admin/hooks/useJobActions.ts
/**
 * useJobActions hook
 *
 * Provides retry and cancel actions for jobs.
 */

import { useMutation } from '@abe-stack/engine';
import { tokenStore } from '@abe-stack/shared';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useMemo } from 'react';

import { createAdminApiClient } from '../services/adminApi';

// ============================================================================
// Types
// ============================================================================

interface JobActionResponseLocal {
  success: boolean;
  message?: string;
}

export interface UseJobActionsResult {
  retryJob: (jobId: string) => Promise<JobActionResponseLocal>;
  cancelJob: (jobId: string) => Promise<JobActionResponseLocal>;
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
        getToken: (): string | null => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const invalidateJobs = useCallback(() => {
    // Invalidate jobs list and stats queries
    queryCache.invalidateQueries(
      (key: readonly unknown[]) => key[0] === 'jobs' || key[0] === 'queueStats',
    );
  }, [queryCache]);

  const retryMutation = useMutation<JobActionResponseLocal, Error, string>({
    mutationFn: async (jobId: string): Promise<JobActionResponseLocal> => {
      const result = await adminApi.retryJob(jobId);
      return result as JobActionResponseLocal;
    },
    onSuccess: () => {
      invalidateJobs();
    },
  });

  const cancelMutation = useMutation<JobActionResponseLocal, Error, string>({
    mutationFn: async (jobId: string): Promise<JobActionResponseLocal> => {
      const result = await adminApi.cancelJob(jobId);
      return result as JobActionResponseLocal;
    },
    onSuccess: () => {
      invalidateJobs();
    },
  });

  const retryJob = useCallback(
    async (jobId: string): Promise<JobActionResponseLocal> => {
      return retryMutation.mutateAsync(jobId);
    },
    [retryMutation],
  );

  const cancelJob = useCallback(
    async (jobId: string): Promise<JobActionResponseLocal> => {
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
