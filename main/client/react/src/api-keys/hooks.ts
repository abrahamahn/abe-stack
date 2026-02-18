// main/client/react/src/api-keys/hooks.ts
/**
 * API Keys React Hooks
 *
 * Uses useQuery/useMutation for API key CRUD operations.
 */

import { createApiKeysClient } from '@bslt/api';
import { useMemo } from 'react';

import { useMutation } from '../query/useMutation';
import { useQuery } from '../query/useQuery';

import type {
  ApiKeyItem,
  ApiKeysClientConfig,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  DeleteApiKeyResponse,
  RevokeApiKeyResponse,
} from '@bslt/api';

// ============================================================================
// Query Keys
// ============================================================================

export const apiKeysQueryKeys = {
  all: ['api-keys'] as const,
  list: () => [...apiKeysQueryKeys.all, 'list'] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface UseApiKeysOptions {
  clientConfig: ApiKeysClientConfig;
  autoFetch?: boolean;
}

export interface ApiKeysState {
  apiKeys: ApiKeyItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseCreateApiKeyState {
  create: (payload: CreateApiKeyRequest) => Promise<CreateApiKeyResponse>;
  isLoading: boolean;
  error: Error | null;
}

export interface UseRevokeApiKeyState {
  revoke: (keyId: string) => Promise<RevokeApiKeyResponse>;
  isLoading: boolean;
  error: Error | null;
}

export interface UseDeleteApiKeyState {
  remove: (keyId: string) => Promise<DeleteApiKeyResponse>;
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// Hooks
// ============================================================================

export function useApiKeys(options: UseApiKeysOptions): ApiKeysState {
  const { clientConfig, autoFetch = true } = options;
  const client = useMemo(() => createApiKeysClient(clientConfig), [clientConfig]);

  const query = useQuery({
    queryKey: apiKeysQueryKeys.list(),
    queryFn: () => client.list(),
    enabled: autoFetch,
  });

  return {
    apiKeys: query.data?.apiKeys ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    refresh: query.refetch,
  };
}

export function useCreateApiKey(
  clientConfig: ApiKeysClientConfig,
  options?: { onSuccess?: (response: CreateApiKeyResponse) => void },
): UseCreateApiKeyState {
  const client = useMemo(() => createApiKeysClient(clientConfig), [clientConfig]);

  const mutation = useMutation({
    mutationFn: (payload: CreateApiKeyRequest) => client.create(payload),
    onSuccess: (data) => {
      options?.onSuccess?.(data);
    },
    invalidateOnSuccess: [apiKeysQueryKeys.list()],
  });

  return {
    create: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error ?? null,
  };
}

export function useRevokeApiKey(
  clientConfig: ApiKeysClientConfig,
  options?: { onSuccess?: () => void },
): UseRevokeApiKeyState {
  const client = useMemo(() => createApiKeysClient(clientConfig), [clientConfig]);

  const mutation = useMutation({
    mutationFn: (keyId: string) => client.revoke(keyId),
    onSuccess: () => {
      options?.onSuccess?.();
    },
    invalidateOnSuccess: [apiKeysQueryKeys.list()],
  });

  return {
    revoke: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error ?? null,
  };
}

export function useDeleteApiKey(
  clientConfig: ApiKeysClientConfig,
  options?: { onSuccess?: () => void },
): UseDeleteApiKeyState {
  const client = useMemo(() => createApiKeysClient(clientConfig), [clientConfig]);

  const mutation = useMutation({
    mutationFn: (keyId: string) => client.remove(keyId),
    onSuccess: () => {
      options?.onSuccess?.();
    },
    invalidateOnSuccess: [apiKeysQueryKeys.list()],
  });

  return {
    remove: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error ?? null,
  };
}
