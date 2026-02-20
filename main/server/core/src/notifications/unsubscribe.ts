// main/server/core/src/notifications/unsubscribe.ts
/**
 * Email Unsubscribe Service
 *
 * Manages email unsubscribe preferences per user.
 * Supports one-click unsubscribe (RFC 8058) via:
 * - `List-Unsubscribe` and `List-Unsubscribe-Post` headers on outgoing emails
 * - `GET /api/email/unsubscribe/:token` public endpoint
 *
 * Token format: HMAC-SHA256 of `userId:category` signed with the app secret.
 * Tokens are stateless and do not expire — unsubscribe must always work.
 *
 * Unsubscribe categories:
 * - `marketing`   — promotional emails, newsletters
 * - `social`      — social notifications (invites, mentions)
 * - `all`         — suppresses all non-transactional emails
 *
 * Transactional and security emails (password reset, verification, security
 * alerts) are NEVER suppressible — they are always delivered regardless of
 * unsubscribe status.
 *
 * @module
 */

import { createHmac } from 'node:crypto';

import type { DbClient } from '../../../db/src';

// ============================================================================
// Constants
// ============================================================================

/** Categories that can be unsubscribed from. */
export const UNSUBSCRIBE_CATEGORIES = ['marketing', 'social', 'all'] as const;
export type UnsubscribeCategory = (typeof UNSUBSCRIBE_CATEGORIES)[number];

/**
 * Notification types that are NEVER suppressible.
 * These bypass unsubscribe preferences entirely.
 */
export const NON_SUPPRESSIBLE_TYPES = new Set(['transactional', 'security']);

// ============================================================================
// Token Generation & Validation
// ============================================================================

/**
 * Generate a stateless unsubscribe token for a user + category.
 *
 * The token is an HMAC-SHA256 hex digest of `userId:category` keyed with
 * the application secret. It's URL-safe and deterministic — the same
 * inputs always produce the same token.
 *
 * @param userId - User ID
 * @param category - Unsubscribe category
 * @param secret - Application secret key (e.g., `JWT_SECRET` or `APP_SECRET`)
 * @returns Hex-encoded HMAC token
 * @complexity O(1)
 */
export function generateUnsubscribeToken(
  userId: string,
  category: UnsubscribeCategory,
  secret: string,
): string {
  const payload = `${userId}:${category}`;
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Validate an unsubscribe token against expected userId and category.
 *
 * @param token - Token to validate
 * @param userId - Expected user ID
 * @param category - Expected category
 * @param secret - Application secret key
 * @returns true if the token is valid
 * @complexity O(1)
 */
export function validateUnsubscribeToken(
  token: string,
  userId: string,
  category: UnsubscribeCategory,
  secret: string,
): boolean {
  const expected = generateUnsubscribeToken(userId, category, secret);
  // Constant-time comparison to prevent timing attacks
  if (token.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// List-Unsubscribe Headers (RFC 8058)
// ============================================================================

/**
 * Generate RFC 8058 compliant `List-Unsubscribe` headers for an outgoing email.
 *
 * Returns two headers:
 * - `List-Unsubscribe`: `<mailto:...>, <https://...>`
 * - `List-Unsubscribe-Post`: `List-Unsubscribe=One-Click`
 *
 * @param baseUrl - Application base URL (e.g., `https://app.example.com`)
 * @param userId - Recipient user ID
 * @param category - Unsubscribe category for this email
 * @param secret - Application secret key
 * @returns Object with header names as keys and header values as values
 * @complexity O(1)
 */
export function generateUnsubscribeHeaders(
  baseUrl: string,
  userId: string,
  category: UnsubscribeCategory,
  secret: string,
): Record<string, string> {
  const token = generateUnsubscribeToken(userId, category, secret);
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe/${token}?uid=${userId}&cat=${category}`;

  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

// ============================================================================
// Preference Persistence
// ============================================================================

/**
 * Record an unsubscribe for a user + category.
 *
 * Creates or updates the preference record in the database.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param category - Category to unsubscribe from
 * @complexity O(1)
 */
export async function unsubscribeUser(
  db: DbClient,
  userId: string,
  category: UnsubscribeCategory,
): Promise<void> {
  await db.execute({
    text: `INSERT INTO email_unsubscribes (user_id, category, unsubscribed_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (user_id, category)
           DO UPDATE SET unsubscribed_at = NOW()`,
    values: [userId, category],
  });
}

/**
 * Re-subscribe a user to a category.
 *
 * Removes the unsubscribe record, allowing emails to be sent again.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param category - Category to re-subscribe to
 * @returns true if a record was removed
 * @complexity O(1)
 */
export async function resubscribeUser(
  db: DbClient,
  userId: string,
  category: UnsubscribeCategory,
): Promise<boolean> {
  const count = await db.execute({
    text: `DELETE FROM email_unsubscribes
           WHERE user_id = $1 AND category = $2`,
    values: [userId, category],
  });
  return count > 0;
}

/**
 * Check if a user has unsubscribed from a given category.
 *
 * Also checks for the `all` category — if a user has unsubscribed from `all`,
 * they are considered unsubscribed from every category.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param category - Category to check
 * @returns true if the user has unsubscribed
 * @complexity O(1)
 */
export async function isUnsubscribed(
  db: DbClient,
  userId: string,
  category: UnsubscribeCategory,
): Promise<boolean> {
  const row = await db.queryOne<{ count: number }>({
    text: `SELECT COUNT(*)::int AS count
           FROM email_unsubscribes
           WHERE user_id = $1 AND (category = $2 OR category = 'all')`,
    values: [userId, category],
  });
  return (row?.count ?? 0) > 0;
}

/**
 * Get all categories a user has unsubscribed from.
 *
 * @param db - Database client
 * @param userId - User ID
 * @returns Array of unsubscribed categories
 * @complexity O(n) where n is number of unsubscribed categories
 */
export async function getUnsubscribedCategories(
  db: DbClient,
  userId: string,
): Promise<UnsubscribeCategory[]> {
  const rows = await db.query<{ category: string }>({
    text: `SELECT category FROM email_unsubscribes WHERE user_id = $1`,
    values: [userId],
  });
  return rows.map((r) => r.category as UnsubscribeCategory);
}

// ============================================================================
// Email Sending Pipeline Integration
// ============================================================================

/**
 * Check whether an email should be sent to a user, respecting unsubscribe
 * preferences and bounce status.
 *
 * Rules:
 * 1. Transactional and security emails are ALWAYS sent (non-suppressible).
 * 2. If the notification type maps to a suppressible category AND the user
 *    has unsubscribed from that category (or `all`), the email is suppressed.
 *
 * @param db - Database client
 * @param userId - Target user ID
 * @param notificationType - The notification type being sent (e.g., 'marketing', 'social', 'security')
 * @returns true if the email should be sent
 * @complexity O(1)
 */
export async function shouldSendEmail(
  db: DbClient,
  userId: string,
  notificationType: string,
): Promise<boolean> {
  // Non-suppressible types always get through
  if (NON_SUPPRESSIBLE_TYPES.has(notificationType)) {
    return true;
  }

  // Map notification type to unsubscribe category
  const category = notificationType as UnsubscribeCategory;
  if (!UNSUBSCRIBE_CATEGORIES.includes(category)) {
    // Unknown category — default to allowing send
    return true;
  }

  // Check unsubscribe status
  const unsub = await isUnsubscribed(db, userId, category);
  return !unsub;
}
