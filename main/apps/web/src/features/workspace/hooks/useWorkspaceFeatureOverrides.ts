// main/apps/web/src/features/workspace/hooks/useWorkspaceFeatureOverrides.ts
/**
 * Workspace Feature Overrides Hooks
 *
 * Hooks for managing tenant-specific feature flag overrides.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { getApiClient } from '@bslt/api';
import { useMutation, useQuery } from '@bslt/react';

import { createAdminApiClient } from '../../admin/services/adminApi';

import type { UseQueryResult } from '@bslt/react';

// ============================================================================
// Types
// ============================================================================

export interface TenantOverride {
  tenantId: string;
  key: string;
  value: unknown;
  isEnabled: boolean;
}

export interface TenantOverridesResponse {
  overrides: TenantOverride[];
}

export interface SetOverrideRequest {
  value?: unknown;
  isEnabled?: boolean;
}

export interface FlagWithOverride {
  key: string;
  description: string | null;
  globalEnabled: boolean;
  overrideState: 'inherit' | 'on' | 'off';
}

// ============================================================================
// List Feature Flags with Overrides
// ============================================================================

export interface UseWorkspaceFeatureOverridesOptions {
  enabled?: boolean;
}

export interface UseWorkspaceFeatureOverridesResult {
  flags: FlagWithOverride[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWorkspaceFeatureOverrides(
  tenantId: string,
  options?: UseWorkspaceFeatureOverridesOptions,
): UseWorkspaceFeatureOverridesResult {
  const { config } = useClientEnvironment();

  const queryOptions: {
    queryKey: string[];
    queryFn: () => Promise<FlagWithOverride[]>;
    staleTime: number;
    enabled?: boolean;
  } = {
    queryKey: ['workspaceFeatureOverrides', tenantId],
    queryFn: async (): Promise<FlagWithOverride[]> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });
      const api = getApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });

      // Fetch both flags and overrides in parallel
      const [flagsResponse, overridesResponse] = await Promise.all([
        client.listFeatureFlags(),
        api.listTenantFeatureOverrides(tenantId) as Promise<TenantOverridesResponse>,
      ]);

      // Build a map of overrides by key
      const overrideMap = new Map<string, TenantOverride>();
      for (const override of overridesResponse.overrides) {
        overrideMap.set(override.key, override);
      }

      // Merge flags with their overrides
      return flagsResponse.flags.map((flag) => {
        const override = overrideMap.get(flag.key);
        let overrideState: 'inherit' | 'on' | 'off' = 'inherit';

        if (override !== undefined) {
          overrideState = override.isEnabled ? 'on' : 'off';
        }

        return {
          key: flag.key,
          description: flag.description,
          globalEnabled: flag.isEnabled,
          overrideState,
        };
      });
    },
    staleTime: 30000,
  };

  if (options?.enabled !== undefined) {
    queryOptions.enabled = options.enabled;
  }

  const queryResult: UseQueryResult<FlagWithOverride[]> =
    useQuery<FlagWithOverride[]>(queryOptions);

  return {
    flags: queryResult.data ?? [],
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}

// ============================================================================
// Set Feature Override
// ============================================================================

export interface UseSetFeatureOverrideOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseSetFeatureOverrideResult {
  setOverride: (tenantId: string, key: string, state: 'inherit' | 'on' | 'off') => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useSetFeatureOverride(
  options?: UseSetFeatureOverrideOptions,
): UseSetFeatureOverrideResult {
  const { config } = useClientEnvironment();

  const mutation = useMutation<
    TenantOverride,
    Error,
    { tenantId: string; key: string; state: 'inherit' | 'on' | 'off' }
  >({
    mutationFn: async ({
      tenantId,
      key,
      state,
    }: {
      tenantId: string;
      key: string;
      state: 'inherit' | 'on' | 'off';
    }): Promise<TenantOverride> => {
      const api = getApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });

      // If state is 'inherit', delete the override
      if (state === 'inherit') {
        await api.deleteTenantFeatureOverride(tenantId, key);
        return { tenantId, key, value: null, isEnabled: false };
      }

      // Otherwise, set the override
      const data = (await api.setTenantFeatureOverride(tenantId, key, {
        isEnabled: state === 'on',
      })) as { override: TenantOverride };
      return data.override;
    },
    onSuccess: () => {
      options?.onSuccess?.();
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    setOverride: (tenantId: string, key: string, state: 'inherit' | 'on' | 'off'): void => {
      mutation.mutate({ tenantId, key, state });
    },
    isLoading: mutation.status === 'pending',
    isError: mutation.status === 'error',
    error: mutation.error,
  };
}
