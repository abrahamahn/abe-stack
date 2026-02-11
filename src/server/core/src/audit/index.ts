// src/server/core/src/audit/index.ts
/**
 * Audit Module
 *
 * General-purpose audit logging for domain events.
 */

export { record } from './service';
export type { AuditAction, AuditDeps, AuditRecordParams } from './types';
