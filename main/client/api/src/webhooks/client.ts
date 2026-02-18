// main/client/api/src/webhooks/client.ts
/**
 * Webhook API Client
 *
 * Type-safe client for interacting with the webhook API endpoints.
 * Follows the same pattern as billing/client.ts.
 */

import {
  rotateSecretResponseSchema,
  webhookDeleteResponseSchema,
  webhookListResponseSchema,
  webhookMutationResponseSchema,
  webhookResponseSchema,
} from '@bslt/shared';

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';

// ============================================================================
// Types
// ============================================================================

export type WebhookClientConfig = BaseClientConfig;

/** Webhook item as returned by the API (dates serialized as strings) */
export interface WebhookItem {
  id: string;
  tenantId: string | null;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Delivery summary for a webhook */
export interface WebhookDeliveryItem {
  id: string;
  eventType: string;
  status: string;
  attempts: number;
  createdAt: string;
  deliveredAt: string | null;
}

/** Webhook with delivery stats */
export interface WebhookWithDeliveries extends WebhookItem {
  recentDeliveries: WebhookDeliveryItem[];
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: string[];
  isActive?: boolean;
}

export interface WebhookListResponse {
  webhooks: WebhookItem[];
}

export interface WebhookResponse {
  webhook: WebhookWithDeliveries;
}

export interface WebhookMutationResponse {
  webhook: WebhookItem;
}

export interface WebhookDeleteResponse {
  message: string;
}

export interface RotateSecretResponse {
  webhook: WebhookItem;
}

export interface WebhookClient {
  create: (data: CreateWebhookRequest) => Promise<WebhookMutationResponse>;
  list: () => Promise<WebhookListResponse>;
  get: (id: string) => Promise<WebhookResponse>;
  update: (id: string, data: UpdateWebhookRequest) => Promise<WebhookMutationResponse>;
  remove: (id: string) => Promise<WebhookDeleteResponse>;
  rotateSecret: (id: string) => Promise<RotateSecretResponse>;
}

// ============================================================================
// Client Implementation
// ============================================================================

export function createWebhookClient(config: WebhookClientConfig): WebhookClient {
  const factory = createRequestFactory(config);

  return {
    async create(data: CreateWebhookRequest): Promise<WebhookMutationResponse> {
      const parsed = await apiRequest(
        factory,
        '/webhooks',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        true,
        webhookMutationResponseSchema,
      );
      return parsed as unknown as WebhookMutationResponse;
    },

    async list(): Promise<WebhookListResponse> {
      const parsed = await apiRequest(
        factory,
        '/webhooks/list',
        undefined,
        true,
        webhookListResponseSchema,
      );
      return parsed as unknown as WebhookListResponse;
    },

    async get(id: string): Promise<WebhookResponse> {
      const parsed = await apiRequest(
        factory,
        `/webhooks/${id}`,
        undefined,
        true,
        webhookResponseSchema,
      );
      return parsed as unknown as WebhookResponse;
    },

    async update(id: string, data: UpdateWebhookRequest): Promise<WebhookMutationResponse> {
      const parsed = await apiRequest(
        factory,
        `/webhooks/${id}/update`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        true,
        webhookMutationResponseSchema,
      );
      return parsed as unknown as WebhookMutationResponse;
    },

    async remove(id: string): Promise<WebhookDeleteResponse> {
      const parsed = await apiRequest(
        factory,
        `/webhooks/${id}/delete`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        true,
        webhookDeleteResponseSchema,
      );
      return parsed as unknown as WebhookDeleteResponse;
    },

    async rotateSecret(id: string): Promise<RotateSecretResponse> {
      const parsed = await apiRequest(
        factory,
        `/webhooks/${id}/rotate-secret`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        true,
        rotateSecretResponseSchema,
      );
      return parsed as unknown as RotateSecretResponse;
    },
  };
}
