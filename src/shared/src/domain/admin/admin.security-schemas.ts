// src/shared/src/domain/admin/admin.security-schemas.ts
/**
 * Security Audit Schemas & Contract
 *
 * Admin-only endpoints for viewing and exporting security events.
 * Used by the Security Audit Viewer feature.
 *
 * @module Domain/Admin/Security
 */

import { createSchema } from '../../core/schema.utils';
import { errorResponseSchema, uuidSchema } from '../../core/schemas';
import {
  paginatedResultSchema,
  paginationOptionsSchema,
  type PaginatedResult,
  type PaginationOptions,
} from '../../utils/pagination';

import type { Contract, Schema } from '../../core/api';

// ============================================================================
// Security Event Types
// ============================================================================

/** All recognized security event types (must match DB SecurityEventType in auth.ts) */
export const SECURITY_EVENT_TYPES = [
  // Token events
  'token_reuse',
  'token_reuse_detected',
  'token_family_revoked',
  // Account lifecycle
  'account_locked',
  'account_unlocked',
  // Password events
  'password_changed',
  'password_reset_requested',
  'password_reset_completed',
  // Email events
  'email_verification_sent',
  'email_verified',
  'email_changed',
  // Login/session events
  'login_success',
  'login_failure',
  'logout',
  'suspicious_activity',
  'suspicious_login',
  // Magic link events
  'magic_link_requested',
  'magic_link_verified',
  'magic_link_failed',
  // OAuth events
  'oauth_login_success',
  'oauth_login_failure',
  'oauth_account_created',
  'oauth_link_success',
  'oauth_link_failure',
  'oauth_unlink_success',
  'oauth_unlink_failure',
] as const;

/** Security event type union */
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

/** Security severity levels */
export const SECURITY_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

/** Security severity type */
export type SecuritySeverity = (typeof SECURITY_SEVERITIES)[number];

// ============================================================================
// Security Event Schema
// ============================================================================

/** Security event record */
export interface SecurityEvent {
  id: string;
  userId: string | null;
  email: string | null;
  eventType: string;
  severity: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** @complexity O(1) */
export const securityEventSchema: Schema<SecurityEvent> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid security event');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['id'] !== 'string') throw new Error('id must be a string');
  if (obj['userId'] !== null && typeof obj['userId'] !== 'string') {
    throw new Error('userId must be a string or null');
  }
  if (obj['email'] !== null && typeof obj['email'] !== 'string') {
    throw new Error('email must be a string or null');
  }
  if (typeof obj['eventType'] !== 'string') throw new Error('eventType must be a string');
  if (typeof obj['severity'] !== 'string') throw new Error('severity must be a string');
  if (obj['ipAddress'] !== null && typeof obj['ipAddress'] !== 'string') {
    throw new Error('ipAddress must be a string or null');
  }
  if (obj['userAgent'] !== null && typeof obj['userAgent'] !== 'string') {
    throw new Error('userAgent must be a string or null');
  }
  if (
    obj['metadata'] !== null &&
    (typeof obj['metadata'] !== 'object' || Array.isArray(obj['metadata']))
  ) {
    throw new Error('metadata must be an object or null');
  }
  if (typeof obj['createdAt'] !== 'string') throw new Error('createdAt must be a string');

  return {
    id: obj['id'],
    userId: obj['userId'],
    email: obj['email'],
    eventType: obj['eventType'],
    severity: obj['severity'],
    ipAddress: obj['ipAddress'],
    userAgent: obj['userAgent'],
    metadata: obj['metadata'] as Record<string, unknown> | null,
    createdAt: obj['createdAt'],
  };
});

// ============================================================================
// List Security Events
// ============================================================================

/** Filter criteria for security events */
export interface SecurityEventsFilter {
  eventType?: string;
  severity?: string;
  userId?: string;
  email?: string;
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
}

/** Request for listing security events with pagination */
export interface SecurityEventsListRequest extends PaginationOptions {
  filter?: SecurityEventsFilter;
}

/** @complexity O(1) */
export const securityEventsFilterSchema: Schema<SecurityEventsFilter> = createSchema(
  (data: unknown) => {
    if (data === undefined || data === null) return {};
    if (typeof data !== 'object') throw new Error('filter must be an object');
    const obj = data as Record<string, unknown>;

    const filter: SecurityEventsFilter = {};

    if (obj['eventType'] !== undefined) {
      if (typeof obj['eventType'] !== 'string') throw new Error('eventType must be a string');
      filter.eventType = obj['eventType'];
    }
    if (obj['severity'] !== undefined) {
      if (typeof obj['severity'] !== 'string') throw new Error('severity must be a string');
      if (!SECURITY_SEVERITIES.includes(obj['severity'] as SecuritySeverity)) {
        throw new Error('Invalid severity level');
      }
      filter.severity = obj['severity'];
    }
    if (obj['userId'] !== undefined) {
      if (typeof obj['userId'] !== 'string') throw new Error('userId must be a string');
      filter.userId = obj['userId'];
    }
    if (obj['email'] !== undefined) {
      if (typeof obj['email'] !== 'string') throw new Error('email must be a string');
      filter.email = obj['email'];
    }
    if (obj['ipAddress'] !== undefined) {
      if (typeof obj['ipAddress'] !== 'string') throw new Error('ipAddress must be a string');
      filter.ipAddress = obj['ipAddress'];
    }
    if (obj['startDate'] !== undefined) {
      if (typeof obj['startDate'] !== 'string') throw new Error('startDate must be a string');
      filter.startDate = obj['startDate'];
    }
    if (obj['endDate'] !== undefined) {
      if (typeof obj['endDate'] !== 'string') throw new Error('endDate must be a string');
      filter.endDate = obj['endDate'];
    }

    return filter;
  },
);

/** @complexity O(1) */
export const securityEventsListRequestSchema: Schema<SecurityEventsListRequest> = createSchema(
  (data: unknown) => {
    const pagination = paginationOptionsSchema.parse(data);
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    let filter: SecurityEventsFilter = {};
    if (obj['filter'] !== undefined) {
      filter = securityEventsFilterSchema.parse(obj['filter']);
    }

    return { ...pagination, filter };
  },
);

/** Paginated security events response */
export type SecurityEventsListResponse = PaginatedResult<SecurityEvent>;

/** @complexity O(n) where n = items.length */
export const securityEventsListResponseSchema: Schema<SecurityEventsListResponse> =
  paginatedResultSchema(securityEventSchema);

// ============================================================================
// Get Security Event Detail
// ============================================================================

/** Request for a single security event */
export interface SecurityEventDetailRequest {
  id: string;
}

/** @complexity O(1) */
export const securityEventDetailRequestSchema: Schema<SecurityEventDetailRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid request');
    }
    const obj = data as Record<string, unknown>;
    const id = uuidSchema.parse(obj['id']);
    return { id };
  },
);

/** Security event detail response */
export type SecurityEventDetailResponse = SecurityEvent;

/** @complexity O(1) */
export const securityEventDetailResponseSchema: Schema<SecurityEventDetailResponse> =
  securityEventSchema;

// ============================================================================
// Security Metrics
// ============================================================================

/** Request for security metrics */
export interface SecurityMetricsRequest {
  period?: 'hour' | 'day' | 'week' | 'month';
}

/** @complexity O(1) */
export const securityMetricsRequestSchema: Schema<SecurityMetricsRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    let period: 'hour' | 'day' | 'week' | 'month' = 'day';
    if (obj['period'] !== undefined) {
      if (!['hour', 'day', 'week', 'month'].includes(obj['period'] as string)) {
        throw new Error('period must be one of: hour, day, week, month');
      }
      period = obj['period'] as 'hour' | 'day' | 'week' | 'month';
    }

    return { period };
  },
);

/** Aggregated security metrics */
export interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  tokenReuseCount: number;
  accountLockedCount: number;
  suspiciousLoginCount: number;
  eventsByType: Record<string, number>;
  period: string;
  periodStart: string;
  periodEnd: string;
}

/** @complexity O(k) where k = keys in eventsByType */
export const securityMetricsSchema: Schema<SecurityMetrics> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid security metrics');
  }
  const obj = data as Record<string, unknown>;

  const validateInt = (value: unknown, name: string): number => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      throw new Error(`${name} must be a non-negative integer`);
    }
    return value;
  };

  const validateString = (value: unknown, name: string): string => {
    if (typeof value !== 'string') throw new Error(`${name} must be a string`);
    return value;
  };

  const validateEventsByType = (value: unknown): Record<string, number> => {
    if (
      value === null ||
      value === undefined ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      throw new Error('eventsByType must be an object');
    }
    const record = value as Record<string, unknown>;
    const result: Record<string, number> = {};
    for (const [key, val] of Object.entries(record)) {
      if (typeof val !== 'number') throw new Error(`eventsByType.${key} must be a number`);
      result[key] = val;
    }
    return result;
  };

  return {
    totalEvents: validateInt(obj['totalEvents'], 'totalEvents'),
    criticalEvents: validateInt(obj['criticalEvents'], 'criticalEvents'),
    highEvents: validateInt(obj['highEvents'], 'highEvents'),
    mediumEvents: validateInt(obj['mediumEvents'], 'mediumEvents'),
    lowEvents: validateInt(obj['lowEvents'], 'lowEvents'),
    tokenReuseCount: validateInt(obj['tokenReuseCount'], 'tokenReuseCount'),
    accountLockedCount: validateInt(obj['accountLockedCount'], 'accountLockedCount'),
    suspiciousLoginCount: validateInt(obj['suspiciousLoginCount'], 'suspiciousLoginCount'),
    eventsByType: validateEventsByType(obj['eventsByType']),
    period: validateString(obj['period'], 'period'),
    periodStart: validateString(obj['periodStart'], 'periodStart'),
    periodEnd: validateString(obj['periodEnd'], 'periodEnd'),
  };
});

/** Security metrics response */
export type SecurityMetricsResponse = SecurityMetrics;

/** @complexity O(k) where k = keys in eventsByType */
export const securityMetricsResponseSchema: Schema<SecurityMetricsResponse> = securityMetricsSchema;

// ============================================================================
// Export Security Events
// ============================================================================

/** Request for exporting security events */
export interface SecurityEventsExportRequest {
  format: 'csv' | 'json';
  filter?: SecurityEventsFilter;
}

/** @complexity O(1) */
export const securityEventsExportRequestSchema: Schema<SecurityEventsExportRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid export request');
    }
    const obj = data as Record<string, unknown>;

    if (!['csv', 'json'].includes(obj['format'] as string)) {
      throw new Error('format must be either "csv" or "json"');
    }

    let filter: SecurityEventsFilter = {};
    if (obj['filter'] !== undefined) {
      filter = securityEventsFilterSchema.parse(obj['filter']);
    }

    return {
      format: obj['format'] as 'csv' | 'json',
      filter,
    };
  },
);

/** Export response with file data */
export interface SecurityEventsExportResponse {
  data: string;
  filename: string;
  contentType: string;
}

/** @complexity O(1) */
export const securityEventsExportResponseSchema: Schema<SecurityEventsExportResponse> =
  createSchema((data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid export response');
    }
    const obj = data as Record<string, unknown>;

    if (typeof obj['data'] !== 'string') throw new Error('data must be a string');
    if (typeof obj['filename'] !== 'string') throw new Error('filename must be a string');
    if (typeof obj['contentType'] !== 'string') throw new Error('contentType must be a string');

    return {
      data: obj['data'],
      filename: obj['filename'],
      contentType: obj['contentType'],
    };
  });

// ============================================================================
// Security Contract
// ============================================================================

/** Security audit API contract (admin-only) */
export const securityContract = {
  listEvents: {
    method: 'POST' as const,
    path: '/api/admin/security/events',
    body: securityEventsListRequestSchema,
    responses: {
      200: securityEventsListResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'List security events with pagination and filtering (admin only)',
  },
  getEvent: {
    method: 'GET' as const,
    path: '/api/admin/security/events/:id',
    responses: {
      200: securityEventDetailResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a single security event by ID (admin only)',
  },
  getMetrics: {
    method: 'GET' as const,
    path: '/api/admin/security/metrics',
    responses: {
      200: securityMetricsResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Get security event metrics for dashboard (admin only)',
  },
  exportEvents: {
    method: 'POST' as const,
    path: '/api/admin/security/export',
    body: securityEventsExportRequestSchema,
    responses: {
      200: securityEventsExportResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Export security events as CSV or JSON (admin only)',
  },
} satisfies Contract;
