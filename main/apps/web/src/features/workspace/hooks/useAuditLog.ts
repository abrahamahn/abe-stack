// main/apps/web/src/features/workspace/hooks/useAuditLog.ts
/**
 * Audit Log Hook
 *
 * Hook for fetching workspace audit events.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { getApiClient } from '@bslt/api';
import { useQuery } from '@bslt/react';

import type { UseQueryResult } from '@bslt/react';

// ============================================================================
// Types
// ============================================================================

export interface AuditEvent {
  id: string;
  action: string;
  actorId: string;
  details: string;
  createdAt: string;
}

export interface AuditEventsResponse {
  events: AuditEvent[];
}

// ============================================================================
// Hook
// ============================================================================

export interface UseAuditLogResult {
  events: AuditEvent[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface AuditLogFilters {
  action?: string;
  actorId?: string;
  category?: string;
  severity?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export function useAuditLog(tenantId: string, filters: AuditLogFilters = {}): UseAuditLogResult {
  const { config } = useClientEnvironment();

  const queryResult: UseQueryResult<AuditEventsResponse> = useQuery<AuditEventsResponse>({
    queryKey: ['workspaceAuditLog', tenantId, filters],
    queryFn: async (): Promise<AuditEventsResponse> => {
      const api = getApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });
      return (await api.listTenantAuditEvents(tenantId, filters)) as unknown as AuditEventsResponse;
    },
    staleTime: 30000,
  });

  return {
    events: queryResult.data?.events ?? [],
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
