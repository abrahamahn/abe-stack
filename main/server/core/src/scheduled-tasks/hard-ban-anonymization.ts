// main/server/core/src/scheduled-tasks/hard-ban-anonymization.ts
/**
 * Hard Ban PII Anonymization Job
 *
 * Anonymizes personally identifiable information for hard-banned users
 * whose grace period has expired. This is separate from the general
 * soft-delete anonymization because hard-banned users have a shorter
 * grace period (default 7 days vs 30 days) and require more thorough
 * cleanup (audit trail preservation, additional field scrubbing).
 *
 * Sprint 3.15: Background job for hard-ban PII anonymization.
 *
 * @module
 */

import { createHash } from 'node:crypto';

import { MS_PER_DAY, RETENTION_PERIODS } from '@bslt/shared';

import type { ScheduledTaskLogger } from './types';
import type { Repositories } from '../../../db/src';

// ============================================================================
// Constants
// ============================================================================

/** Sentinel lock date used by hard ban to mark permanent bans */
const PERMANENT_LOCK_THRESHOLD = new Date('2090-01-01');

// ============================================================================
// Main Function
// ============================================================================

/**
 * Anonymize PII for hard-banned users whose grace period has expired.
 *
 * Only processes users that are:
 * 1. Soft-deleted (deletedAt is set)
 * 2. Permanently locked (lockedUntil > 2090, indicating hard ban vs soft lock)
 * 3. Past their deletion grace period
 * 4. Not already anonymized (email does not start with 'deleted-')
 *
 * Preserves audit structure: The user record remains with a hashed email
 * so that audit events can still reference the user ID.
 *
 * @param repos - Repository container
 * @param log - Logger instance
 * @returns Count of anonymized users
 */
export async function anonymizeHardBannedUsers(
  repos: Pick<Repositories, 'users'>,
  log: ScheduledTaskLogger,
): Promise<number> {
  const now = new Date();
  const gracePeriodMs = RETENTION_PERIODS.HARD_BAN_GRACE_DAYS * MS_PER_DAY;
  const cutoffDate = new Date(now.getTime() - gracePeriodMs);

  // Find users that are deleted and past hard-ban grace period
  const allUsers = await repos.users.listWithFilters({ limit: 10000 });
  const hardBannedPastGrace = allUsers.data.filter((user) => {
    // Must be soft-deleted
    if (user.deletedAt === null) return false;
    // Must not already be anonymized
    if (user.email.startsWith('deleted-')) return false;
    // Must be permanently locked (hard ban marker)
    if (user.lockedUntil === null || user.lockedUntil < PERMANENT_LOCK_THRESHOLD) return false;
    // Must be past grace period
    return user.deletedAt < cutoffDate;
  });

  if (hardBannedPastGrace.length === 0) {
    log.info(
      { gracePeriodDays: RETENTION_PERIODS.HARD_BAN_GRACE_DAYS },
      'No hard-banned users to anonymize',
    );
    return 0;
  }

  let anonymizedCount = 0;

  for (const user of hardBannedPastGrace) {
    try {
      // Generate deterministic hash for email anonymization
      const emailHash = createHash('sha256').update(user.id).digest('hex').substring(0, 16);

      // Anonymize all PII fields, preserving audit structure (user ID stays intact)
      await repos.users.update(user.id, {
        email: `deleted-${emailHash}@anonymized.local`,
        firstName: '',
        lastName: '',
        bio: null,
        phone: null,
        avatarUrl: null,
        city: null,
        state: null,
        country: null,
        gender: null,
        dateOfBirth: null,
        website: null,
        language: null,
        // Clear the lock reason as it may contain PII references
        lockReason: null,
      });

      anonymizedCount++;
      log.info(
        { userId: user.id, action: 'hard_ban_anonymize' },
        'Hard-banned user PII anonymized',
      );
    } catch (error) {
      log.error(
        {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to anonymize hard-banned user',
      );
    }
  }

  log.info(
    {
      anonymizedCount,
      totalFound: hardBannedPastGrace.length,
      gracePeriodDays: RETENTION_PERIODS.HARD_BAN_GRACE_DAYS,
    },
    'Hard-ban PII anonymization completed',
  );

  return anonymizedCount;
}
