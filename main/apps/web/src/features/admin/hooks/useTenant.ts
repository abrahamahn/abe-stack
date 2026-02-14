// main/apps/web/src/features/admin/hooks/useTenant.ts
/**
 * useTenant hook
 *
 * Fetch and manage a single tenant for admin purposes.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { createAdminApiClient } from '../services/adminApi';

import type { AdminTenantDetailLocal } from '../services/adminApi';

export interface UseTenantState {
  tenant: AdminTenantDetailLocal | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseTenantResult extends UseTenantState {
  refresh: () => Promise<void>;
  setTenant: (tenant: AdminTenantDetailLocal | null) => void;
  suspendTenant: (reason: string) => Promise<void>;
  unsuspendTenant: () => Promise<void>;
  isSuspending: boolean;
}

/**
 * Hook for fetching and managing a single tenant
 */
export function useTenant(tenantId: string | null): UseTenantResult {
  const { config } = useClientEnvironment();
  const [state, setState] = useState<UseTenantState>({
    tenant: null,
    isLoading: false,
    error: null,
  });
  const [isSuspending, setIsSuspending] = useState(false);

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      }),
    [config.apiUrl],
  );

  const fetchTenant = useCallback(
    async (id: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await adminApi.getTenant(id);
        setState({
          tenant: result,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load tenant';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    },
    [adminApi],
  );

  useEffect(() => {
    if (tenantId !== null && tenantId !== '') {
      fetchTenant(tenantId).catch(() => {
        // Error is already handled in fetchTenant
      });
    } else {
      setState({ tenant: null, isLoading: false, error: null });
    }
  }, [tenantId, fetchTenant]);

  const refresh = useCallback(async () => {
    if (tenantId !== null && tenantId !== '') {
      await fetchTenant(tenantId);
    }
  }, [tenantId, fetchTenant]);

  const setTenant = useCallback((tenant: AdminTenantDetailLocal | null) => {
    setState((prev) => ({ ...prev, tenant }));
  }, []);

  const suspendTenantAction = useCallback(
    async (reason: string) => {
      if (tenantId === null || tenantId === '') return;
      setIsSuspending(true);
      setState((prev) => ({ ...prev, error: null }));

      try {
        await adminApi.suspendTenant(tenantId, reason);
        await fetchTenant(tenantId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to suspend tenant';
        setState((prev) => ({ ...prev, error: errorMessage }));
      } finally {
        setIsSuspending(false);
      }
    },
    [tenantId, adminApi, fetchTenant],
  );

  const unsuspendTenantAction = useCallback(async () => {
    if (tenantId === null || tenantId === '') return;
    setIsSuspending(true);
    setState((prev) => ({ ...prev, error: null }));

    try {
      await adminApi.unsuspendTenant(tenantId);
      await fetchTenant(tenantId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsuspend tenant';
      setState((prev) => ({ ...prev, error: errorMessage }));
    } finally {
      setIsSuspending(false);
    }
  }, [tenantId, adminApi, fetchTenant]);

  return {
    ...state,
    refresh,
    setTenant,
    suspendTenant: suspendTenantAction,
    unsuspendTenant: unsuspendTenantAction,
    isSuspending,
  };
}
