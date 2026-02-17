// main/shared/src/engine/audit-log/audit-log.ts

/**
 * @file Audit Log Domain
 * @description Schemas, types, logic, and display helpers for system security and activity logs.
 * @module Domain/AuditLog
 */

import {
  createEnumSchema,
  createSchema,
  parseNullable,
  parseOptional,
  parseRecord,
  parseString,
  withDefault,
} from '../../primitives/schema';
import { isoDateTimeSchema } from '../../primitives/schema';
import { auditEventIdSchema, tenantIdSchema, userIdSchema } from '../../primitives/schema/ids';
import { cursorPaginatedResultSchema, cursorPaginationOptionsSchema } from '../pagination';
import { AUDIT_ACTION_REGEX } from '../../primitives/constants';
import { AUDIT_CATEGORIES, AUDIT_SEVERITIES } from '../constants/audit';

import type { Schema } from '../../primitives/api';
import type { AuditEventId, TenantId, UserId } from '../../primitives/schema/ids';
import type { CursorPaginatedResult, CursorPaginationOptions } from '../pagination';

// ============================================================================
// Types
// ============================================================================

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

/** Input for creating a new audit event */
export interface CreateAuditEvent {
  tenantId: TenantId | null;
  actorId: UserId | null;
  action: string;
  category: AuditCategory;
  severity: AuditSeverity;
  resource: string;
  resourceId?: string | undefined;
  metadata: Record<string, unknown>;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

/** Full audit event entity (includes system-generated fields) */
export interface AuditEvent extends CreateAuditEvent {
  id: AuditEventId;
  createdAt: string;
}

/** Filter options for querying audit logs */
export interface AuditLogFilter extends CursorPaginationOptions {
  tenantId?: TenantId | undefined;
  actorId?: UserId | undefined;
  action?: string | undefined;
  resource?: string | undefined;
  category?: AuditCategory | undefined;
  severity?: AuditSeverity | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

/** Paginated audit log response */
export type AuditLogListResponse = CursorPaginatedResult<AuditEvent>;

/**
 * Parameters for the audit event builder.
 * Partial for some fields to allow the builder to provide defaults.
 */
export type AuditBuilderParams = Partial<CreateAuditEvent> & {
  action: string;
  resource: string;
};

// ============================================================================
// Constants
// ============================================================================

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'creditCard',
  'cvv',
  'cardDetails',
  'apiKey',
  'clientSecret',
  'privateKey',
];

/** Maximum recursion depth for metadata sanitization to prevent stack overflow */
const MAX_SANITIZE_DEPTH = 10;

const ACTION_TONES: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  invite: 'info',
  remove: 'warning',
};

const SEVERITY_TONES: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  info: 'info',
  warn: 'warning',
  error: 'danger',
  critical: 'danger',
};

/** Enum schemas */
const auditCategorySchema = createEnumSchema(AUDIT_CATEGORIES, 'audit category');
const auditSeveritySchema = createEnumSchema(AUDIT_SEVERITIES, 'audit severity');

// ============================================================================
// Schemas
// ============================================================================

/**
 * Parse the base audit event fields shared by create and full schemas.
 *
 * @param obj - Record of unknown values
 * @returns Parsed base audit event fields
 * @complexity O(1) for scalar fields
 */
function parseBaseAuditFields(obj: Record<string, unknown>): CreateAuditEvent {
  const action = parseString(obj['action'], 'action');
  if (!AUDIT_ACTION_REGEX.test(action)) {
    throw new Error('Action must follow "noun.verb" format (e.g., "user.created")');
  }

  return {
    tenantId: parseNullable(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    actorId: parseNullable(obj['actorId'], (v) => userIdSchema.parse(v)),
    action,
    category: auditCategorySchema.parse(withDefault(obj['category'], 'admin')),
    severity: auditSeveritySchema.parse(withDefault(obj['severity'], 'info')),
    resource: parseString(obj['resource'], 'resource', { min: 1 }),
    resourceId: parseOptional(obj['resourceId'], (v) => parseString(v, 'resourceId')),
    metadata:
      withDefault(obj['metadata'], {}) !== undefined
        ? parseRecord(withDefault(obj['metadata'], {}), 'metadata')
        : {},
    ipAddress: parseOptional(obj['ipAddress'], (v) => parseString(v, 'ipAddress', { ip: true })),
    userAgent: parseOptional(obj['userAgent'], (v) => parseString(v, 'userAgent')),
  };
}

/** Schema for creating a new audit event. */
export const createAuditEventSchema: Schema<CreateAuditEvent> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return parseBaseAuditFields(obj);
});

/** Full Audit Event Schema (Stored/Returned). */
export const auditEventSchema: Schema<AuditEvent> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const base = parseBaseAuditFields(obj);

  return {
    ...base,
    id: auditEventIdSchema.parse(obj['id']),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
  };
});

/**
 * Filter options for querying audit logs.
 * Extends standard cursor pagination options with audit-specific filters.
 */
export const auditLogFilterSchema: Schema<AuditLogFilter> = createSchema((data: unknown) => {
  const base = cursorPaginationOptionsSchema.parse(data);
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  const startDate = parseOptional(obj['startDate'], (v) => isoDateTimeSchema.parse(v));
  const endDate = parseOptional(obj['endDate'], (v) => isoDateTimeSchema.parse(v));

  // Date range validation
  if (startDate !== undefined && endDate !== undefined) {
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('startDate must be before or equal to endDate');
    }
  }

  return {
    ...base,
    tenantId: parseOptional(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    actorId: parseOptional(obj['actorId'], (v) => userIdSchema.parse(v)),
    action: parseOptional(obj['action'], (v) => parseString(v, 'action')),
    resource: parseOptional(obj['resource'], (v) => parseString(v, 'resource')),
    category: parseOptional(obj['category'], (v) => auditCategorySchema.parse(v)),
    severity: parseOptional(obj['severity'], (v) => auditSeveritySchema.parse(v)),
    startDate,
    endDate,
  };
});

export const auditLogListResponseSchema: Schema<AuditLogListResponse> =
  cursorPaginatedResultSchema(auditEventSchema);

// ============================================================================
// Functions
// ============================================================================

/**
 * Canonical builder for audit events.
 * Enforces action format, defaults, and sanitization.
 */
export function buildAuditEvent(params: AuditBuilderParams): CreateAuditEvent {
  return {
    action: params.action,
    actorId: params.actorId ?? null,
    tenantId: params.tenantId ?? null,
    resource: params.resource,
    resourceId: params.resourceId,
    metadata: sanitizeMetadata(params.metadata ?? {}),
    category: params.category ?? 'admin',
    severity: params.severity ?? 'info',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  };
}

/**
 * Recursively removes sensitive keys from metadata objects.
 * Prevents accidental logging of PII or credentials.
 *
 * @param metadata - The metadata object to sanitize
 * @param depth - Current recursion depth (internal, do not pass externally)
 * @param seen - WeakSet tracking visited objects to prevent circular reference loops
 * @returns Sanitized copy of the metadata with sensitive values redacted
 * @complexity O(n) where n is the total number of keys across all nested objects
 */
export function sanitizeMetadata(
  metadata: Record<string, unknown>,
  depth = 0,
  seen = new WeakSet(),
): Record<string, unknown> {
  // Guard against circular references
  if (seen.has(metadata)) {
    return { _circular: '[CIRCULAR]' };
  }
  seen.add(metadata);

  // Guard against excessive nesting
  if (depth >= MAX_SANITIZE_DEPTH) {
    return { _truncated: '[MAX_DEPTH]' };
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Check if current key is sensitive
    const isSensitive = SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (Array.isArray(value)) {
      sanitized[key] = (value as unknown[]).map((v: unknown) =>
        v !== null && typeof v === 'object' && !Array.isArray(v)
          ? sanitizeMetadata(v as Record<string, unknown>, depth + 1, seen)
          : v,
      );
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>, depth + 1, seen);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Get the badge tone for an audit action.
 * Extracts the action prefix (e.g. 'create' from 'create.user') and maps to a tone.
 */
export function getAuditActionTone(action: string): 'info' | 'success' | 'warning' | 'danger' {
  const prefix = action.split('.')[0] ?? '';
  return ACTION_TONES[prefix] ?? 'info';
}

/**
 * Get the badge tone for an audit severity level.
 */
export function getAuditSeverityTone(severity: string): 'info' | 'success' | 'warning' | 'danger' {
  return SEVERITY_TONES[severity] ?? 'info';
}
