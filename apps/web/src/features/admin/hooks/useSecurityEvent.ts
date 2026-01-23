// apps/web/src/features/admin/hooks/useSecurityEvent.ts
/**
 * useSecurityEvent hook
 *
 * Fetch a single security event by ID.
 */

import { tokenStore } from '@abe-stack/core';
import { useQuery, type UseQueryResult } from '@abe-stack/sdk';
import { useMemo } from 'react';

import { useClientEnvironment } from '@app/ClientEnvironment';

import { createAdminApiClient } from '../services/adminApi';

import type { SecurityEvent } from '@abe-stack/core';

// ============================================================================
// Types
// ============================================================================

export interface UseSecurityEventOptions {
  enabled?: boolean;
}

export interface UseSecurityEventResult {
  data: SecurityEvent | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useSecurityEvent(
  id: string | undefined,
  options: UseSecurityEventOptions = {},
): UseSecurityEventResult {
  const { config } = useClientEnvironment();

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: () => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const queryKey = useMemo(() => ['securityEvent', id], [id]);

  const queryResult: UseQueryResult<SecurityEvent> = useQuery({
    queryKey,
    queryFn: async () => {
      if (!id) {
        throw new Error('Event ID is required');
      }
      return adminApi.getSecurityEvent(id);
    },
    enabled: !!id && options.enabled !== false,
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
