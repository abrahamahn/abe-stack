// src/client/api/src/webhooks/hooks.ts
/**
 * Webhook React Hooks
 *
 * Hooks for managing webhooks: list, get, create, update, delete, rotate secret.
 * Follows the same vanilla state pattern as billing/hooks.ts.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createWebhookClient } from './client';

import type {
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookClientConfig,
  WebhookItem,
  WebhookWithDeliveries,
} from './client';

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
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createWebhookClient(clientConfig), [clientConfig.baseUrl]);

  const fetchWebhooks = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await client.list();
      setWebhooks(response.webhooks);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch webhooks'));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void fetchWebhooks();
  }, [fetchWebhooks]);

  return { webhooks, isLoading, error, refresh: fetchWebhooks };
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

export function useWebhook(clientConfig: WebhookClientConfig, id: string | null): WebhookDetailState {
  const [webhook, setWebhook] = useState<WebhookWithDeliveries | null>(null);
  const [isLoading, setIsLoading] = useState(id !== null);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createWebhookClient(clientConfig), [clientConfig.baseUrl]);

  const fetchWebhook = useCallback(async (): Promise<void> => {
    if (id === null) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await client.get(id);
      setWebhook(response.webhook);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch webhook'));
    } finally {
      setIsLoading(false);
    }
  }, [client, id]);

  useEffect(() => {
    void fetchWebhook();
  }, [fetchWebhook]);

  return { webhook, isLoading, error, refresh: fetchWebhook };
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createWebhookClient(clientConfig), [clientConfig.baseUrl]);

  const create = useCallback(
    async (data: CreateWebhookRequest): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        await client.create(data);
        options?.onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create webhook'));
      } finally {
        setIsLoading(false);
      }
    },
    [client, options?.onSuccess],
  );

  return { create, isLoading, error };
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createWebhookClient(clientConfig), [clientConfig.baseUrl]);

  const update = useCallback(
    async (id: string, data: UpdateWebhookRequest): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        await client.update(id, data);
        options?.onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update webhook'));
      } finally {
        setIsLoading(false);
      }
    },
    [client, options?.onSuccess],
  );

  return { update, isLoading, error };
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createWebhookClient(clientConfig), [clientConfig.baseUrl]);

  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        await client.remove(id);
        options?.onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete webhook'));
      } finally {
        setIsLoading(false);
      }
    },
    [client, options?.onSuccess],
  );

  return { remove, isLoading, error };
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const client = useMemo(() => createWebhookClient(clientConfig), [clientConfig.baseUrl]);

  const rotate = useCallback(
    async (id: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await client.rotateSecret(id);
        setNewSecret(response.webhook.secret);
        options?.onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to rotate secret'));
      } finally {
        setIsLoading(false);
      }
    },
    [client, options?.onSuccess],
  );

  return { rotate, isLoading, error, newSecret };
}
