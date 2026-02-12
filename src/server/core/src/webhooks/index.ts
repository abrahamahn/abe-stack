// src/server/core/src/webhooks/index.ts
/**
 * Webhooks Module
 *
 * Webhook subscription management, event dispatching, payload signing,
 * and delivery tracking for tenant-scoped webhook integrations.
 */

// Routes (for auto-registration)
export { webhookRoutes } from './routes';

// Handlers
export {
  handleCreateWebhook,
  handleDeleteWebhook,
  handleGetWebhook,
  handleListWebhooks,
  handleRotateSecret,
  handleUpdateWebhook,
} from './handlers';

// Service (business logic)
export {
  createWebhook,
  deleteWebhook,
  generateWebhookSecret,
  getWebhook,
  listWebhooks,
  rotateWebhookSecret,
  updateWebhook,
} from './service';

// Delivery service
export {
  calculateRetryDelay,
  dispatchWebhookEvent,
  recordDeliveryResult,
  signPayload,
  verifySignature,
} from './delivery';

// Types
export type {
  CreateWebhookData,
  DeliverySummary,
  UpdateWebhookData,
  WebhookDispatchResult,
  WebhooksModuleDeps,
  WebhooksRequest,
  WebhookWithStats,
} from './types';

export {
  ERROR_MESSAGES,
  MAX_DELIVERY_ATTEMPTS,
  RETRY_DELAYS_MINUTES,
  SUBSCRIBABLE_EVENT_TYPES,
  WEBHOOK_EVENT_TYPES,
} from './types';
export type { WebhookEventType } from './types';
