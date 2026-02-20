// main/apps/web/src/features/admin/hooks/useFeatureFlagOverrides.ts
/**
 * useFeatureFlagOverrides hook
 *
 * Manage per-tenant feature flag overrides.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useMutation, useQuery } from '@bslt/react';

import { createAdminApiClient } from '../services/adminApi';

import type {
  FeatureFlagOverrideDeleteResponse,
  FeatureFlagOverrideListResponse,
  FeatureFlagOverrideResponse,
  SetFeatureFlagOverrideRequest,
} from '../services/adminApi';
import type { UseQueryResult } from '@bslt/react';

// ============================================================================
// List Overrides
// ============================================================================

export interface UseFeatureFlagOverridesOptions {
  flagKey: string | null;
  enabled?: boolean;
}

export interface UseFeatureFlagOverridesResult {
  data: FeatureFlagOverrideListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFeatureFlagOverrides(
  options: UseFeatureFlagOverridesOptions,
): UseFeatureFlagOverridesResult {
  const { config } = useClientEnvironment();
  const { flagKey } = options;

  const queryResult: UseQueryResult<FeatureFlagOverrideListResponse> =
    useQuery<FeatureFlagOverrideListResponse>({
      queryKey: ['featureFlagOverrides', flagKey ?? ''],
      queryFn: async (): Promise<FeatureFlagOverrideListResponse> => {
        const client = createAdminApiClient({
          baseUrl: config.apiUrl,
          getToken: getAccessToken,
        });
        return client.listFeatureFlagOverrides(flagKey as string);
      },
      staleTime: 30000,
      enabled: flagKey !== null && (options.enabled ?? true),
    });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}

// ============================================================================
// Set Override
// ============================================================================

export interface UseSetFeatureFlagOverrideOptions {
  onSuccess?: (response: FeatureFlagOverrideResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseSetFeatureFlagOverrideResult {
  setOverride: (data: { flagKey: string; request: SetFeatureFlagOverrideRequest }) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useSetFeatureFlagOverride(
  options?: UseSetFeatureFlagOverrideOptions,
): UseSetFeatureFlagOverrideResult {
  const { config } = useClientEnvironment();

  const mutation = useMutation<
    FeatureFlagOverrideResponse,
    Error,
    { flagKey: string; request: SetFeatureFlagOverrideRequest }
  >({
    mutationFn: async (vars: {
      flagKey: string;
      request: SetFeatureFlagOverrideRequest;
    }): Promise<FeatureFlagOverrideResponse> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });
      return client.setFeatureFlagOverride(vars.flagKey, vars.request);
    },
    onSuccess: (response: FeatureFlagOverrideResponse) => {
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    setOverride: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isError: mutation.status === 'error',
    error: mutation.error,
  };
}

// ============================================================================
// Delete Override
// ============================================================================

export interface UseDeleteFeatureFlagOverrideOptions {
  onSuccess?: (response: FeatureFlagOverrideDeleteResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseDeleteFeatureFlagOverrideResult {
  deleteOverride: (data: { flagKey: string; tenantId: string }) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useDeleteFeatureFlagOverride(
  options?: UseDeleteFeatureFlagOverrideOptions,
): UseDeleteFeatureFlagOverrideResult {
  const { config } = useClientEnvironment();

  const mutation = useMutation<
    FeatureFlagOverrideDeleteResponse,
    Error,
    { flagKey: string; tenantId: string }
  >({
    mutationFn: async (vars: {
      flagKey: string;
      tenantId: string;
    }): Promise<FeatureFlagOverrideDeleteResponse> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });
      return client.deleteFeatureFlagOverride(vars.flagKey, vars.tenantId);
    },
    onSuccess: (response: FeatureFlagOverrideDeleteResponse) => {
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    deleteOverride: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isError: mutation.status === 'error',
    error: mutation.error,
  };
}
