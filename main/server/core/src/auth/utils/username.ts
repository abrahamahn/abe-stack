// main/server/core/src/auth/utils/username.ts
/**
 * Username Generation Utilities
 *
 * Helpers for deriving unique usernames from email addresses and
 * splitting full names into first/last components. Used by OAuth
 * and magic-link flows when creating users without explicit usernames.
 *
 * @module utils/username
 */

import { randomBytes } from 'node:crypto';

import { QUOTAS } from '@abe-stack/shared';

import type { Repositories } from '../../../../db/src';

/** Maximum username length (from shared QUOTAS) */
const MAX_USERNAME_LENGTH = QUOTAS.MAX_USERNAME_LENGTH;

/** Characters allowed in auto-generated usernames */
const SANITIZE_REGEX = /[^a-z0-9_]/g;

/** Maximum collision retry attempts before falling back to random username */
const MAX_COLLISION_RETRIES = 5;

/** Random suffix length in hex characters (2 bytes = 4 hex chars) */
const SUFFIX_BYTES = 2;

/**
 * Generate a unique username from an email address.
 *
 * Strategy:
 * 1. Extract the part before '@', lowercase, strip invalid chars.
 * 2. If that username is available, use it.
 * 3. On collision, append `_XXXX` suffix (4 hex chars) and retry.
 * 4. After 5 retries, fall back to `user_XXXXXXXX` (8 hex chars).
 *
 * @param repos - Repositories for username uniqueness checks
 * @param email - User's email address
 * @returns A unique username guaranteed to match the USERNAME_REGEX
 * @complexity O(k) where k is the number of collision retries (max 5)
 */
export async function generateUniqueUsername(repos: Repositories, email: string): Promise<string> {
  // Extract and sanitize prefix from email
  const rawPrefix = email.split('@')[0] ?? 'user';
  const sanitized = rawPrefix.toLowerCase().replace(SANITIZE_REGEX, '');
  const prefix = sanitized.length > 0 ? sanitized.slice(0, MAX_USERNAME_LENGTH) : 'user';

  // Try the bare prefix first
  const existing = await repos.users.findByUsername(prefix);
  if (existing === null) {
    return prefix;
  }

  // Collision: try with random suffix (underscore + 4 hex chars = 5 chars)
  const suffixLength = 1 + SUFFIX_BYTES * 2; // "_" + hex chars
  const maxPrefixWithSuffix = MAX_USERNAME_LENGTH - suffixLength;
  const truncatedPrefix = prefix.slice(0, maxPrefixWithSuffix);

  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const suffix = randomBytes(SUFFIX_BYTES).toString('hex');
    const candidate = `${truncatedPrefix}_${suffix}`;
    const check = await repos.users.findByUsername(candidate);
    if (check === null) {
      return candidate;
    }
  }

  // Fallback: fully random username
  const fallback = `user_${randomBytes(4).toString('hex')}`;
  return fallback.slice(0, MAX_USERNAME_LENGTH);
}

/**
 * Split a full name into first and last name components.
 *
 * Strategy:
 * - If name is null or empty, defaults to firstName="User", lastName="".
 * - Splits on the first space: everything before is firstName, the rest is lastName.
 * - If no space, the entire string is firstName, lastName is empty.
 *
 * @param name - Full name from OAuth provider or null
 * @returns Object with firstName and lastName
 * @complexity O(1)
 */
export function splitFullName(name: string | null): { firstName: string; lastName: string } {
  if (name === null || name.trim() === '') {
    return { firstName: 'User', lastName: '' };
  }
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: '' };
  }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim(),
  };
}
