// main/apps/web/src/features/settings/hooks/useApiKeys.ts
/**
 * API Keys Hooks
 *
 * Hooks for listing, creating, revoking, and deleting API keys.
 */

import { getAccessToken } from '@app/authToken';
import { useMutation, useQuery } from '@bslt/react';

import { createSettingsApi } from '../api';

import type {
  ApiKeyLocal,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ListApiKeysResponse,
  RevokeApiKeyResponse,
} from '../api/settingsApi';

// ============================================================================
// Settings API Instance
// ============================================================================

let settingsApi: ReturnType<typeof createSettingsApi> | null = null;
const apiBaseUrl =
  typeof import.meta.env['VITE_API_URL'] === 'string' ? import.meta.env['VITE_API_URL'] : '';

function getSettingsApi(): ReturnType<typeof createSettingsApi> {
  settingsApi ??= createSettingsApi({
    baseUrl: apiBaseUrl,
    getToken: getAccessToken,
  });
  return settingsApi;
}

// ============================================================================
// List API Keys
// ============================================================================

export interface UseApiKeysResult {
  apiKeys: ApiKeyLocal[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useApiKeys(): UseApiKeysResult {
  const queryResult = useQuery<ListApiKeysResponse>({
    queryKey: ['apiKeys'],
    queryFn: async (): Promise<ListApiKeysResponse> => {
      const api = getSettingsApi();
      return api.listApiKeys();
    },
    staleTime: 30000,
  });

  return {
    apiKeys: queryResult.data?.apiKeys ?? [],
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}

// ============================================================================
// Create API Key
// ============================================================================

export interface UseCreateApiKeyOptions {
  onSuccess?: (response: CreateApiKeyResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseCreateApiKeyResult {
  createKey: (data: CreateApiKeyRequest) => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  data: CreateApiKeyResponse | null;
  reset: () => void;
}

export function useCreateApiKey(options?: UseCreateApiKeyOptions): UseCreateApiKeyResult {
  const mutation = useMutation<CreateApiKeyResponse, Error, CreateApiKeyRequest>({
    mutationFn: async (data): Promise<CreateApiKeyResponse> => {
      const api = getSettingsApi();
      return api.createApiKey(data);
    },
    onSuccess: (response) => {
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    createKey: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isSuccess: mutation.status === 'success',
    isError: mutation.status === 'error',
    error: mutation.error,
    data: mutation.data ?? null,
    reset: mutation.reset,
  };
}

// ============================================================================
// Revoke API Key
// ============================================================================

export interface UseRevokeApiKeyOptions {
  onSuccess?: (response: RevokeApiKeyResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseRevokeApiKeyResult {
  revokeKey: (keyId: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useRevokeApiKey(options?: UseRevokeApiKeyOptions): UseRevokeApiKeyResult {
  const mutation = useMutation<RevokeApiKeyResponse, Error, string>({
    mutationFn: async (keyId): Promise<RevokeApiKeyResponse> => {
      const api = getSettingsApi();
      return api.revokeApiKey(keyId);
    },
    onSuccess: (response) => {
      options?.onSuccess?.(response);
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    revokeKey: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isError: mutation.status === 'error',
    error: mutation.error,
  };
}

// ============================================================================
// Delete API Key
// ============================================================================

export interface UseDeleteApiKeyOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseDeleteApiKeyResult {
  deleteKey: (keyId: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useDeleteApiKey(options?: UseDeleteApiKeyOptions): UseDeleteApiKeyResult {
  const mutation = useMutation<{ message: string }, Error, string>({
    mutationFn: async (keyId): Promise<{ message: string }> => {
      const api = getSettingsApi();
      return api.deleteApiKey(keyId);
    },
    onSuccess: () => {
      options?.onSuccess?.();
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    deleteKey: mutation.mutate,
    isLoading: mutation.status === 'pending',
    isError: mutation.status === 'error',
    error: mutation.error,
  };
}
