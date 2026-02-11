// src/server/core/src/users/data-hygiene.ts
/**
 * Data Hygiene Service
 *
 * Utility functions for checking and filtering soft-deleted users,
 * plus hard-delete of anonymized user records past retention.
 *
 * @module users/data-hygiene
 */

import {
  and,
  deleteFrom,
  eq,
  isNotNull,
  lt,
  select,
  toCamelCase,
  USER_COLUMNS,
  USERS_TABLE,
  type DbClient,
  type User,
} from '@abe-stack/db';

import type { UsersLogger } from './types';

// ============================================================================
// Soft-Delete Checks
// ============================================================================

/**
 * Check if a user has been soft-deleted.
 *
 * @param user - User record to check
 * @returns true if the user's deletedAt field is set
 * @complexity O(1)
 */
export function isUserDeleted(user: Pick<User, 'deletedAt'>): boolean {
  return user.deletedAt !== null;
}

/**
 * Filter soft-deleted users from an array.
 * Returns only users whose deletedAt is null (i.e., not deleted).
 *
 * @param users - Array of user records to filter
 * @returns Array with soft-deleted users removed
 * @complexity O(n) where n is the length of the input array
 */
export function filterDeletedUsers<T extends Pick<User, 'deletedAt'>>(users: T[]): T[] {
  return users.filter((user) => !isUserDeleted(user));
}

// ============================================================================
// Hard-Delete Anonymized Users
// ============================================================================

/** Retention period in days after anonymization before hard-delete */
const HARD_DELETE_RETENTION_DAYS = 30;

/** Pattern matching anonymized email addresses (SHA-256 hex @ anonymized.local) */
const ANONYMIZED_EMAIL_PATTERN = /^[a-f0-9]{64}@anonymized\.local$/;

/**
 * Result of hard-delete operation.
 */
export interface HardDeleteResult {
  /** Number of user records permanently deleted */
  deletedCount: number;
}

/**
 * Hard-delete user records that were anonymized more than retentionDays ago.
 *
 * Finds users where:
 * - `deleted_at` is set (soft-deleted)
 * - email matches the anonymized pattern ({sha256}@anonymized.local)
 * - `deleted_at` is older than retention cutoff
 *
 * Qualifying users are hard-deleted from the database.
 * Related records (sessions, tokens, memberships, etc.) are removed
 * via ON DELETE CASCADE foreign key constraints.
 *
 * If a user owns a tenant (ON DELETE RESTRICT), the delete is skipped
 * and logged as a warning.
 *
 * @param db - Database client
 * @param log - Logger instance
 * @param retentionDays - Days after anonymization before hard-delete (default: 30)
 * @returns Count of deleted users
 * @complexity O(n) where n is the number of qualifying users
 */
export async function hardDeleteAnonymizedUsers(
  db: DbClient,
  log: UsersLogger,
  retentionDays: number = HARD_DELETE_RETENTION_DAYS,
): Promise<HardDeleteResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  // Find soft-deleted users whose deleted_at is older than the retention cutoff
  const rows = await db.query(
    select(USERS_TABLE)
      .where(
        and(
          isNotNull('deleted_at'),
          lt('deleted_at', cutoff),
        ),
      )
      .toSql(),
  );

  const users = rows.map((row) => toCamelCase<User>(row, USER_COLUMNS));

  // Filter to only anonymized users (email matches SHA-256 pattern)
  const usersToDelete = users.filter((user) => ANONYMIZED_EMAIL_PATTERN.test(user.email));

  let deletedCount = 0;

  for (const user of usersToDelete) {
    try {
      const deleted = await db.execute(
        deleteFrom(USERS_TABLE).where(eq('id', user.id)).toSql(),
      );

      if (deleted > 0) {
        deletedCount++;
      }
    } catch (error) {
      // ON DELETE RESTRICT (e.g., tenant owner) will throw — skip and log
      log.warn(
        {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to hard-delete anonymized user (may be tenant owner)',
      );
    }
  }

  if (deletedCount > 0) {
    log.info({ deletedCount }, 'Hard-delete anonymized users completed');
  } else {
    log.debug('Hard-delete anonymized users: no users to delete');
  }

  return { deletedCount };
}
