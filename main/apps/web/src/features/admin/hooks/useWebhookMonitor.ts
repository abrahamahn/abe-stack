// main/apps/web/src/features/admin/hooks/useWebhookMonitor.ts
/**
 * useWebhookMonitor hook
 *
 * Fetch all webhook endpoints across tenants for admin system-wide monitoring.
 * Uses the admin /admin/webhooks endpoint (not the per-tenant webhook management endpoint).
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useQuery } from '@bslt/react';

import { createAdminApiClient } from '../services/adminApi';

import type { AdminWebhookListResponse } from '../services/adminApi';
import type { UseQueryResult } from '@bslt/react';

// ============================================================================
// Types
// ============================================================================

export interface UseWebhookMonitorOptions {
  tenantId?: string;
  enabled?: boolean;
}

export interface UseWebhookMonitorResult {
  data: AdminWebhookListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useWebhookMonitor(options?: UseWebhookMonitorOptions): UseWebhookMonitorResult {
  const { config } = useClientEnvironment();
  const tenantId = options?.tenantId;

  const queryResult: UseQueryResult<AdminWebhookListResponse> = useQuery<AdminWebhookListResponse>({
    queryKey: ['webhookMonitor', tenantId ?? 'all'],
    queryFn: async (): Promise<AdminWebhookListResponse> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });
      return client.listWebhooks(tenantId);
    },
    staleTime: 30000,
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
