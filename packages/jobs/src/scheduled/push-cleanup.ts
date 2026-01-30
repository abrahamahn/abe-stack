// packages/jobs/src/scheduled/push-cleanup.ts
/**
 * Push Subscription Cleanup Job
 *
 * Scheduled job to clean up expired and inactive push subscriptions.
 *
 * This helps with:
 * - Database performance (prevents unbounded table growth)
 * - Privacy compliance (data retention policies)
 * - Sending efficiency (avoids sending to dead endpoints)
 */

import {
  lt,
  or,
  eq,
  isNotNull,
  and,
  selectCount,
  PUSH_SUBSCRIPTIONS_TABLE,
  type RawDb,
} from '@abe-stack/db';

// ============================================================================
// Constants
// ============================================================================

/** Default retention period for inactive subscriptions in days */
export const DEFAULT_INACTIVE_DAYS = 90;

/** Minimum allowed retention (safety guard) */
export const MIN_INACTIVE_DAYS = 7;

/** Maximum batch size for deletion to avoid long locks */
export const MAX_BATCH_SIZE = 1000;

// ============================================================================
// Types
// ============================================================================

export interface PushCleanupOptions {
  /** Number of days of inactivity before deletion (default: 90) */
  inactiveDays?: number;
  /** Maximum records to delete in a single batch (default: 1000) */
  batchSize?: number;
  /** Whether to run in dry-run mode (count only, no delete) */
  dryRun?: boolean;
}

export interface PushCleanupResult {
  /** Number of records deleted (or would be deleted in dry-run) */
  deletedCount: number;
  /** Breakdown by reason */
  breakdown: {
    inactive: number;
    expired: number;
    markedInactive: number;
  };
  /** The cutoff date used for inactive subscriptions */
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
 * Clean up expired and inactive push subscriptions
 *
 * Removes subscriptions that are:
 * 1. Marked as inactive (isActive = false)
 * 2. Not used for `inactiveDays` days
 * 3. Past their browser-provided expirationTime
 *
 * @param db - Database client
 * @param options - Cleanup options
 * @returns Cleanup result with count and breakdown
 *
 * @example
 * ```typescript
 * // Basic usage with defaults (90-day retention)
 * const result = await cleanupPushSubscriptions(db);
 * console.log(`Deleted ${result.deletedCount} subscriptions`);
 *
 * // Custom retention period
 * const result = await cleanupPushSubscriptions(db, { inactiveDays: 30 });
 *
 * // Dry run to see what would be deleted
 * const preview = await cleanupPushSubscriptions(db, { dryRun: true });
 * console.log(`Would delete ${preview.deletedCount} subscriptions`);
 * ```
 */
export async function cleanupPushSubscriptions(
  db: RawDb,
  options: PushCleanupOptions = {},
): Promise<PushCleanupResult> {
  const startTime = Date.now();

  const {
    inactiveDays = DEFAULT_INACTIVE_DAYS,
    batchSize = MAX_BATCH_SIZE,
    dryRun = false,
  } = options;

  // Validate retention days
  const effectiveInactiveDays = Math.max(inactiveDays, MIN_INACTIVE_DAYS);

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - effectiveInactiveDays);
  cutoffDate.setHours(0, 0, 0, 0); // Normalize to start of day

  const now = new Date();

  if (dryRun) {
    // Count records that would be deleted by each category
    const markedInactiveResult = await db.queryOne<{ count: number }>(
      selectCount(PUSH_SUBSCRIPTIONS_TABLE).where(eq('is_active', false)).toSql(),
    );

    const staleResult = await db.queryOne<{ count: number }>(
      selectCount(PUSH_SUBSCRIPTIONS_TABLE)
        .where(and(eq('is_active', true), lt('last_used_at', cutoffDate)))
        .toSql(),
    );

    const expiredResult = await db.queryOne<{ count: number }>(
      selectCount(PUSH_SUBSCRIPTIONS_TABLE)
        .where(and(isNotNull('expiration_time'), lt('expiration_time', now)))
        .toSql(),
    );

    const markedInactive = markedInactiveResult?.count ?? 0;
    const inactive = staleResult?.count ?? 0;
    const expired = expiredResult?.count ?? 0;

    // Total is approximate since categories may overlap
    const deletedCount = markedInactive + inactive + expired;

    return {
      deletedCount,
      breakdown: {
        markedInactive,
        inactive,
        expired,
      },
      cutoffDate,
      dryRun: true,
      durationMs: Date.now() - startTime,
    };
  }

  // Delete in batches to avoid long-running transactions
  let totalDeleted = 0;
  let batchDeleted = 0;

  do {
    // Delete subscriptions matching any cleanup criteria
    batchDeleted = await db.execute({
      text: `DELETE FROM push_subscriptions
        WHERE id IN (
          SELECT id FROM push_subscriptions
          WHERE is_active = false
            OR last_used_at < $1
            OR (expiration_time IS NOT NULL AND expiration_time < $2)
          LIMIT $3
        )`,
      values: [cutoffDate, now, batchSize],
    });

    totalDeleted += batchDeleted;

    // Continue until no more records to delete
  } while (batchDeleted === batchSize);

  const durationMs = Date.now() - startTime;

  return {
    deletedCount: totalDeleted,
    breakdown: {
      // In actual delete mode, we don't track breakdown separately
      // Set all to 0 and total in deletedCount
      markedInactive: 0,
      inactive: 0,
      expired: 0,
    },
    cutoffDate,
    dryRun: false,
    durationMs,
  };
}

/**
 * Get statistics about push subscriptions for monitoring
 *
 * @param db - Database client
 * @param inactiveDays - Number of days to consider inactive (default: 90)
 */
export async function getPushSubscriptionStats(
  db: RawDb,
  inactiveDays: number = DEFAULT_INACTIVE_DAYS,
): Promise<{
  total: number;
  active: number;
  markedInactive: number;
  stale: number;
  expired: number;
  expiringSoon: number;
  cutoffDate: Date;
}> {
  const effectiveInactiveDays = Math.max(inactiveDays, MIN_INACTIVE_DAYS);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - effectiveInactiveDays);
  cutoffDate.setHours(0, 0, 0, 0);

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalResult,
    activeResult,
    markedInactiveResult,
    staleResult,
    expiredResult,
    expiringSoonResult,
  ] = await Promise.all([
    db.queryOne<{ count: number }>(selectCount(PUSH_SUBSCRIPTIONS_TABLE).toSql()),

    db.queryOne<{ count: number }>(
      selectCount(PUSH_SUBSCRIPTIONS_TABLE).where(eq('is_active', true)).toSql(),
    ),

    db.queryOne<{ count: number }>(
      selectCount(PUSH_SUBSCRIPTIONS_TABLE).where(eq('is_active', false)).toSql(),
    ),

    db.queryOne<{ count: number }>(
      selectCount(PUSH_SUBSCRIPTIONS_TABLE)
        .where(and(eq('is_active', true), lt('last_used_at', cutoffDate)))
        .toSql(),
    ),

    db.queryOne<{ count: number }>(
      selectCount(PUSH_SUBSCRIPTIONS_TABLE)
        .where(and(isNotNull('expiration_time'), lt('expiration_time', now)))
        .toSql(),
    ),

    // Expiring within next week: expiration_time IS NOT NULL AND > now AND <= weekFromNow
    db.raw<{ count: number }>(
      `SELECT COUNT(*) as count FROM push_subscriptions
       WHERE expiration_time IS NOT NULL
         AND expiration_time > $1
         AND expiration_time <= $2`,
      [now, weekFromNow],
    ),
  ]);

  return {
    total: totalResult?.count ?? 0,
    active: activeResult?.count ?? 0,
    markedInactive: markedInactiveResult?.count ?? 0,
    stale: staleResult?.count ?? 0,
    expired: expiredResult?.count ?? 0,
    expiringSoon: expiringSoonResult[0]?.count ?? 0,
    cutoffDate,
  };
}

/**
 * Get count of subscriptions that would be cleaned up
 * Useful for monitoring and alerting before cleanup
 *
 * @param db - Database client
 * @param inactiveDays - Number of days to consider inactive (default: 90)
 * @returns Count of records that would be cleaned up
 */
export async function countCleanupCandidates(
  db: RawDb,
  inactiveDays: number = DEFAULT_INACTIVE_DAYS,
): Promise<number> {
  const effectiveInactiveDays = Math.max(inactiveDays, MIN_INACTIVE_DAYS);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - effectiveInactiveDays);
  cutoffDate.setHours(0, 0, 0, 0);

  const now = new Date();

  const result = await db.queryOne<{ count: number }>(
    selectCount(PUSH_SUBSCRIPTIONS_TABLE)
      .where(
        or(
          eq('is_active', false),
          lt('last_used_at', cutoffDate),
          and(isNotNull('expiration_time'), lt('expiration_time', now)),
        ),
      )
      .toSql(),
  );

  return result?.count ?? 0;
}
