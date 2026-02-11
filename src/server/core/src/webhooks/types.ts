// src/server/core/src/webhooks/types.ts
/**
 * Webhooks Module Types
 *
 * Dependency interface and shared types for the webhooks module.
 * The server provides these dependencies when registering the webhooks module.
 *
 * @module types
 */

import type { DbClient, Repositories } from '@abe-stack/db';
import type { BaseContext, Logger, RequestContext } from '@abe-stack/shared/core';

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Logger interface used by the webhooks module.
 * Extends the shared Logger contract with required child method.
 */
export interface WebhooksLogger extends Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  info(data: Record<string, unknown>, msg: string): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  warn(data: Record<string, unknown>, msg: string): void;
  error(msg: string | Error, data?: Record<string, unknown>): void;
  error(data: unknown, msg?: string): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  debug(data: Record<string, unknown>, msg: string): void;
  child(bindings: Record<string, unknown>): WebhooksLogger;
}

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
  readonly log: WebhooksLogger;
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
// Retry Configuration
// ============================================================================

/**
 * Retry delay schedule in minutes.
 * Exponential backoff: 1m, 5m, 30m, 2h (120m), 12h (720m).
 */
export const RETRY_DELAYS_MINUTES = [1, 5, 30, 120, 720] as const;

/** Maximum number of delivery attempts before marking as dead */
export const MAX_DELIVERY_ATTEMPTS = 5;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  INTERNAL_ERROR: 'Internal server error',
  UNAUTHORIZED: 'Unauthorized',
  WEBHOOK_NOT_FOUND: 'Webhook not found',
  FORBIDDEN: 'You do not have permission to manage webhooks',
} as const;
