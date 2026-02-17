// main/shared/src/core/audit-log/index.ts

/**
 * @file Audit Log Barrel
 * @description Public API for the audit log module.
 * @module Core/AuditLog
 */

// --- audit-log.display ---
export { getAuditActionTone, getAuditSeverityTone } from './audit.log.display';

// --- audit-log.logic ---
export { buildAuditEvent, sanitizeMetadata } from './audit.log.logic';
export type { AuditBuilderParams } from './audit.log.logic';

// --- audit-log.schemas ---
export {
  AUDIT_ACTION_REGEX,
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  auditEventSchema,
  auditLogFilterSchema,
  auditLogListResponseSchema,
  createAuditEventSchema,
} from './audit.log.schemas';
export type {
  AuditCategory,
  AuditEvent,
  AuditLogFilter,
  AuditLogListResponse,
  AuditSeverity,
  CreateAuditEvent,
} from './audit.log.schemas';
