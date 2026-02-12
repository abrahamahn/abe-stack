// src/server/core/src/scheduled-tasks/hard-delete.ts
/**
 * Hard-Delete Anonymized Users Job
 *
 * Permanently removes user records that were anonymized more than the
 * retention period ago. Related records are cascade-deleted by the database.
 *
 * @module
 */

import {
  deleteFrom,
  eq,
  isNotNull,
  lt,
  select,
  toCamelCase,
  USER_COLUMNS,
  USERS_TABLE,
} from '@abe-stack/db';

import { ANONYMIZED_EMAIL_PATTERN } from '../users';

import type { ScheduledTaskLogger } from './types';
import type { DbClient, User } from '@abe-stack/db';

/**
 * Hard-delete anonymized users past the retention period.
 *
 * Finds soft-deleted users with anonymized emails whose deleted_at is older
 * than the retention cutoff, then permanently removes them from the database.
 * Related records are cascade-deleted via foreign key constraints.
 *
 * @param db - Database client for direct SQL queries
 * @param retentionDays - Days after anonymization before hard-delete
 * @param log - Logger instance
 * @returns Count of deleted users
 */
export async function hardDeleteAnonymizedUsersTask(
  db: DbClient,
  retentionDays: number,
  log: ScheduledTaskLogger,
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  // Find soft-deleted users whose deleted_at is older than the retention cutoff
  const rows = await db.query(
    select(USERS_TABLE).where(isNotNull('deleted_at')).where(lt('deleted_at', cutoff)).toSql(),
  );

  const users = rows.map((row) => toCamelCase<User>(row, USER_COLUMNS));
  const usersToDelete = users.filter((user) => ANONYMIZED_EMAIL_PATTERN.test(user.email));

  if (usersToDelete.length === 0) {
    log.info({ retentionDays }, 'No anonymized users to hard-delete');
    return 0;
  }

  let deletedCount = 0;

  for (const user of usersToDelete) {
    try {
      const deleted = await db.execute(deleteFrom(USERS_TABLE).where(eq('id', user.id)).toSql());

      if (deleted > 0) {
        deletedCount++;
      }
    } catch (error) {
      // ON DELETE RESTRICT (e.g., tenant owner) will throw — skip and log
      log.error(
        {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to hard-delete anonymized user',
      );
    }
  }

  log.info(
    { deletedCount, totalFound: usersToDelete.length, retentionDays },
    'Hard-delete anonymized users completed',
  );

  return deletedCount;
}
