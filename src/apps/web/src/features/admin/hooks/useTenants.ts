// src/apps/web/src/features/admin/hooks/useTenants.ts
/**
 * useTenants hook
 *
 * Manage admin tenant listing with loading and error states.
 */

import { tokenStore } from '@abe-stack/shared';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { createAdminApiClient } from '../services/adminApi';

import type { AdminTenantLocal } from '../services/adminApi';

export interface UseTenantsState {
  tenants: AdminTenantLocal[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseTenantsResult extends UseTenantsState {
  refresh: () => Promise<void>;
}

/**
 * Hook for listing tenants in admin
 */
export function useTenants(): UseTenantsResult {
  const { config } = useClientEnvironment();
  const [state, setState] = useState<UseTenantsState>({
    tenants: [],
    total: 0,
    isLoading: true,
    error: null,
  });

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: (): string | null => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const fetchTenants = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await adminApi.listTenants();
      setState({
        tenants: result.tenants,
        total: result.total,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tenants';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [adminApi]);

  useEffect(() => {
    fetchTenants().catch(() => {
      // Error is already handled in fetchTenants
    });
  }, [fetchTenants]);

  const refresh = useCallback(async () => {
    await fetchTenants();
  }, [fetchTenants]);

  return {
    ...state,
    refresh,
  };
}
