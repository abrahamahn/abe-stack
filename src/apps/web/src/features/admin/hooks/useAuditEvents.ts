// src/apps/web/src/features/admin/hooks/useAuditEvents.ts
/**
 * useAuditEvents hook
 *
 * Fetch audit events for the admin audit log page.
 */

import { useQuery } from '@abe-stack/client-engine';
import { tokenStore } from '@abe-stack/shared';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useMemo } from 'react';

import { createAdminApiClient } from '../services/adminApi';

import type { AuditEventsFilterLocal, AuditEventsResponseLocal } from '../services/adminApi';

// ============================================================================
// Types
// ============================================================================

export interface UseAuditEventsOptions {
  enabled?: boolean;
  filter?: AuditEventsFilterLocal;
}

export interface UseAuditEventsResult {
  data: AuditEventsResponseLocal | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuditEvents(options: UseAuditEventsOptions = {}): UseAuditEventsResult {
  const { config } = useClientEnvironment();

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: (): string | null => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const queryResult = useQuery<AuditEventsResponseLocal>({
    queryKey: ['auditEvents', options.filter],
    queryFn: async (): Promise<AuditEventsResponseLocal> => {
      return adminApi.listAuditEvents(options.filter);
    },
    enabled: options.enabled !== false,
    staleTime: 30000,
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
