// apps/web/src/features/admin/hooks/useSecurityEvents.ts
/**
 * useSecurityEvents hook
 *
 * Fetch paginated security events with filtering support.
 */

import { tokenStore } from '@abe-stack/core';
import { useQuery, type UseQueryResult } from '@abe-stack/sdk';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useMemo, useState } from 'react';


import { createAdminApiClient } from '../services/adminApi';

import type {
  PaginationOptions,
  SecurityEventsFilter,
  SecurityEventsListResponse,
} from '@abe-stack/core';

// ============================================================================
// Types
// ============================================================================

export interface UseSecurityEventsOptions {
  filter?: SecurityEventsFilter;
  pagination?: Partial<PaginationOptions>;
  enabled?: boolean;
}

export interface UseSecurityEventsResult {
  data: SecurityEventsListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setFilter: (filter: SecurityEventsFilter) => void;
  setPage: (page: number) => void;
  filter: SecurityEventsFilter;
  pagination: PaginationOptions;
}

// ============================================================================
// Hook
// ============================================================================

export function useSecurityEvents(options: UseSecurityEventsOptions = {}): UseSecurityEventsResult {
  const { config } = useClientEnvironment();
  const [filter, setFilter] = useState<SecurityEventsFilter>(options.filter ?? {});
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: options.pagination?.page ?? 1,
    limit: options.pagination?.limit ?? 50,
    sortBy: options.pagination?.sortBy ?? 'createdAt',
    sortOrder: options.pagination?.sortOrder ?? 'desc',
  });

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: () => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const queryKey = useMemo(() => ['securityEvents', filter, pagination], [filter, pagination]);

  const queryResult: UseQueryResult<SecurityEventsListResponse> = useQuery({
    queryKey,
    queryFn: async () => {
      return adminApi.listSecurityEvents({
        ...pagination,
        filter,
      });
    },
    enabled: options.enabled !== false,
  });

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const handleSetFilter = useCallback((newFilter: SecurityEventsFilter) => {
    setFilter(newFilter);
    // Reset to first page when filter changes
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
    filter,
    pagination,
  };
}
