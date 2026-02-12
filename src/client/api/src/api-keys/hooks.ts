// src/client/api/src/api-keys/hooks.ts
/**
 * API Keys Hooks
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createApiKeysClient } from './client';

import type {
  ApiKeyItem,
  ApiKeysClientConfig,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from './client';

export const apiKeysQueryKeys = {
  all: ['api-keys'] as const,
  list: () => [...apiKeysQueryKeys.all, 'list'] as const,
} as const;

export interface ApiKeysState {
  apiKeys: ApiKeyItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseApiKeysOptions {
  clientConfig: ApiKeysClientConfig;
  autoFetch?: boolean;
}

export function useApiKeys(options: UseApiKeysOptions): ApiKeysState {
  const { clientConfig, autoFetch = true } = options;
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createApiKeysClient(clientConfig), [clientConfig]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await client.list();
      setApiKeys(response.apiKeys);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (autoFetch) {
      void refresh();
    }
  }, [autoFetch, refresh]);

  return { apiKeys, isLoading, error, refresh };
}

export interface UseCreateApiKeyState {
  create: (payload: CreateApiKeyRequest) => Promise<CreateApiKeyResponse>;
  isLoading: boolean;
  error: Error | null;
}

export function useCreateApiKey(
  clientConfig: ApiKeysClientConfig,
  options?: { onSuccess?: (response: CreateApiKeyResponse) => void },
): UseCreateApiKeyState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const client = useMemo(() => createApiKeysClient(clientConfig), [clientConfig]);

  const create = useCallback(
    async (payload: CreateApiKeyRequest): Promise<CreateApiKeyResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await client.create(payload);
        options?.onSuccess?.(response);
        return response;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client, options],
  );

  return { create, isLoading, error };
}

export interface UseRevokeApiKeyState {
  revoke: (keyId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useRevokeApiKey(
  clientConfig: ApiKeysClientConfig,
  options?: { onSuccess?: () => void },
): UseRevokeApiKeyState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const client = useMemo(() => createApiKeysClient(clientConfig), [clientConfig]);

  const revoke = useCallback(
    async (keyId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await client.revoke(keyId);
        options?.onSuccess?.();
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client, options],
  );

  return { revoke, isLoading, error };
}

export interface UseDeleteApiKeyState {
  remove: (keyId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useDeleteApiKey(
  clientConfig: ApiKeysClientConfig,
  options?: { onSuccess?: () => void },
): UseDeleteApiKeyState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const client = useMemo(() => createApiKeysClient(clientConfig), [clientConfig]);

  const remove = useCallback(
    async (keyId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await client.remove(keyId);
        options?.onSuccess?.();
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client, options],
  );

  return { remove, isLoading, error };
}
