// apps/web/src/features/admin/hooks/useJobsList.ts
/**
 * useJobsList hook
 *
 * Fetch paginated jobs list with filtering support.
 */

import { useQuery } from '@abe-stack/client-engine';
import { tokenStore } from '@abe-stack/shared';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useMemo, useState } from 'react';

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
  attempts: number;
  maxAttempts: number;
}

interface JobListResponseLocal {
  data: JobDetailsLocal[];
  page: number;
  totalPages: number;
}

export interface JobsFilter {
  status?: JobStatus;
  name?: string;
}

export interface JobsPagination {
  page: number;
  limit: number;
  sortBy: 'createdAt' | 'scheduledAt' | 'completedAt';
  sortOrder: 'asc' | 'desc';
}

export interface UseJobsListOptions {
  filter?: JobsFilter;
  pagination?: Partial<JobsPagination>;
  enabled?: boolean;
}

export interface UseJobsListResult {
  data: JobListResponseLocal | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setFilter: (filter: JobsFilter) => void;
  setPage: (page: number) => void;
  setStatus: (status: JobStatus | undefined) => void;
  filter: JobsFilter;
  pagination: JobsPagination;
}

// ============================================================================
// Hook
// ============================================================================

export function useJobsList(options: UseJobsListOptions = {}): UseJobsListResult {
  const { config } = useClientEnvironment();
  const [filter, setFilter] = useState<JobsFilter>(options.filter ?? {});
  const [pagination, setPagination] = useState<JobsPagination>({
    page: options.pagination?.page ?? 1,
    limit: options.pagination?.limit ?? 50,
    sortBy: options.pagination?.sortBy ?? 'createdAt',
    sortOrder: options.pagination?.sortOrder ?? 'desc',
  });

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: (): string | null => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const queryKey = useMemo(() => ['jobs', filter, pagination], [filter, pagination]);

  const queryResult = useQuery<JobListResponseLocal>({
    queryKey,
    queryFn: async (): Promise<JobListResponseLocal> => {
      const result = await adminApi.listJobs({
        ...(filter.status !== undefined && { status: filter.status }),
        ...(filter.name !== undefined && { name: filter.name }),
        page: pagination.page,
        limit: pagination.limit,
        sortBy: pagination.sortBy,
        sortOrder: pagination.sortOrder,
      });
      return result as JobListResponseLocal;
    },
    enabled: options.enabled !== false,
  });

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const handleSetFilter = useCallback((newFilter: JobsFilter) => {
    setFilter(newFilter);
    // Reset to first page when filter changes
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const setStatus = useCallback((status: JobStatus | undefined) => {
    setFilter((prev) => ({ ...prev, ...(status !== undefined && { status }) }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
    setFilter: handleSetFilter,
    setPage,
    setStatus,
    filter,
    pagination,
  };
}
