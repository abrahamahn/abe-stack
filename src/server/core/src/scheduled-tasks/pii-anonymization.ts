// src/server/core/src/scheduled-tasks/pii-anonymization.ts
/**
 * PII Anonymization Job
 *
 * Anonymizes personally identifiable information (PII) for users who have been
 * soft-deleted for longer than the grace period. This ensures compliance with
 * data retention policies while maintaining referential integrity.
 *
 * @module
 */

import { createHash } from 'node:crypto';

import { MS_PER_DAY } from '@abe-stack/shared';

import type { ScheduledTaskLogger } from './types';
import type { Repositories } from '@abe-stack/db';

/**
 * Anonymize PII for users deleted longer than the grace period
 *
 * @param repos - Repository container (needs repos.users)
 * @param gracePeriodDays - Number of days to wait before anonymizing (default: 30)
 * @param log - Logger instance
 * @returns Count of anonymized users
 */
export async function anonymizeDeletedUsers(
  repos: Pick<Repositories, 'users'>,
  gracePeriodDays: number,
  log: ScheduledTaskLogger,
): Promise<number> {
  const cutoffDate = new Date(Date.now() - gracePeriodDays * MS_PER_DAY);

  // Find users that are soft-deleted and past grace period, but not yet anonymized
  // We use listWithFilters with no filters to get all users, then filter in memory
  // Note: A future optimization would be to add a dedicated repository method
  const allUsers = await repos.users.listWithFilters({ limit: 10000 });
  const usersToAnonymize = allUsers.data.filter(
    (user) =>
      user.deletedAt !== null &&
      user.deletedAt < cutoffDate &&
      !user.email.startsWith('deleted-'),
  );

  if (usersToAnonymize.length === 0) {
    log.info({ gracePeriodDays }, 'No users to anonymize');
    return 0;
  }

  let anonymizedCount = 0;

  for (const user of usersToAnonymize) {
    try {
      // Generate deterministic hash for email anonymization
      const emailHash = createHash('sha256').update(user.id).digest('hex').substring(0, 16);

      await repos.users.update(user.id, {
        email: `deleted-${emailHash}@anonymized.local`,
        firstName: '',
        lastName: '',
        bio: null,
        phone: null,
        avatarUrl: null,
      });

      anonymizedCount++;
    } catch (error) {
      log.error(
        {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to anonymize user',
      );
    }
  }

  log.info(
    { anonymizedCount, totalFound: usersToAnonymize.length, gracePeriodDays },
    'PII anonymization completed',
  );

  return anonymizedCount;
}
