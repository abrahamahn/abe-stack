// src/apps/web/src/features/admin/hooks/useRouteManifest.ts
/**
 * useRouteManifest hook
 *
 * Fetch the API route manifest for the admin routes page.
 */

import { useQuery } from '@abe-stack/react';
import { MS_PER_MINUTE, tokenStore } from '@abe-stack/shared';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useMemo } from 'react';

import { createAdminApiClient } from '../services/adminApi';

import type { RouteManifestResponseLocal } from '../services/adminApi';

// ============================================================================
// Types
// ============================================================================

export interface UseRouteManifestOptions {
  enabled?: boolean;
}

export interface UseRouteManifestResult {
  data: RouteManifestResponseLocal | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useRouteManifest(options: UseRouteManifestOptions = {}): UseRouteManifestResult {
  const { config } = useClientEnvironment();

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: (): string | null => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const queryResult = useQuery<RouteManifestResponseLocal>({
    queryKey: ['routeManifest'],
    queryFn: async (): Promise<RouteManifestResponseLocal> => {
      return adminApi.getRouteManifest();
    },
    enabled: options.enabled !== false,
    staleTime: MS_PER_MINUTE,
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
