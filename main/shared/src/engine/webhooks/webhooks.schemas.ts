// main/shared/src/domain/webhooks/webhooks.schemas.ts

/**
 * @file Webhook Domain Schemas
 * @description Schemas for webhook registration and delivery validation.
 * @module Domain/Webhooks
 */

import { tenantIdSchema, webhookDeliveryIdSchema, webhookIdSchema } from '../../core/ids';
import {
  coerceDate,
  createEnumSchema,
  createSchema,
  parseBoolean,
  parseNullable,
  parseNullableOptional,
  parseNumber,
  parseOptional,
  parseRecord,
  parseString,
} from '../../core/schema.utils';
import { isoDateTimeSchema } from '../../core/schemas';
import { WEBHOOK_DELIVERY_STATUSES, WEBHOOK_EVENT_TYPES } from '../constants/platform';

import type { TenantId, WebhookDeliveryId, WebhookId } from '../../core/ids';
import type { Schema } from '../../primitives/schema';

/** All valid webhook delivery statuses */
export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number];

/** All valid webhook event type values */
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[keyof typeof WEBHOOK_EVENT_TYPES];

/** Delivery status enum schema */
const deliveryStatusSchema = createEnumSchema(WEBHOOK_DELIVERY_STATUSES, 'delivery status');

// ============================================================================
// Types
// ============================================================================

/** Full webhook registration entity */
export interface Webhook {
  id: WebhookId;
  tenantId: TenantId | null;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Input for registering a new webhook */
export interface CreateWebhook {
  tenantId?: TenantId | null | undefined;
  url: string;
  events: string[];
  secret: string;
  isActive?: boolean | undefined;
}

/** Input for updating a webhook */
export interface UpdateWebhook {
  url?: string | undefined;
  events?: string[] | undefined;
  secret?: string | undefined;
  isActive?: boolean | undefined;
}

/** Full webhook delivery entity */
export interface WebhookDelivery {
  id: WebhookDeliveryId;
  webhookId: WebhookId;
  eventType: string;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  status: WebhookDeliveryStatus;
  attempts: number;
  nextRetryAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
}

/** Input for creating a webhook delivery record */
export interface CreateWebhookDelivery {
  webhookId: WebhookId;
  eventType: string;
  payload?: Record<string, unknown> | undefined;
}

/** Input for updating a webhook delivery */
export interface UpdateWebhookDelivery {
  responseStatus?: number | null | undefined;
  responseBody?: string | null | undefined;
  status?: WebhookDeliveryStatus | undefined;
  attempts?: number | undefined;
  nextRetryAt?: Date | null | undefined;
  deliveredAt?: Date | null | undefined;
}

// ============================================================================
// API DTO Types (HTTP serialized shapes)
// ============================================================================

/** HTTP-safe webhook item (dates serialized as ISO strings). */
export interface WebhookItem {
  id: WebhookId;
  tenantId: TenantId | null;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** HTTP-safe webhook delivery summary item. */
export interface WebhookDeliveryItem {
  id: WebhookDeliveryId;
  eventType: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  createdAt: string;
  deliveredAt: string | null;
}

/** Webhook detail response shape. */
export interface WebhookWithDeliveries extends WebhookItem {
  recentDeliveries: WebhookDeliveryItem[];
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

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse an array of non-empty strings.
 *
 * @param data - Unknown value
 * @param label - Field name for errors
 * @param opts - Optional min/max length
 * @returns Validated string array
 * @complexity O(n) where n is array length
 */
function parseStringArray(data: unknown, label: string, opts?: { min?: number }): string[] {
  if (!Array.isArray(data)) {
    throw new Error(`${label} must be an array`);
  }
  if (opts?.min !== undefined && data.length < opts.min) {
    throw new Error(`${label} must have at least ${String(opts.min)} items`);
  }
  return data.map((item: unknown, i: number) =>
    parseString(item, `${label}[${String(i)}]`, { min: 1 }),
  );
}

// ============================================================================
// Webhook Schemas
// ============================================================================

/**
 * Full webhook registration schema (matches DB SELECT result).
 */
export const webhookSchema: Schema<Webhook> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: webhookIdSchema.parse(obj['id']),
    tenantId: parseNullable(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    url: parseString(obj['url'], 'url', { url: true }),
    events: parseStringArray(obj['events'], 'events'),
    secret: parseString(obj['secret'], 'secret', { min: 1 }),
    isActive: parseBoolean(obj['isActive'], 'isActive'),
    createdAt: coerceDate(obj['createdAt'], 'createdAt'),
    updatedAt: coerceDate(obj['updatedAt'], 'updatedAt'),
  };
});

/**
 * Schema for registering a new webhook.
 */
export const createWebhookSchema: Schema<CreateWebhook> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    tenantId: parseNullableOptional(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    url: parseString(obj['url'], 'url', { url: true }),
    events: parseStringArray(obj['events'], 'events', { min: 1 }),
    secret: parseString(obj['secret'], 'secret', { min: 1 }),
    isActive: parseOptional(obj['isActive'], (v) => parseBoolean(v, 'isActive')),
  };
});

/**
 * Schema for updating an existing webhook.
 */
export const updateWebhookSchema: Schema<UpdateWebhook> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    url: parseOptional(obj['url'], (v) => parseString(v, 'url', { url: true })),
    events: parseOptional(obj['events'], (v) => parseStringArray(v, 'events', { min: 1 })),
    secret: parseOptional(obj['secret'], (v) => parseString(v, 'secret', { min: 1 })),
    isActive: parseOptional(obj['isActive'], (v) => parseBoolean(v, 'isActive')),
  };
});

// ============================================================================
// Webhook Delivery Schemas
// ============================================================================

/**
 * Full webhook delivery schema (matches DB SELECT result).
 */
export const webhookDeliverySchema: Schema<WebhookDelivery> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: webhookDeliveryIdSchema.parse(obj['id']),
    webhookId: webhookIdSchema.parse(obj['webhookId']),
    eventType: parseString(obj['eventType'], 'eventType', { min: 1 }),
    payload: parseRecord(obj['payload'], 'payload'),
    responseStatus: parseNullable(obj['responseStatus'], (v) =>
      parseNumber(v, 'responseStatus', { int: true }),
    ),
    responseBody: parseNullable(obj['responseBody'], (v) => parseString(v, 'responseBody')),
    status: deliveryStatusSchema.parse(obj['status']),
    attempts: parseNumber(obj['attempts'], 'attempts', { int: true, min: 0 }),
    nextRetryAt: parseNullable(obj['nextRetryAt'], (v) => coerceDate(v, 'nextRetryAt')),
    deliveredAt: parseNullable(obj['deliveredAt'], (v) => coerceDate(v, 'deliveredAt')),
    createdAt: coerceDate(obj['createdAt'], 'createdAt'),
  };
});

/**
 * Schema for creating a new webhook delivery record.
 */
export const createWebhookDeliverySchema: Schema<CreateWebhookDelivery> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      webhookId: webhookIdSchema.parse(obj['webhookId']),
      eventType: parseString(obj['eventType'], 'eventType', { min: 1 }),
      payload: parseOptional(obj['payload'], (v) => parseRecord(v, 'payload')),
    };
  },
);

/**
 * Schema for updating a webhook delivery (recording results).
 */
export const updateWebhookDeliverySchema: Schema<UpdateWebhookDelivery> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      responseStatus: parseNullableOptional(obj['responseStatus'], (v) =>
        parseNumber(v, 'responseStatus', { int: true }),
      ),
      responseBody: parseNullableOptional(obj['responseBody'], (v) =>
        parseString(v, 'responseBody'),
      ),
      status: parseOptional(obj['status'], (v) => deliveryStatusSchema.parse(v)),
      attempts: parseOptional(obj['attempts'], (v) =>
        parseNumber(v, 'attempts', { int: true, min: 0 }),
      ),
      nextRetryAt: parseNullableOptional(obj['nextRetryAt'], (v) => coerceDate(v, 'nextRetryAt')),
      deliveredAt: parseNullableOptional(obj['deliveredAt'], (v) => coerceDate(v, 'deliveredAt')),
    };
  },
);

// ============================================================================
// API DTO Schemas
// ============================================================================

export const webhookItemSchema: Schema<WebhookItem> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: webhookIdSchema.parse(obj['id']),
    tenantId: parseNullable(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    url: parseString(obj['url'], 'url', { url: true }),
    events: parseStringArray(obj['events'], 'events'),
    secret: parseString(obj['secret'], 'secret', { min: 1 }),
    isActive: parseBoolean(obj['isActive'], 'isActive'),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
    updatedAt: isoDateTimeSchema.parse(obj['updatedAt']),
  };
});

export const webhookDeliveryItemSchema: Schema<WebhookDeliveryItem> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      id: webhookDeliveryIdSchema.parse(obj['id']),
      eventType: parseString(obj['eventType'], 'eventType', { min: 1 }),
      status: deliveryStatusSchema.parse(obj['status']),
      attempts: parseNumber(obj['attempts'], 'attempts', { int: true, min: 0 }),
      createdAt: isoDateTimeSchema.parse(obj['createdAt']),
      deliveredAt: parseNullable(obj['deliveredAt'], (v) => isoDateTimeSchema.parse(v)),
    };
  },
);

export const webhookWithDeliveriesSchema: Schema<WebhookWithDeliveries> = createSchema(
  (data: unknown) => {
    const base = webhookItemSchema.parse(data);
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    if (!Array.isArray(obj['recentDeliveries'])) {
      throw new Error('recentDeliveries must be an array');
    }

    return {
      ...base,
      recentDeliveries: obj['recentDeliveries'].map((d) => webhookDeliveryItemSchema.parse(d)),
    };
  },
);

export const webhookListResponseSchema: Schema<WebhookListResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    if (!Array.isArray(obj['webhooks'])) {
      throw new Error('webhooks must be an array');
    }
    return {
      webhooks: obj['webhooks'].map((w) => webhookItemSchema.parse(w)),
    };
  },
);

export const webhookResponseSchema: Schema<WebhookResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    webhook: webhookWithDeliveriesSchema.parse(obj['webhook']),
  };
});

export const webhookMutationResponseSchema: Schema<WebhookMutationResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      webhook: webhookItemSchema.parse(obj['webhook']),
    };
  },
);

export const webhookDeleteResponseSchema: Schema<WebhookDeleteResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { message: parseString(obj['message'], 'message', { min: 1 }) };
  },
);

export const rotateSecretResponseSchema: Schema<RotateSecretResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      webhook: webhookItemSchema.parse(obj['webhook']),
    };
  },
);
