// main/client/react/src/webhooks/hooks.ts
/**
 * Webhook React Hooks
 *
 * Hooks for managing webhooks: list, get, create, update, delete, rotate secret.
 * Uses useQuery for reads and useMutation for writes.
 */

import { createWebhookClient } from '@abe-stack/api';
import { useCallback, useMemo } from 'react';


import { useMutation } from '../query/useMutation';
import { useQuery } from '../query/useQuery';

import type {
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookClientConfig,
  WebhookItem,
  WebhookWithDeliveries,
} from '@abe-stack/api';

// ============================================================================
// Query Keys
// ============================================================================

export const webhookQueryKeys = {
  all: ['webhooks'] as const,
  list: () => [...webhookQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...webhookQueryKeys.all, 'detail', id] as const,
} as const;

// ============================================================================
// useWebhooks (list)
// ============================================================================

export interface WebhooksState {
  webhooks: WebhookItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useWebhooks(clientConfig: WebhookClientConfig): WebhooksState {
  const client = useMemo(() => createWebhookClient(clientConfig), [clientConfig.baseUrl]);

  const query = useQuery({
    queryKey: webhookQueryKeys.list(),
    queryFn: () => client.list(),
  });

  const handleRefresh = useCallback(async (): Promise<void> => {
    await query.refetch();
  }, [query.refetch]);

  return {
    webhooks: query.data?.webhooks ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    refresh: handleRefresh,
  };
}

// ============================================================================
// useWebhook (single detail)
// ============================================================================

export interface WebhookDetailState {
  webhook: WebhookWithDeliveries | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useWebhook(
  clientConfig: WebhookClientConfig,
  id: string | null,
): WebhookDetailState {
  const client = useMemo(() => createWebhookClient(clientConfig), [clientConfig.baseUrl]);

  const query = useQuery({
    queryKey: webhookQueryKeys.detail(id ?? ''),
    queryFn: () => client.get(id as string),
    enabled: id !== null,
  });

  const handleRefresh = useCallback(async (): Promise<void> => {
    await query.refetch();
  }, [query.refetch]);

  return {
    webhook: query.data?.webhook ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
    refresh: handleRefresh,
  };
}

// ============================================================================
// useCreateWebhook
// ============================================================================

export interface CreateWebhookState {
  create: (data: CreateWebhookRequest) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useCreateWebhook(
  clientConfig: WebhookClientConfig,
  options?: { onSuccess?: () => void },
): CreateWebhookState {
  const client = useMemo(() => createWebhookClient(clientConfig), [clientConfig.baseUrl]);

  const mutation = useMutation({
    mutationFn: (data: CreateWebhookRequest) => client.create(data),
    onSuccess: () => {
      options?.onSuccess?.();
    },
    invalidateOnSuccess: [webhookQueryKeys.list()],
  });

  const handleCreate = useCallback(
    async (data: CreateWebhookRequest): Promise<void> => {
      await mutation.mutateAsync(data);
    },
    [mutation.mutateAsync],
  );

  return { create: handleCreate, isLoading: mutation.isPending, error: mutation.error ?? null };
}

// ============================================================================
// useUpdateWebhook
// ============================================================================

export interface UpdateWebhookState {
  update: (id: string, data: UpdateWebhookRequest) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useUpdateWebhook(
  clientConfig: WebhookClientConfig,
  options?: { onSuccess?: () => void },
): UpdateWebhookState {
  const client = useMemo(() => createWebhookClient(clientConfig), [clientConfig.baseUrl]);

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWebhookRequest }) =>
      client.update(id, data),
    onSuccess: () => {
      options?.onSuccess?.();
    },
    invalidateOnSuccess: [webhookQueryKeys.list()],
  });

  const handleUpdate = useCallback(
    async (id: string, data: UpdateWebhookRequest): Promise<void> => {
      await mutation.mutateAsync({ id, data });
    },
    [mutation.mutateAsync],
  );

  return { update: handleUpdate, isLoading: mutation.isPending, error: mutation.error ?? null };
}

// ============================================================================
// useDeleteWebhook
// ============================================================================

export interface DeleteWebhookState {
  remove: (id: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useDeleteWebhook(
  clientConfig: WebhookClientConfig,
  options?: { onSuccess?: () => void },
): DeleteWebhookState {
  const client = useMemo(() => createWebhookClient(clientConfig), [clientConfig.baseUrl]);

  const mutation = useMutation({
    mutationFn: (id: string) => client.remove(id),
    onSuccess: () => {
      options?.onSuccess?.();
    },
    invalidateOnSuccess: [webhookQueryKeys.list()],
  });

  const handleRemove = useCallback(
    async (id: string): Promise<void> => {
      await mutation.mutateAsync(id);
    },
    [mutation.mutateAsync],
  );

  return { remove: handleRemove, isLoading: mutation.isPending, error: mutation.error ?? null };
}

// ============================================================================
// useRotateWebhookSecret
// ============================================================================

export interface RotateWebhookSecretState {
  rotate: (id: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  newSecret: string | null;
}

export function useRotateWebhookSecret(
  clientConfig: WebhookClientConfig,
  options?: { onSuccess?: () => void },
): RotateWebhookSecretState {
  const client = useMemo(() => createWebhookClient(clientConfig), [clientConfig.baseUrl]);

  const mutation = useMutation({
    mutationFn: (id: string) => client.rotateSecret(id),
    onSuccess: () => {
      options?.onSuccess?.();
    },
  });

  const handleRotate = useCallback(
    async (id: string): Promise<void> => {
      await mutation.mutateAsync(id);
    },
    [mutation.mutateAsync],
  );

  return {
    rotate: handleRotate,
    isLoading: mutation.isPending,
    error: mutation.error ?? null,
    newSecret: mutation.data?.webhook.secret ?? null,
  };
}
