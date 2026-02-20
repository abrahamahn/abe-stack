// main/apps/web/src/features/admin/hooks/useWebhookMonitorDeliveries.ts
/**
 * useWebhookMonitorDeliveries hook
 *
 * Fetch delivery logs for a specific webhook with replay support.
 * Uses the admin /admin/webhooks/:id/deliveries endpoint.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useMutation, useQuery } from '@bslt/react';

import { createAdminApiClient } from '../services/adminApi';

import type {
  AdminWebhookDeliveryListResponse,
  AdminWebhookReplayResponse,
} from '../services/adminApi';
import type { UseQueryResult } from '@bslt/react';

// ============================================================================
// Types
// ============================================================================

export interface UseWebhookMonitorDeliveriesOptions {
  webhookId: string | null;
  statusFilter?: string | undefined;
  enabled?: boolean | undefined;
}

export interface UseWebhookMonitorDeliveriesResult {
  data: AdminWebhookDeliveryListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  replayDelivery: (deliveryId: string) => void;
  isReplaying: boolean;
  replayError: Error | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useWebhookMonitorDeliveries(
  options: UseWebhookMonitorDeliveriesOptions,
): UseWebhookMonitorDeliveriesResult {
  const { config } = useClientEnvironment();
  const { webhookId, statusFilter } = options;

  const queryResult: UseQueryResult<AdminWebhookDeliveryListResponse> =
    useQuery<AdminWebhookDeliveryListResponse>({
      queryKey: ['webhookMonitorDeliveries', webhookId ?? '', statusFilter ?? 'all'],
      queryFn: async (): Promise<AdminWebhookDeliveryListResponse> => {
        const client = createAdminApiClient({
          baseUrl: config.apiUrl,
          getToken: getAccessToken,
        });
        return client.listWebhookDeliveries(webhookId as string, statusFilter);
      },
      staleTime: 15000,
      enabled: webhookId !== null && (options.enabled ?? true),
    });

  const replayMutation = useMutation<AdminWebhookReplayResponse, Error, string>({
    mutationFn: async (deliveryId: string): Promise<AdminWebhookReplayResponse> => {
      const client = createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });
      return client.replayWebhookDelivery(webhookId as string, deliveryId);
    },
    onSuccess: () => {
      void queryResult.refetch();
    },
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
    replayDelivery: replayMutation.mutate,
    isReplaying: replayMutation.status === 'pending',
    replayError: replayMutation.error,
  };
}
