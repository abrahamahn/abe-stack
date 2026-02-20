// main/server/core/src/audit/retention.ts
/**
 * Audit Retention Service
 *
 * Manages audit log lifecycle: archiving old entries to cold storage
 * before purging, and purging entries past the retention period.
 *
 * Archive-before-delete is config-gated (disabled by default).
 * When enabled, entries are serialized to a storage provider before
 * being removed from the primary database.
 *
 * Sprint 3.3 — Audit Retention
 *
 * @module audit/retention
 */

import { RETENTION_PERIODS } from '@bslt/shared';

import type { AuditEventRepository } from '../../../db/src';
import type { FileStorageProvider } from '../files/types';
import type { ServerLogger } from '@bslt/shared';

// ============================================================================
// Constants
// ============================================================================

/** Default retention period for audit entries in days */
const DEFAULT_RETENTION_DAYS = RETENTION_PERIODS.AUDIT_DAYS;

/** Storage path prefix for archived audit entries */
const ARCHIVE_PATH_PREFIX = 'audit-archives';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the audit retention service.
 */
export interface AuditRetentionConfig {
  /**
   * Number of days to retain audit entries before purging.
   * Defaults to RETENTION_PERIODS.AUDIT_DAYS (90 days).
   */
  retentionDays?: number;

  /**
   * Whether to archive entries to cold storage before deletion.
   * When false (default), entries are simply deleted after the retention period.
   * When true, entries are serialized and stored before deletion.
   */
  archiveEnabled?: boolean;
}

/**
 * Result of an archive operation.
 */
export interface ArchiveResult {
  /** Number of audit entries archived */
  archivedCount: number;
  /** Storage key where the archive was written (null if archiving disabled) */
  archiveKey: string | null;
}

/**
 * Result of a purge operation.
 */
export interface PurgeResult {
  /** Number of audit entries permanently deleted */
  purgedCount: number;
}

/**
 * Combined result of the full retention cycle (archive + purge).
 */
export interface RetentionCycleResult {
  /** Archive operation result (null if archiving not performed) */
  archive: ArchiveResult | null;
  /** Purge operation result */
  purge: PurgeResult;
}

// ============================================================================
// Archive to Cold Storage
// ============================================================================

/**
 * Archive old audit entries to cold storage before deletion.
 *
 * Finds audit entries older than `olderThanDays`, serializes them
 * to JSON, and uploads the archive to the storage provider. The
 * archive filename includes a timestamp for chronological ordering.
 *
 * This is a pre-delete step. Entries are NOT removed from the database
 * by this function. Call `purgeArchivedEntries` afterward to delete.
 *
 * @param auditEvents - Audit event repository
 * @param olderThanDays - Archive entries older than this many days
 * @param archiveStorage - Storage provider for cold storage uploads
 * @param log - Logger instance
 * @returns Archive result with count and storage key
 * @complexity O(n) where n is the number of entries to archive
 */
export async function archiveOldAuditEntries(
  auditEvents: AuditEventRepository,
  olderThanDays: number,
  archiveStorage: FileStorageProvider,
  log: ServerLogger,
): Promise<ArchiveResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  // Fetch entries older than the cutoff
  const entries = await auditEvents.find({
    endDate: cutoff,
    limit: 50000, // Batch limit to prevent memory issues
  });

  if (entries.length === 0) {
    log.debug({ olderThanDays }, 'Audit archive: no entries to archive');
    return { archivedCount: 0, archiveKey: null };
  }

  // Serialize entries to NDJSON (newline-delimited JSON) for efficient storage
  const ndjson = entries.map((entry) => JSON.stringify(entry)).join('\n');

  // Generate archive key with ISO timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveKey = `${ARCHIVE_PATH_PREFIX}/${timestamp}_${String(entries.length)}-entries.ndjson`;

  // Upload to cold storage
  await archiveStorage.upload(archiveKey, ndjson, 'application/x-ndjson');

  log.info(
    { archivedCount: entries.length, archiveKey, olderThanDays },
    'Audit entries archived to cold storage',
  );

  return { archivedCount: entries.length, archiveKey };
}

// ============================================================================
// Purge Archived Entries
// ============================================================================

/**
 * Permanently delete audit entries older than the retention period.
 *
 * This function removes entries from the primary database. If archiving
 * is enabled, `archiveOldAuditEntries` should be called first to preserve
 * the entries in cold storage.
 *
 * @param auditEvents - Audit event repository
 * @param olderThanDays - Delete entries older than this many days
 * @param log - Logger instance
 * @returns Purge result with count of deleted entries
 * @complexity O(n) where n is the number of entries to delete (database-level)
 */
export async function purgeArchivedEntries(
  auditEvents: AuditEventRepository,
  olderThanDays: number,
  log: ServerLogger,
): Promise<PurgeResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const purgedCount = await auditEvents.deleteOlderThan(cutoff.toISOString());

  if (purgedCount > 0) {
    log.info({ purgedCount, olderThanDays, cutoff: cutoff.toISOString() }, 'Audit entries purged');
  } else {
    log.debug({ olderThanDays }, 'Audit purge: no entries to purge');
  }

  return { purgedCount };
}

// ============================================================================
// Full Retention Cycle
// ============================================================================

/**
 * Execute the full audit retention cycle: optionally archive, then purge.
 *
 * When `config.archiveEnabled` is true, entries are first archived to
 * cold storage before being deleted from the database. When false,
 * entries are simply purged after the retention period.
 *
 * This is the primary entry point for the scheduled audit retention task.
 *
 * @param auditEvents - Audit event repository
 * @param log - Logger instance
 * @param config - Retention configuration (retention days, archive toggle)
 * @param archiveStorage - Storage provider (required only when archiving is enabled)
 * @returns Combined result of archive and purge operations
 * @complexity O(n) where n is the number of entries past retention
 */
export async function runRetentionCycle(
  auditEvents: AuditEventRepository,
  log: ServerLogger,
  config: AuditRetentionConfig = {},
  archiveStorage?: FileStorageProvider,
): Promise<RetentionCycleResult> {
  const retentionDays = config.retentionDays ?? DEFAULT_RETENTION_DAYS;
  const archiveEnabled = config.archiveEnabled ?? false;

  let archive: ArchiveResult | null = null;

  // Step 1: Archive (if enabled and storage is available)
  if (archiveEnabled && archiveStorage !== undefined) {
    try {
      archive = await archiveOldAuditEntries(auditEvents, retentionDays, archiveStorage, log);
    } catch (error) {
      // Archive failure should not prevent purge — log and continue
      log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          retentionDays,
        },
        'Audit archive failed — proceeding with purge',
      );
    }
  } else if (archiveEnabled && archiveStorage === undefined) {
    log.warn('Audit archive enabled but no storage provider configured — skipping archive');
  }

  // Step 2: Purge
  const purge = await purgeArchivedEntries(auditEvents, retentionDays, log);

  log.info(
    {
      retentionDays,
      archiveEnabled,
      archived: archive?.archivedCount ?? 0,
      purged: purge.purgedCount,
    },
    'Audit retention cycle completed',
  );

  return { archive, purge };
}
