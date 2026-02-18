// main/apps/web/src/features/admin/hooks/useSecurityEvent.ts
/**
 * useSecurityEvent hook
 *
 * Fetch a single security event by ID.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useQuery } from '@bslt/react';
import { useMemo } from 'react';

import { createAdminApiClient } from '../services/adminApi';

// ============================================================================
// Types
// ============================================================================

interface SecurityEventLocal {
  id: string;
  createdAt: string;
  eventType: string;
  severity: string;
  userId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UseSecurityEventOptions {
  enabled?: boolean;
}

export interface UseSecurityEventResult {
  data: SecurityEventLocal | undefined;
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
        getToken: getAccessToken,
      }),
    [config.apiUrl],
  );

  const queryKey = useMemo(() => ['securityEvent', id], [id]);

  const queryResult = useQuery<SecurityEventLocal>({
    queryKey,
    queryFn: async (): Promise<SecurityEventLocal> => {
      if (id === undefined || id.length === 0) {
        throw new Error('Event ID is required');
      }
      const result = await adminApi.getSecurityEvent(id);
      return result as SecurityEventLocal;
    },
    enabled: id !== undefined && id.length > 0 && options.enabled !== false,
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
