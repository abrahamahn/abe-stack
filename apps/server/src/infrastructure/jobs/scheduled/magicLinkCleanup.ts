// apps/server/src/infrastructure/jobs/scheduled/magicLinkCleanup.ts
/**
 * Magic Link Token Cleanup Job
 *
 * Scheduled job to clean up expired and used magic link tokens from the database.
 * Maintains 24-hour retention for used tokens, immediately removes expired unused.
 *
 * This helps with:
 * - Database performance (prevents unbounded table growth)
 * - Privacy compliance (data retention policies)
 * - Security (removes stale tokens)
 */

import { lt, sql } from 'drizzle-orm';

import { magicLinkTokens } from '../../data/database/schema';

import type { DbClient } from '../../data/database/client';

// ============================================================================
// Constants
// ============================================================================

/** Default retention period for used tokens in hours */
export const DEFAULT_RETENTION_HOURS = 24;

/** Minimum allowed retention (safety guard) */
export const MIN_RETENTION_HOURS = 1;

/** Maximum batch size for deletion to avoid long locks */
export const MAX_BATCH_SIZE = 10000;

// ============================================================================
// Types
// ============================================================================

export interface MagicLinkCleanupOptions {
  /** Number of hours to retain used tokens (default: 24) */
  retentionHours?: number;
  /** Maximum records to delete in a single batch (default: 10000) */
  batchSize?: number;
  /** Whether to run in dry-run mode (count only, no delete) */
  dryRun?: boolean;
}

export interface MagicLinkCleanupResult {
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
 * Clean up old magic link tokens from the database
 *
 * Deletes tokens that are:
 * - Used and older than retention period (default 24 hours)
 * - Expired and older than retention period
 *
 * @param db - Database client
 * @param options - Cleanup options
 * @returns Cleanup result with count of deleted records
 *
 * @example
 * ```typescript
 * // Basic usage with defaults (24-hour retention)
 * const result = await cleanupMagicLinkTokens(db);
 * console.log(`Deleted ${result.deletedCount} old magic link tokens`);
 *
 * // Custom retention period
 * const result = await cleanupMagicLinkTokens(db, { retentionHours: 12 });
 *
 * // Dry run to see what would be deleted
 * const preview = await cleanupMagicLinkTokens(db, { dryRun: true });
 * console.log(`Would delete ${preview.deletedCount} records`);
 * ```
 */
export async function cleanupMagicLinkTokens(
  db: DbClient,
  options: MagicLinkCleanupOptions = {},
): Promise<MagicLinkCleanupResult> {
  const startTime = Date.now();

  const {
    retentionHours = DEFAULT_RETENTION_HOURS,
    batchSize = MAX_BATCH_SIZE,
    dryRun = false,
  } = options;

  // Validate retention hours
  const effectiveRetentionHours = Math.max(retentionHours, MIN_RETENTION_HOURS);

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setTime(cutoffDate.getTime() - effectiveRetentionHours * 60 * 60 * 1000);

  let deletedCount = 0;

  if (dryRun) {
    // Count records that would be deleted
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(magicLinkTokens)
      .where(lt(magicLinkTokens.createdAt, cutoffDate));

    deletedCount = countResult[0]?.count ?? 0;
  } else {
    // Delete in batches to avoid long-running transactions
    let batchDeleted = 0;
    do {
      // Use subquery to limit deletion batch size
      const result = await db.execute(sql`
        DELETE FROM magic_link_tokens
        WHERE id IN (
          SELECT id FROM magic_link_tokens
          WHERE created_at < ${cutoffDate}
          LIMIT ${batchSize}
        )
      `);

      batchDeleted = (result as { rowCount?: number }).rowCount ?? 0;
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
 * Get the count of magic link tokens older than the retention period
 * Useful for monitoring and alerting before cleanup
 *
 * @param db - Database client
 * @param retentionHours - Number of hours to retain (default: 24)
 * @returns Count of records that would be cleaned up
 */
export async function countOldMagicLinkTokens(
  db: DbClient,
  retentionHours: number = DEFAULT_RETENTION_HOURS,
): Promise<number> {
  const effectiveRetentionHours = Math.max(retentionHours, MIN_RETENTION_HOURS);

  const cutoffDate = new Date();
  cutoffDate.setTime(cutoffDate.getTime() - effectiveRetentionHours * 60 * 60 * 1000);

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(magicLinkTokens)
    .where(lt(magicLinkTokens.createdAt, cutoffDate));

  return result[0]?.count ?? 0;
}

/**
 * Get the total count of magic link tokens in the database
 * Useful for monitoring table size
 *
 * @param db - Database client
 * @returns Total count of magic link tokens
 */
export async function getTotalMagicLinkTokenCount(db: DbClient): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)::int` }).from(magicLinkTokens);

  return result[0]?.count ?? 0;
}

/**
 * Get statistics about magic link tokens table
 * Useful for monitoring and reporting
 *
 * @param db - Database client
 * @param retentionHours - Number of hours to retain (default: 24)
 */
export async function getMagicLinkTokenStats(
  db: DbClient,
  retentionHours: number = DEFAULT_RETENTION_HOURS,
): Promise<{
  total: number;
  oldRecords: number;
  retentionHours: number;
  cutoffDate: Date;
}> {
  const effectiveRetentionHours = Math.max(retentionHours, MIN_RETENTION_HOURS);

  const cutoffDate = new Date();
  cutoffDate.setTime(cutoffDate.getTime() - effectiveRetentionHours * 60 * 60 * 1000);

  const [total, oldRecords] = await Promise.all([
    getTotalMagicLinkTokenCount(db),
    countOldMagicLinkTokens(db, effectiveRetentionHours),
  ]);

  return {
    total,
    oldRecords,
    retentionHours: effectiveRetentionHours,
    cutoffDate,
  };
}
