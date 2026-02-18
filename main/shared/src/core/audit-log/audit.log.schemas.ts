// main/shared/src/core/audit-log/audit.log.schemas.ts

/**
 * @file Audit Log Schemas
 * @description Schemas and types for system security and activity logs.
 * @module Core/AuditLog
 */

import { cursorPaginatedResultSchema, cursorPaginationOptionsSchema } from '../../engine/pagination';
import { AUDIT_ACTION_REGEX } from '../../primitives/constants/regex';
import {
  createEnumSchema,
  createSchema,
  parseNullable,
  parseOptional,
  parseRecord,
  parseString,
  withDefault,
  type Schema,
} from '../../primitives/schema';
import { isoDateTimeSchema } from '../schemas';
import { AUDIT_CATEGORIES, AUDIT_SEVERITIES } from '../constants/notifications';
import { auditEventIdSchema, tenantIdSchema, userIdSchema } from '../../primitives/schema/ids';
import type { CursorPaginatedResult, CursorPaginationOptions } from '../../engine/pagination';
import type { AuditEventId, TenantId, UserId } from '../../primitives/schema/ids';

// ============================================================================
// Constants
// ============================================================================

export { AUDIT_ACTION_REGEX, AUDIT_CATEGORIES, AUDIT_SEVERITIES };

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

// ============================================================================
// Schemas
// ============================================================================

/** Enum schemas */
const auditCategorySchema = createEnumSchema(AUDIT_CATEGORIES, 'audit category');
const auditSeveritySchema = createEnumSchema(AUDIT_SEVERITIES, 'audit severity');

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

/**
 * Schema for creating a new audit event.
 */
export const createAuditEventSchema: Schema<CreateAuditEvent> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return parseBaseAuditFields(obj);
});

/**
 * Full Audit Event Schema (Stored/Returned).
 */
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

// ============================================================================
// API Responses
// ============================================================================

export const auditLogListResponseSchema: Schema<AuditLogListResponse> =
  cursorPaginatedResultSchema(auditEventSchema);
