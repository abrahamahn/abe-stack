// main/apps/web/src/features/admin/hooks/useWebhookAdmin.ts
/**
 * Webhook Admin Hooks
 *
 * Thin wrappers around the @bslt/react webhook hooks, wired to the app's
 * ClientEnvironment for baseUrl and auth token.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import {
  useCreateWebhook,
  useDeleteWebhook,
  useReplayDelivery,
  useRotateWebhookSecret,
  useUpdateWebhook,
  useWebhook,
  useWebhookDeliveries,
  useWebhooks,
} from '@bslt/react';
import { useMemo } from 'react';

import type { WebhookClientConfig } from '@bslt/client-engine';

// ============================================================================
// Config Helper
// ============================================================================

function useWebhookClientConfig(): WebhookClientConfig {
  const { config } = useClientEnvironment();
  return useMemo(
    () => ({
      baseUrl: config.apiUrl,
      getToken: getAccessToken,
    }),
    [config.apiUrl],
  );
}

// ============================================================================
// List Hooks
// ============================================================================

export function useAdminWebhooks() {
  const clientConfig = useWebhookClientConfig();
  return useWebhooks(clientConfig);
}

export function useAdminWebhook(id: string | null) {
  const clientConfig = useWebhookClientConfig();
  return useWebhook(clientConfig, id);
}

export function useAdminWebhookDeliveries(webhookId: string | null) {
  const clientConfig = useWebhookClientConfig();
  return useWebhookDeliveries(clientConfig, webhookId);
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useAdminCreateWebhook(options?: { onSuccess?: () => void }) {
  const clientConfig = useWebhookClientConfig();
  return useCreateWebhook(clientConfig, options);
}

export function useAdminUpdateWebhook(options?: { onSuccess?: () => void }) {
  const clientConfig = useWebhookClientConfig();
  return useUpdateWebhook(clientConfig, options);
}

export function useAdminDeleteWebhook(options?: { onSuccess?: () => void }) {
  const clientConfig = useWebhookClientConfig();
  return useDeleteWebhook(clientConfig, options);
}

export function useAdminRotateWebhookSecret(options?: { onSuccess?: () => void }) {
  const clientConfig = useWebhookClientConfig();
  return useRotateWebhookSecret(clientConfig, options);
}

export function useAdminReplayDelivery(options?: { onSuccess?: () => void; webhookId?: string }) {
  const clientConfig = useWebhookClientConfig();
  return useReplayDelivery(clientConfig, options);
}
