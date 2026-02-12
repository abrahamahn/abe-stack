// src/apps/web/src/features/admin/hooks/useSecurityEvents.ts
/**
 * useSecurityEvents hook
 *
 * Fetch paginated security events with filtering support.
 */

import { useQuery } from '@abe-stack/react';
import { tokenStore } from '@abe-stack/shared';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useMemo, useState } from 'react';

import { createAdminApiClient } from '../services/adminApi';

// ============================================================================
// Types
// ============================================================================

interface SecurityEventsFilterLocal {
  eventType?: string;
  severity?: string;
  email?: string;
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

interface PaginationOptionsLocal {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SecurityEventLocal {
  id: string;
  createdAt: string;
  eventType: string;
  severity: string;
  email?: string | null;
  ipAddress?: string | null;
}

interface SecurityEventsListResponseLocal {
  data: SecurityEventLocal[];
  total: number;
  totalPages: number;
}

export interface UseSecurityEventsOptions {
  filter?: SecurityEventsFilterLocal;
  pagination?: Partial<PaginationOptionsLocal>;
  enabled?: boolean;
}

export interface UseSecurityEventsResult {
  data: SecurityEventsListResponseLocal | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setFilter: (filter: SecurityEventsFilterLocal) => void;
  setPage: (page: number) => void;
  filter: SecurityEventsFilterLocal;
  pagination: PaginationOptionsLocal;
}

// ============================================================================
// Hook
// ============================================================================

export function useSecurityEvents(options: UseSecurityEventsOptions = {}): UseSecurityEventsResult {
  const { config } = useClientEnvironment();
  const [filter, setFilter] = useState<SecurityEventsFilterLocal>(options.filter ?? {});
  const [pagination, setPagination] = useState<PaginationOptionsLocal>({
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

  const queryKey = useMemo(
    () => ['securityEvents', filter, pagination] as const,
    [filter, pagination],
  );

  const queryResult = useQuery<SecurityEventsListResponseLocal>({
    queryKey: queryKey as unknown as string[],
    queryFn: async (): Promise<SecurityEventsListResponseLocal> => {
      const result = await adminApi.listSecurityEvents({
        ...pagination,
        filter,
      });
      return result as SecurityEventsListResponseLocal;
    },
    enabled: options.enabled !== false,
  });

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const handleSetFilter = useCallback((newFilter: SecurityEventsFilterLocal) => {
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
