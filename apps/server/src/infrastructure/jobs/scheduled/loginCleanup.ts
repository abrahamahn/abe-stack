// apps/server/src/infrastructure/jobs/scheduled/loginCleanup.ts
/**
 * Login Attempt Cleanup Job
 *
 * Scheduled job to clean up old login attempts from the database.
 * Maintains 90-day retention by default, but can be configured.
 *
 * This helps with:
 * - Database performance (prevents unbounded table growth)
 * - Privacy compliance (data retention policies)
 * - Security auditing (keeps relevant recent data)
 */

import { lt, selectCount, LOGIN_ATTEMPTS_TABLE, type RawDb } from '@abe-stack/db';

// ============================================================================
// Constants
// ============================================================================

/** Default retention period in days */
export const DEFAULT_RETENTION_DAYS = 90;

/** Minimum allowed retention (safety guard) */
export const MIN_RETENTION_DAYS = 7;

/** Maximum batch size for deletion to avoid long locks */
export const MAX_BATCH_SIZE = 10000;

// ============================================================================
// Types
// ============================================================================

export interface CleanupOptions {
  /** Number of days to retain login attempts (default: 90) */
  retentionDays?: number;
  /** Maximum records to delete in a single batch (default: 10000) */
  batchSize?: number;
  /** Whether to run in dry-run mode (count only, no delete) */
  dryRun?: boolean;
}

export interface CleanupResult {
  /** Number of records deleted (or would be deleted in dry-run) */
  deletedCount: number;
  /** The cutoff date used for deletion */
  cutoffDate: Date;
  /** Whether this was a dry run */
  dryRun: boolean;
  /** Duration of the operation in milliseconds */
  durationMs: number;
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Clean up old login attempts from the database
 *
 * @param db - Database client
 * @param options - Cleanup options
 * @returns Cleanup result with count of deleted records
 *
 * @example
 * ```typescript
 * // Basic usage with defaults (90-day retention)
 * const result = await cleanupOldLoginAttempts(db);
 * console.log(`Deleted ${result.deletedCount} old login attempts`);
 *
 * // Custom retention period
 * const result = await cleanupOldLoginAttempts(db, { retentionDays: 30 });
 *
 * // Dry run to see what would be deleted
 * const preview = await cleanupOldLoginAttempts(db, { dryRun: true });
 * console.log(`Would delete ${preview.deletedCount} records`);
 * ```
 */
export async function cleanupOldLoginAttempts(
  db: RawDb,
  options: CleanupOptions = {},
): Promise<CleanupResult> {
  const startTime = Date.now();

  const {
    retentionDays = DEFAULT_RETENTION_DAYS,
    batchSize = MAX_BATCH_SIZE,
    dryRun = false,
  } = options;

  // Validate retention days
  const effectiveRetentionDays = Math.max(retentionDays, MIN_RETENTION_DAYS);

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - effectiveRetentionDays);
  cutoffDate.setHours(0, 0, 0, 0); // Normalize to start of day

  let deletedCount = 0;

  if (dryRun) {
    // Count records that would be deleted
    const countResult = await db.queryOne<{ count: number }>(
      selectCount(LOGIN_ATTEMPTS_TABLE).where(lt('created_at', cutoffDate)).toSql(),
    );

    deletedCount = countResult?.count ?? 0;
  } else {
    // Delete in batches to avoid long-running transactions
    let batchDeleted = 0;
    do {
      // Use subquery to limit deletion batch size
      batchDeleted = await db.execute({
        text: `DELETE FROM login_attempts
          WHERE id IN (
            SELECT id FROM login_attempts
            WHERE created_at < $1
            LIMIT $2
          )`,
        values: [cutoffDate, batchSize],
      });

      deletedCount += batchDeleted;

      // Continue until no more records to delete
    } while (batchDeleted === batchSize);
  }

  const durationMs = Date.now() - startTime;

  return {
    deletedCount,
    cutoffDate,
    dryRun,
    durationMs,
  };
}

/**
 * Get the count of login attempts older than the retention period
 * Useful for monitoring and alerting before cleanup
 *
 * @param db - Database client
 * @param retentionDays - Number of days to retain (default: 90)
 * @returns Count of records that would be cleaned up
 */
export async function countOldLoginAttempts(
  db: RawDb,
  retentionDays: number = DEFAULT_RETENTION_DAYS,
): Promise<number> {
  const effectiveRetentionDays = Math.max(retentionDays, MIN_RETENTION_DAYS);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - effectiveRetentionDays);
  cutoffDate.setHours(0, 0, 0, 0);

  const result = await db.queryOne<{ count: number }>(
    selectCount(LOGIN_ATTEMPTS_TABLE).where(lt('created_at', cutoffDate)).toSql(),
  );

  return result?.count ?? 0;
}

/**
 * Get the total count of login attempts in the database
 * Useful for monitoring table size
 *
 * @param db - Database client
 * @returns Total count of login attempts
 */
export async function getTotalLoginAttemptCount(db: RawDb): Promise<number> {
  const result = await db.queryOne<{ count: number }>(selectCount(LOGIN_ATTEMPTS_TABLE).toSql());

  return result?.count ?? 0;
}

/**
 * Get statistics about login attempts table
 * Useful for monitoring and reporting
 *
 * @param db - Database client
 * @param retentionDays - Number of days to retain (default: 90)
 */
export async function getLoginAttemptStats(
  db: RawDb,
  retentionDays: number = DEFAULT_RETENTION_DAYS,
): Promise<{
  total: number;
  oldRecords: number;
  retentionDays: number;
  cutoffDate: Date;
}> {
  const effectiveRetentionDays = Math.max(retentionDays, MIN_RETENTION_DAYS);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - effectiveRetentionDays);
  cutoffDate.setHours(0, 0, 0, 0);

  const [total, oldRecords] = await Promise.all([
    getTotalLoginAttemptCount(db),
    countOldLoginAttempts(db, effectiveRetentionDays),
  ]);

  return {
    total,
    oldRecords,
    retentionDays: effectiveRetentionDays,
    cutoffDate,
  };
}
