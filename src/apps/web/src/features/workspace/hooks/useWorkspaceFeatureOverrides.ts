// src/apps/web/src/features/workspace/hooks/useWorkspaceFeatureOverrides.ts
/**
 * Workspace Feature Overrides Hooks
 *
 * Hooks for managing tenant-specific feature flag overrides.
 */

import { useMutation, useQuery } from '@abe-stack/client-engine';
import { useClientEnvironment } from '@app/ClientEnvironment';

import { createAdminApiClient } from '../../admin/services/adminApi';

import type { UseQueryResult } from '@abe-stack/client-engine';

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
        getToken: (): string | null => localStorage.getItem('accessToken'),
      });

      // Fetch both flags and overrides in parallel
      const [flagsResponse, overridesResponse] = await Promise.all([
        client.listFeatureFlags(),
        fetch(`${config.apiUrl}/api/admin/tenants/${tenantId}/feature-overrides`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}`,
          },
        }).then((res) => res.json() as Promise<TenantOverridesResponse>),
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
      const token = localStorage.getItem('accessToken') ?? '';

      // If state is 'inherit', delete the override
      if (state === 'inherit') {
        await fetch(
          `${config.apiUrl}/api/admin/tenants/${tenantId}/feature-overrides/${key}/delete`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );
        return { tenantId, key, value: null, isEnabled: false };
      }

      // Otherwise, set the override
      const response = await fetch(
        `${config.apiUrl}/api/admin/tenants/${tenantId}/feature-overrides/${key}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isEnabled: state === 'on',
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to set feature override');
      }

      const data = (await response.json()) as { override: TenantOverride };
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
