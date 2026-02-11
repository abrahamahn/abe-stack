// src/server/core/src/users/pii-anonymization.ts
/**
 * PII Anonymization Cron
 *
 * Anonymizes personal data for users whose deletion grace period has expired.
 * Preserves audit trail while removing identifiable information.
 * Should be called periodically by a scheduled job.
 *
 * @module users/pii-anonymization
 */

import { createHash } from 'node:crypto';

import {
  and,
  eq,
  isNotNull,
  lt,
  select,
  toCamelCase,
  update,
  USER_COLUMNS,
  USERS_TABLE,
  type DbClient,
  type User,
} from '@abe-stack/db';

import type { UsersLogger } from './types';

// ============================================================================
// Constants
// ============================================================================

/** Default grace period in days after soft-delete before PII is anonymized */
const DEFAULT_GRACE_PERIOD_DAYS = 30;

/** Placeholder name for anonymized users (preserves audit trail) */
const ANONYMIZED_NAME = 'Deleted User';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of PII anonymization cron execution.
 */
export interface AnonymizeResult {
  /** Number of users whose PII was anonymized */
  anonymizedCount: number;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Hash an email address with SHA-256 for anonymization.
 * The hash preserves uniqueness without revealing the original email.
 *
 * @param email - Email address to hash
 * @returns SHA-256 hex digest of the email
 * @complexity O(1)
 */
function hashEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex');
}

// ============================================================================
// Cron Function
// ============================================================================

/**
 * Anonymize PII for users whose deletion grace period has expired.
 *
 * Finds users where:
 * - `deleted_at` is set (soft-deleted)
 * - `deletion_grace_period_ends` has passed (grace period expired)
 * - email has NOT already been anonymized (not a SHA-256 hex string)
 *
 * For each qualifying user:
 * - Replaces email with SHA-256 hash (preserves uniqueness)
 * - Clears firstName, lastName, phone, bio
 * - Sets firstName to "Deleted User" for audit trail
 *
 * @param db - Database client
 * @param log - Logger instance
 * @param gracePeriodDays - Days after deletion before anonymization (default: 30)
 * @returns Count of anonymized users
 * @complexity O(n) where n is the number of qualifying users
 */
export async function anonymizeExpiredUsers(
  db: DbClient,
  log: UsersLogger,
  gracePeriodDays: number = DEFAULT_GRACE_PERIOD_DAYS,
): Promise<AnonymizeResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - gracePeriodDays);

  // Find users with expired grace periods that haven't been anonymized yet
  // Users whose deleted_at is before the cutoff AND deletion_grace_period_ends has passed
  const now = new Date();
  const rows = await db.query(
    select(USERS_TABLE)
      .where(
        and(
          isNotNull('deleted_at'),
          lt('deleted_at', cutoff),
          isNotNull('deletion_grace_period_ends'),
          lt('deletion_grace_period_ends', now),
        ),
      )
      .toSql(),
  );

  const users = rows.map((row) => toCamelCase<User>(row, USER_COLUMNS));

  // Filter out already-anonymized users (email is a 64-char hex string)
  const hexPattern = /^[a-f0-9]{64}@anonymized\.local$/;
  const usersToAnonymize = users.filter((user) => !hexPattern.test(user.email));

  let anonymizedCount = 0;

  for (const user of usersToAnonymize) {
    const hashedEmail = `${hashEmail(user.email)}@anonymized.local`;

    await db.execute(
      update(USERS_TABLE)
        .set({
          email: hashedEmail,
          canonical_email: hashedEmail,
          username: `deleted_${user.id}`,
          first_name: ANONYMIZED_NAME,
          last_name: '',
          phone: null,
          bio: null,
          avatar_url: null,
          date_of_birth: null,
          gender: null,
          city: null,
          state: null,
          country: null,
          website: null,
        })
        .where(eq('id', user.id))
        .toSql(),
    );

    anonymizedCount++;
  }

  if (anonymizedCount > 0) {
    log.info({ anonymizedCount }, 'PII anonymization completed');
  } else {
    log.debug('PII anonymization: no users to anonymize');
  }

  return { anonymizedCount };
}
