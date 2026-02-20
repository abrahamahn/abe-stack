// main/client/api/src/webhooks/index.ts

export { createWebhookClient } from './client';
export type {
  CreateWebhookRequest,
  DeliveryListResponse,
  DeliveryReplayResponse,
  RotateSecretResponse,
  UpdateWebhookRequest,
  WebhookClient,
  WebhookClientConfig,
  WebhookDeleteResponse,
  WebhookDeliveryItem,
  WebhookItem,
  WebhookListResponse,
  WebhookMutationResponse,
  WebhookResponse,
  WebhookWithDeliveries,
} from './client';
