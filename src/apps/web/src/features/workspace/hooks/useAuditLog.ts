// src/apps/web/src/features/workspace/hooks/useAuditLog.ts
/**
 * Audit Log Hook
 *
 * Hook for fetching workspace audit events.
 */

import { useQuery } from '@abe-stack/client-engine';
import { useClientEnvironment } from '@app/ClientEnvironment';

import type { UseQueryResult } from '@abe-stack/client-engine';

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

export function useAuditLog(tenantId: string): UseAuditLogResult {
  const { config } = useClientEnvironment();

  const queryResult: UseQueryResult<AuditEventsResponse> = useQuery<AuditEventsResponse>({
    queryKey: ['workspaceAuditLog', tenantId],
    queryFn: async (): Promise<AuditEventsResponse> => {
      const token = localStorage.getItem('accessToken') ?? '';

      const response = await fetch(`${config.apiUrl}/api/tenants/${tenantId}/audit-events`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit events');
      }

      return response.json() as Promise<AuditEventsResponse>;
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
