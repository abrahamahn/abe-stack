// main/server/core/src/users/unverified-cleanup.ts
/**
 * Unverified User Cleanup Cron
 *
 * Removes users who registered but never verified their email.
 * Excludes users with OAuth connections (verified via provider)
 * and users with active sessions (edge case).
 * Should be called periodically by a scheduled job.
 *
 * @module users/unverified-cleanup
 */

import {
  and,
  deleteFrom,
  eq,
  isNull,
  lt,
  select,
  toCamelCase,
  USER_COLUMNS,
  USERS_TABLE,
  type DbClient,
  type Repositories,
  type User,
} from '../../../db/src';

import type { ServerLogger } from '@abe-stack/shared/core';

// ============================================================================
// Constants
// ============================================================================

/** Default number of days after registration before unverified users are cleaned up */
const DEFAULT_EXPIRY_DAYS = 7;

// ============================================================================
// Types
// ============================================================================

/**
 * Result of unverified user cleanup cron execution.
 */
export interface CleanupResult {
  /** Number of unverified users hard-deleted */
  deletedCount: number;
}

// ============================================================================
// Cron Function
// ============================================================================

/**
 * Clean up users who registered but never verified their email.
 *
 * Finds users where:
 * - `email_verified_at` is NULL (never verified)
 * - `created_at` is older than expiryDays
 *
 * Excludes:
 * - Users with OAuth connections (verified via external provider)
 * - Users with active (non-revoked) sessions
 *
 * Qualifying users are hard-deleted from the database.
 *
 * @param db - Database client
 * @param repos - Repositories for OAuth and session lookups
 * @param log - Logger instance
 * @param expiryDays - Days after registration before cleanup (default: 7)
 * @returns Count of deleted users
 * @complexity O(n * m) where n is qualifying users, m is lookups per user
 */
export async function cleanupUnverifiedUsers(
  db: DbClient,
  repos: Repositories,
  log: ServerLogger,
  expiryDays: number = DEFAULT_EXPIRY_DAYS,
): Promise<CleanupResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - expiryDays);

  // Find unverified users older than cutoff
  const rows = await db.query(
    select(USERS_TABLE)
      .where(
        and(isNull('email_verified_at'), eq('email_verified', false), lt('created_at', cutoff)),
      )
      .toSql(),
  );

  const candidates = rows.map((row) => toCamelCase<User>(row, USER_COLUMNS));

  let deletedCount = 0;

  for (const user of candidates) {
    // Exclude users with OAuth connections (they are verified via provider)
    const oauthConnections = await repos.oauthConnections.findByUserId(user.id);
    if (oauthConnections.length > 0) {
      continue;
    }

    // Exclude users with active sessions (edge case — might be in progress)
    const activeSessions = await repos.userSessions.findActiveByUserId(user.id);
    if (activeSessions.length > 0) {
      continue;
    }

    // Hard-delete the user
    const deleted = await db.execute(deleteFrom(USERS_TABLE).where(eq('id', user.id)).toSql());

    if (deleted > 0) {
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    log.info({ deletedCount }, 'Unverified user cleanup completed');
  } else {
    log.debug('Unverified user cleanup: no users to clean up');
  }

  return { deletedCount };
}
