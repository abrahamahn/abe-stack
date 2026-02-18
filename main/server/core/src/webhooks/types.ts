// main/server/core/src/webhooks/types.ts
/**
 * Webhooks Module Types
 *
 * Dependency interface and shared types for the webhooks module.
 * The server provides these dependencies when registering the webhooks module.
 *
 * @module types
 */

import { MAX_DELIVERY_ATTEMPTS, RETRY_DELAYS_MINUTES, ERROR_MESSAGES as SHARED_ERRORS } from '@bslt/shared/system/constants';
import { SUBSCRIBABLE_EVENT_TYPES, WEBHOOK_EVENT_TYPES, type WebhookEventType } from '@bslt/shared/system/webhooks';

// Re-export webhook constants from shared (canonical source)
export { MAX_DELIVERY_ATTEMPTS, RETRY_DELAYS_MINUTES, SUBSCRIBABLE_EVENT_TYPES, WEBHOOK_EVENT_TYPES, type WebhookEventType };

  import type { BaseContext, RequestContext, ServerLogger } from '@bslt/shared';
  import type { DbClient, Repositories } from '../../../db/src';

// ============================================================================
// Request Types
// ============================================================================

/** Request with auth context for webhook operations */
export type WebhooksRequest = RequestContext;

// ============================================================================
// Webhooks Module Dependencies
// ============================================================================

/**
 * Webhooks module dependencies.
 * Provided by the server composition root.
 */
export interface WebhooksModuleDeps extends BaseContext {
  /** Database client for transactions */
  readonly db: DbClient;
  /** Repository layer for structured database access */
  readonly repos: Repositories;
  /** Logger instance for webhooks module logging */
  readonly log: ServerLogger;
}

// ============================================================================
// Webhook Configuration Types
// ============================================================================

/** Input for creating a new webhook */
export interface CreateWebhookData {
  readonly url: string;
  readonly events: string[];
}

/** Input for updating a webhook */
export interface UpdateWebhookData {
  readonly url?: string | undefined;
  readonly events?: string[] | undefined;
  readonly isActive?: boolean | undefined;
}

/** Webhook with delivery statistics */
export interface WebhookWithStats {
  readonly id: string;
  readonly tenantId: string | null;
  readonly url: string;
  readonly events: string[];
  readonly secret: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly recentDeliveries: readonly DeliverySummary[];
}

/** Summary of a recent delivery attempt */
export interface DeliverySummary {
  readonly id: string;
  readonly eventType: string;
  readonly status: string;
  readonly attempts: number;
  readonly createdAt: Date;
  readonly deliveredAt: Date | null;
}

/** Result of dispatching a webhook event */
export interface WebhookDispatchResult {
  readonly webhookId: string;
  readonly deliveryId: string;
  readonly eventType: string;
  readonly status: string;
}

// ============================================================================
// Size Limits
// ============================================================================

/** Maximum length of stored webhook response body (4KB) */
export const WEBHOOK_RESPONSE_MAX_LENGTH = 4096;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  INTERNAL_ERROR: SHARED_ERRORS.INTERNAL_ERROR,
  UNAUTHORIZED: SHARED_ERRORS.UNAUTHORIZED,
  WEBHOOK_NOT_FOUND: 'Webhook not found',
  FORBIDDEN: 'You do not have permission to manage webhooks',
} as const;
