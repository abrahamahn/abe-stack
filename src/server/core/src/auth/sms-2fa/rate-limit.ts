// src/server/core/src/auth/sms-2fa/rate-limit.ts
/**
 * SMS Rate Limiting
 *
 * Prevents SMS abuse by limiting the number of codes that can be sent
 * per user within hourly and daily windows.
 *
 * @module sms-2fa
 */

import { MS_PER_DAY, MS_PER_HOUR } from '@abe-stack/shared';

import { SMS_RATE_LIMIT_DAILY, SMS_RATE_LIMIT_HOURLY } from './types';

import type { SmsRateLimitResult } from './types';
import type { DbClient } from '@abe-stack/db';

// ============================================================================
// Rate Limit Check
// ============================================================================

/**
 * Check whether a user has exceeded SMS sending rate limits.
 *
 * Checks two windows:
 * - Hourly: max 3 SMS per hour
 * - Daily: max 10 SMS per day
 *
 * Queries the sms_verification_codes table to count recent sends.
 *
 * @param db - Database client
 * @param userId - User ID to check
 * @returns Rate limit check result with allowed flag and optional retry time
 * @complexity O(1) — two COUNT queries
 */
export async function checkSmsRateLimit(db: DbClient, userId: string): Promise<SmsRateLimitResult> {
  // Count codes sent in the last hour
  const hourlyResult = await db.raw<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM sms_verification_codes
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
    [userId],
  );
  const hourlySent = parseInt(hourlyResult[0]?.count ?? '0', 10);

  if (hourlySent >= SMS_RATE_LIMIT_HOURLY) {
    // Find the oldest code in the hourly window to calculate retry time
    const oldestResult = await db.raw<{ created_at: Date }>(
      `SELECT created_at FROM sms_verification_codes
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'
       ORDER BY created_at ASC LIMIT 1`,
      [userId],
    );
    const oldestCreatedAt = oldestResult[0]?.created_at;
    const retryAfter =
      oldestCreatedAt !== undefined
        ? new Date(oldestCreatedAt.getTime() + MS_PER_HOUR)
        : new Date(Date.now() + MS_PER_HOUR);

    return { allowed: false, retryAfter };
  }

  // Count codes sent in the last 24 hours
  const dailyResult = await db.raw<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM sms_verification_codes
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [userId],
  );
  const dailySent = parseInt(dailyResult[0]?.count ?? '0', 10);

  if (dailySent >= SMS_RATE_LIMIT_DAILY) {
    const oldestDailyResult = await db.raw<{ created_at: Date }>(
      `SELECT created_at FROM sms_verification_codes
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at ASC LIMIT 1`,
      [userId],
    );
    const oldestCreatedAt = oldestDailyResult[0]?.created_at;
    const retryAfter =
      oldestCreatedAt !== undefined
        ? new Date(oldestCreatedAt.getTime() + MS_PER_DAY)
        : new Date(Date.now() + MS_PER_DAY);

    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}
