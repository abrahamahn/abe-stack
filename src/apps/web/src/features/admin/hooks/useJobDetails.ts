// src/apps/web/src/features/admin/hooks/useJobDetails.ts
/**
 * useJobDetails hook
 *
 * Fetch detailed information for a single job.
 */

import { useQuery } from '@abe-stack/react';
import { tokenStore } from '@abe-stack/shared';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useMemo } from 'react';

import { createAdminApiClient } from '../services/adminApi';

import type { JobStatus } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

interface JobDetailsLocal {
  id: string;
  name: string;
  status: JobStatus;
  createdAt: string;
  scheduledAt: string;
  completedAt: string | null;
  durationMs: number | null;
  attempts: number;
  maxAttempts: number;
  args: unknown;
  error: { name: string; message: string; stack?: string } | null;
  deadLetterReason?: string | null;
}

export interface UseJobDetailsOptions {
  enabled?: boolean;
}

export interface UseJobDetailsResult {
  data: JobDetailsLocal | undefined;
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
        getToken: (): string | null => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const queryResult = useQuery<JobDetailsLocal>({
    queryKey: ['job', jobId],
    queryFn: async (): Promise<JobDetailsLocal> => {
      if (jobId === undefined || jobId.length === 0) throw new Error('Job ID is required');
      const result = await adminApi.getJobDetails(jobId);
      return result as JobDetailsLocal;
    },
    enabled: options.enabled !== false && jobId !== undefined && jobId.length > 0,
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
