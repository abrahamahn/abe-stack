// main/server/core/src/audit/index.ts
/**
 * Audit Module
 *
 * General-purpose audit logging for domain events.
 * Includes retention management (Sprint 3.3).
 */

export { record } from './service';
export type { AuditAction, AuditDeps, AuditRecordParams } from './types';

// Retention (Sprint 3.3)
export { archiveOldAuditEntries, purgeArchivedEntries, runRetentionCycle } from './retention';
export type {
  ArchiveResult,
  AuditRetentionConfig,
  PurgeResult,
  RetentionCycleResult,
} from './retention';
