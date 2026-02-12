// src/server/db/src/schema/system.ts
/**
 * System Infrastructure Schema Types
 *
 * TypeScript interfaces for jobs, audit_events, webhooks, and
 * webhook_deliveries tables.
 * Maps to migration 0005_system.sql.
 */

import {
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  WEBHOOK_DELIVERY_STATUSES,
  type AuditCategory,
  type AuditSeverity,
  type WebhookDeliveryStatus,
} from '@abe-stack/shared';

// Re-export shared constants for consumers that import from schema
export { AUDIT_CATEGORIES, AUDIT_SEVERITIES, WEBHOOK_DELIVERY_STATUSES };
export type { AuditCategory, AuditSeverity, WebhookDeliveryStatus };

// ============================================================================
// Enums
// ============================================================================

/** Lifecycle states for a background job */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead';

/** All valid job statuses (DB-specific; differs from shared domain JOB_STATUSES) */
export const JOB_STATUSES = ['pending', 'processing', 'completed', 'failed', 'dead'] as const;

// ============================================================================
// Table Names
// ============================================================================

export const JOBS_TABLE = 'jobs';
export const AUDIT_EVENTS_TABLE = 'audit_events';
export const WEBHOOKS_TABLE = 'webhooks';
export const WEBHOOK_DELIVERIES_TABLE = 'webhook_deliveries';

// ============================================================================
// Job Types
// ============================================================================

/**
 * Background job record (SELECT result).
 * Postgres-backed job queue with priority and retry support.
 *
 * @see 0005_system.sql — priority range [-100, 100], max_attempts >= 1
 */
export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  idempotencyKey: string | null;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

/**
 * Fields for inserting a new job.
 */
export interface NewJob {
  id?: string;
  type: string;
  payload?: Record<string, unknown>;
  status?: JobStatus;
  priority?: number;
  attempts?: number;
  maxAttempts?: number;
  lastError?: string | null;
  idempotencyKey?: string | null;
  scheduledAt?: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt?: Date;
}

/**
 * Fields for updating an existing job.
 * Primarily used by the queue processor to advance state.
 */
export interface UpdateJob {
  status?: JobStatus;
  attempts?: number;
  lastError?: string | null;
  scheduledAt?: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

// ============================================================================
// Audit Event Types
// ============================================================================

/**
 * Audit event record (SELECT result).
 * Append-only table — no UpdateAuditEvent type.
 *
 * @see 0005_system.sql — action format: "noun.verb" (e.g., "user.created")
 */
export interface AuditEvent {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  action: string;
  category: AuditCategory;
  severity: AuditSeverity;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * Fields for inserting a new audit event.
 */
export interface NewAuditEvent {
  id?: string;
  tenantId?: string | null;
  actorId?: string | null;
  action: string;
  category?: AuditCategory;
  severity?: AuditSeverity;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Webhook registration record (SELECT result).
 *
 * @see 0005_system.sql
 */
export interface Webhook {
  id: string;
  tenantId: string | null;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fields for inserting a new webhook.
 */
export interface NewWebhook {
  id?: string;
  tenantId?: string | null;
  url: string;
  events?: string[];
  secret: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Fields for updating an existing webhook.
 */
export interface UpdateWebhook {
  url?: string;
  events?: string[];
  secret?: string;
  isActive?: boolean;
  updatedAt?: Date;
}

// ============================================================================
// Webhook Delivery Types
// ============================================================================

/**
 * Webhook delivery attempt record (SELECT result).
 *
 * @see 0005_system.sql — attempts >= 0
 */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
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

/**
 * Fields for inserting a new webhook delivery.
 */
export interface NewWebhookDelivery {
  id?: string;
  webhookId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  responseStatus?: number | null;
  responseBody?: string | null;
  status?: WebhookDeliveryStatus;
  attempts?: number;
  nextRetryAt?: Date | null;
  deliveredAt?: Date | null;
  createdAt?: Date;
}

/**
 * Fields for updating an existing webhook delivery.
 * Used by the delivery processor to record results.
 */
export interface UpdateWebhookDelivery {
  responseStatus?: number | null;
  responseBody?: string | null;
  status?: WebhookDeliveryStatus;
  attempts?: number;
  nextRetryAt?: Date | null;
  deliveredAt?: Date | null;
}

// ============================================================================
// Column Name Mappings (camelCase TS → snake_case SQL)
// ============================================================================

export const JOB_COLUMNS = {
  id: 'id',
  type: 'type',
  payload: 'payload',
  status: 'status',
  priority: 'priority',
  attempts: 'attempts',
  maxAttempts: 'max_attempts',
  lastError: 'last_error',
  idempotencyKey: 'idempotency_key',
  scheduledAt: 'scheduled_at',
  startedAt: 'started_at',
  completedAt: 'completed_at',
  createdAt: 'created_at',
} as const;

export const AUDIT_EVENT_COLUMNS = {
  id: 'id',
  tenantId: 'tenant_id',
  actorId: 'actor_id',
  action: 'action',
  category: 'category',
  severity: 'severity',
  resource: 'resource',
  resourceId: 'resource_id',
  metadata: 'metadata',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  createdAt: 'created_at',
} as const;

export const WEBHOOK_COLUMNS = {
  id: 'id',
  tenantId: 'tenant_id',
  url: 'url',
  events: 'events',
  secret: 'secret',
  isActive: 'is_active',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

export const WEBHOOK_DELIVERY_COLUMNS = {
  id: 'id',
  webhookId: 'webhook_id',
  eventType: 'event_type',
  payload: 'payload',
  responseStatus: 'response_status',
  responseBody: 'response_body',
  status: 'status',
  attempts: 'attempts',
  nextRetryAt: 'next_retry_at',
  deliveredAt: 'delivered_at',
  createdAt: 'created_at',
} as const;
