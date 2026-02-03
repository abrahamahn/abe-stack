// shared/src/domain/audit-log/audit-log.schemas.ts

/**
 * @file Audit Log Contracts
 * @description Schemas and types for system security and activity logs.
 * @module Domain/AuditLog
 */

import { z } from 'zod';

import { isoDateTimeSchema } from '../../core/schemas';
import { auditEventIdSchema, tenantIdSchema, userIdSchema } from '../../types/ids';
import { cursorPaginatedResultSchema, cursorPaginationOptionsSchema } from '../../utils/pagination';

// ============================================================================
// Constants & Enums
// ============================================================================

export const AUDIT_CATEGORIES = ['security', 'admin', 'system', 'billing'] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_SEVERITIES = ['info', 'warn', 'error', 'critical'] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

/**
 * Regex for validating audit actions.
 * Format: "noun.verb" (e.g. "auth.login", "user.created")
 */
export const AUDIT_ACTION_REGEX = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

// ============================================================================
// Schemas
// ============================================================================

// Base fields shared by input and output
const baseAuditEventSchema = z.object({
  tenantId: tenantIdSchema.nullable(), // Nullable for system-wide events
  actorId: userIdSchema.nullable(), // Nullable for system actions or unauthenticated events

  // Action details
  action: z.string().regex(AUDIT_ACTION_REGEX, {
    message: 'Action must differ strictly to "noun.verb" format (e.g., "user.created")',
  }),
  category: z.enum(AUDIT_CATEGORIES).default('admin'),
  severity: z.enum(AUDIT_SEVERITIES).default('info'),

  // Target resource
  resource: z.string().min(1), // e.g., 'user', 'billing_subscription'
  resourceId: z.string().optional(), // ID of the target resource

  // Context
  metadata: z.record(z.unknown()).default({}), // Additional context
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
});

/**
 * Schema for creating a new audit event.
 * ID and CreatedAt are handled by the system implementation.
 */
export const createAuditEventSchema = baseAuditEventSchema;
export type CreateAuditEvent = z.infer<typeof createAuditEventSchema>;

/**
 * Full Audit Event Schema (Stored/Returned).
 * Includes system-generated fields (id, createdAt).
 */
export const auditEventSchema = baseAuditEventSchema.extend({
  id: auditEventIdSchema,
  createdAt: isoDateTimeSchema,
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

/**
 * Filter options for querying audit logs.
 * Extends standard cursor pagination options.
 */
export const auditLogFilterSchema = cursorPaginationOptionsSchema
  .extend({
    tenantId: tenantIdSchema.optional(),
    actorId: userIdSchema.optional(),
    action: z.string().optional(),
    resource: z.string().optional(),
    category: z.enum(AUDIT_CATEGORIES).optional(),
    severity: z.enum(AUDIT_SEVERITIES).optional(),
    startDate: isoDateTimeSchema.optional(),
    endDate: isoDateTimeSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.startDate !== undefined && data.endDate !== undefined) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'startDate must be before or equal to endDate',
      path: ['startDate'],
    },
  );
export type AuditLogFilter = z.infer<typeof auditLogFilterSchema>;

// ============================================================================
// API Responses
// ============================================================================

export const auditLogListResponseSchema = cursorPaginatedResultSchema(auditEventSchema);
export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>;
