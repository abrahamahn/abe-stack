// infra/contracts/src/security.ts
/**
 * Security Audit Contract
 *
 * Admin-only endpoints for viewing and exporting security events.
 * Used by the Security Audit Viewer feature.
 */

import { errorResponseSchema, uuidSchema } from './common';
import {
  paginatedResultSchema,
  paginationOptionsSchema,
  type PaginatedResult,
  type PaginationOptions,
} from './pagination';
import { createSchema } from './schema';

import type { Contract, Schema } from './types';

// ============================================================================
// Security Event Types
// ============================================================================

export const SECURITY_EVENT_TYPES = [
  'token_reuse_detected',
  'token_family_revoked',
  'account_locked',
  'account_unlocked',
  'suspicious_login',
  'password_changed',
  'email_changed',
  'magic_link_requested',
  'magic_link_verified',
  'magic_link_failed',
  'oauth_login_success',
  'oauth_login_failure',
  'oauth_account_created',
  'oauth_link_success',
  'oauth_link_failure',
  'oauth_unlink_success',
  'oauth_unlink_failure',
] as const;

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export const SECURITY_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export type SecuritySeverity = (typeof SECURITY_SEVERITIES)[number];

// ============================================================================
// Security Event Schema
// ============================================================================

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

export const securityEventSchema: Schema<SecurityEvent> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid security event');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['id'] !== 'string') {
    throw new Error('id must be a string');
  }
  if (obj['userId'] !== null && typeof obj['userId'] !== 'string') {
    throw new Error('userId must be a string or null');
  }
  if (obj['email'] !== null && typeof obj['email'] !== 'string') {
    throw new Error('email must be a string or null');
  }
  if (typeof obj['eventType'] !== 'string') {
    throw new Error('eventType must be a string');
  }
  if (typeof obj['severity'] !== 'string') {
    throw new Error('severity must be a string');
  }
  if (obj['ipAddress'] !== null && typeof obj['ipAddress'] !== 'string') {
    throw new Error('ipAddress must be a string or null');
  }
  if (obj['userAgent'] !== null && typeof obj['userAgent'] !== 'string') {
    throw new Error('userAgent must be a string or null');
  }
  if (obj['metadata'] !== null && typeof obj['metadata'] !== 'object') {
    throw new Error('metadata must be an object or null');
  }
  if (typeof obj['createdAt'] !== 'string') {
    throw new Error('createdAt must be a string');
  }

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

export interface SecurityEventsFilter {
  eventType?: string;
  severity?: string;
  userId?: string;
  email?: string;
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
}

export interface SecurityEventsListRequest extends PaginationOptions {
  filter?: SecurityEventsFilter;
}

export const securityEventsFilterSchema: Schema<SecurityEventsFilter> = createSchema(
  (data: unknown) => {
    if (data === undefined || data === null) {
      return {};
    }
    if (typeof data !== 'object') {
      throw new Error('filter must be an object');
    }
    const obj = data as Record<string, unknown>;

    const filter: SecurityEventsFilter = {};

    if (obj['eventType'] !== undefined) {
      if (typeof obj['eventType'] !== 'string') {
        throw new Error('eventType must be a string');
      }
      filter.eventType = obj['eventType'];
    }

    if (obj['severity'] !== undefined) {
      if (typeof obj['severity'] !== 'string') {
        throw new Error('severity must be a string');
      }
      if (!SECURITY_SEVERITIES.includes(obj['severity'] as SecuritySeverity)) {
        throw new Error('Invalid severity level');
      }
      filter.severity = obj['severity'];
    }

    if (obj['userId'] !== undefined) {
      if (typeof obj['userId'] !== 'string') {
        throw new Error('userId must be a string');
      }
      filter.userId = obj['userId'];
    }

    if (obj['email'] !== undefined) {
      if (typeof obj['email'] !== 'string') {
        throw new Error('email must be a string');
      }
      filter.email = obj['email'];
    }

    if (obj['ipAddress'] !== undefined) {
      if (typeof obj['ipAddress'] !== 'string') {
        throw new Error('ipAddress must be a string');
      }
      filter.ipAddress = obj['ipAddress'];
    }

    if (obj['startDate'] !== undefined) {
      if (typeof obj['startDate'] !== 'string') {
        throw new Error('startDate must be a string');
      }
      filter.startDate = obj['startDate'];
    }

    if (obj['endDate'] !== undefined) {
      if (typeof obj['endDate'] !== 'string') {
        throw new Error('endDate must be a string');
      }
      filter.endDate = obj['endDate'];
    }

    return filter;
  },
);

export const securityEventsListRequestSchema: Schema<SecurityEventsListRequest> = createSchema(
  (data: unknown) => {
    const pagination = paginationOptionsSchema.parse(data);
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    let filter: SecurityEventsFilter = {};
    if (obj['filter'] !== undefined) {
      filter = securityEventsFilterSchema.parse(obj['filter']);
    }

    return {
      ...pagination,
      filter,
    };
  },
);

export type SecurityEventsListResponse = PaginatedResult<SecurityEvent>;

export const securityEventsListResponseSchema: Schema<SecurityEventsListResponse> =
  paginatedResultSchema(securityEventSchema);

// ============================================================================
// Get Security Event Detail
// ============================================================================

export interface SecurityEventDetailRequest {
  id: string;
}

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

export type SecurityEventDetailResponse = SecurityEvent;

export const securityEventDetailResponseSchema: Schema<SecurityEventDetailResponse> =
  securityEventSchema;

// ============================================================================
// Security Metrics
// ============================================================================

export interface SecurityMetricsRequest {
  period?: 'hour' | 'day' | 'week' | 'month';
}

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
    if (typeof value !== 'string') {
      throw new Error(`${name} must be a string`);
    }
    return value;
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
    eventsByType: obj['eventsByType'] as Record<string, number>,
    period: validateString(obj['period'], 'period'),
    periodStart: validateString(obj['periodStart'], 'periodStart'),
    periodEnd: validateString(obj['periodEnd'], 'periodEnd'),
  };
});

export type SecurityMetricsResponse = SecurityMetrics;

export const securityMetricsResponseSchema: Schema<SecurityMetricsResponse> = securityMetricsSchema;

// ============================================================================
// Export Security Events
// ============================================================================

export interface SecurityEventsExportRequest {
  format: 'csv' | 'json';
  filter?: SecurityEventsFilter;
}

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

export interface SecurityEventsExportResponse {
  data: string;
  filename: string;
  contentType: string;
}

export const securityEventsExportResponseSchema: Schema<SecurityEventsExportResponse> =
  createSchema((data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid export response');
    }
    const obj = data as Record<string, unknown>;

    if (typeof obj['data'] !== 'string') {
      throw new Error('data must be a string');
    }
    if (typeof obj['filename'] !== 'string') {
      throw new Error('filename must be a string');
    }
    if (typeof obj['contentType'] !== 'string') {
      throw new Error('contentType must be a string');
    }

    return {
      data: obj['data'],
      filename: obj['filename'],
      contentType: obj['contentType'],
    };
  });

// ============================================================================
// Security Contract
// ============================================================================

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
