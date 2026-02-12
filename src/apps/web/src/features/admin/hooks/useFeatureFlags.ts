// src/apps/web/src/features/admin/hooks/useFeatureFlags.ts
/**
 * Feature Flags Hook
 *
 * Hook for listing, creating, updating, and deleting feature flags via admin API.
 */

import { useMutation, useQuery } from '@abe-stack/react';
import { tokenStore } from '@abe-stack/shared';
import { useClientEnvironment } from '@app/ClientEnvironment';

import { createAdminApiClient } from '../services/adminApi';

import type {
  CreateFeatureFlagRequest,
  FeatureFlagDeleteResponse,
  FeatureFlagListResponse,
  FeatureFlagResponse,
  UpdateFeatureFlagRequest,
} from '../services/adminApi';
import type { UseQueryResult } from '@abe-stack/react';

// ============================================================================
// List Feature Flags
// ============================================================================

export interface UseFeatureFlagsOptions {
  enabled?: boolean;
}

export interface UseFeatureFlagsResult {
  data: FeatureFlagListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFeatureFlags(options?: UseFeatureFlagsOptions): UseFeatureFlagsResult {
  const { config } = useClientEnvironment();

  const queryOptions: {
    queryKey: string[];
    queryFn: () => Promise<FeatureFlagListResponse>;
    staleTime: number;
    enabled?: boolean;
  } = {
    queryKey: ['featureFlags'],
    queryFn: async (): Promise<FeatureFlagListResponse> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: (): string | null => tokenStore.get(),
      });
      return client.listFeatureFlags();
    },
    staleTime: 30000,
  };

  if (options?.enabled !== undefined) {
    queryOptions.enabled = options.enabled;
  }

  const queryResult: UseQueryResult<FeatureFlagListResponse> =
    useQuery<FeatureFlagListResponse>(queryOptions);

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}

// ============================================================================
// Create Feature Flag
// ============================================================================

export interface UseCreateFeatureFlagOptions {
  onSuccess?: (response: FeatureFlagResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseCreateFeatureFlagResult {
  createFlag: (data: CreateFeatureFlagRequest) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useCreateFeatureFlag(
  options?: UseCreateFeatureFlagOptions,
): UseCreateFeatureFlagResult {
  const { config } = useClientEnvironment();

  const mutation = useMutation<FeatureFlagResponse, Error, CreateFeatureFlagRequest>({
    mutationFn: async (data): Promise<FeatureFlagResponse> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: (): string | null => tokenStore.get(),
      });
      return client.createFeatureFlag(data);
    },
    onSuccess: (response) => {
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    createFlag: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isError: mutation.status === 'error',
    error: mutation.error,
  };
}

// ============================================================================
// Update Feature Flag
// ============================================================================

export interface UseUpdateFeatureFlagOptions {
  onSuccess?: (response: FeatureFlagResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseUpdateFeatureFlagResult {
  updateFlag: (data: { key: string; update: UpdateFeatureFlagRequest }) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useUpdateFeatureFlag(
  options?: UseUpdateFeatureFlagOptions,
): UseUpdateFeatureFlagResult {
  const { config } = useClientEnvironment();

  const mutation = useMutation<
    FeatureFlagResponse,
    Error,
    { key: string; update: UpdateFeatureFlagRequest }
  >({
    mutationFn: async ({ key, update }): Promise<FeatureFlagResponse> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: (): string | null => tokenStore.get(),
      });
      return client.updateFeatureFlag(key, update);
    },
    onSuccess: (response) => {
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    updateFlag: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isError: mutation.status === 'error',
    error: mutation.error,
  };
}

// ============================================================================
// Delete Feature Flag
// ============================================================================

export interface UseDeleteFeatureFlagOptions {
  onSuccess?: (response: FeatureFlagDeleteResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseDeleteFeatureFlagResult {
  deleteFlag: (key: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useDeleteFeatureFlag(
  options?: UseDeleteFeatureFlagOptions,
): UseDeleteFeatureFlagResult {
  const { config } = useClientEnvironment();

  const mutation = useMutation<FeatureFlagDeleteResponse, Error, string>({
    mutationFn: async (key): Promise<FeatureFlagDeleteResponse> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: (): string | null => tokenStore.get(),
      });
      return client.deleteFeatureFlag(key);
    },
    onSuccess: (response) => {
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    deleteFlag: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isError: mutation.status === 'error',
    error: mutation.error,
  };
}
