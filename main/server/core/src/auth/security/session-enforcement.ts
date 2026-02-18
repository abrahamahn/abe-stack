// main/server/core/src/auth/security/session-enforcement.ts
/**
 * Session Enforcement Helper
 *
 * Pure functions for session idle timeout checking and concurrent session
 * enforcement. Used by auth middleware and login handlers.
 *
 * @module security/session-enforcement
 */

import { MS_PER_DAY } from '@bslt/shared';

import type { Repositories } from '../../../../db/src';

// ============================================================================
// Session Idle Timeout
// ============================================================================

/**
 * Check if a session is idle based on its last activity timestamp.
 *
 * @param lastActiveAt - When the session was last active
 * @param idleTimeoutDays - Number of days of inactivity before session is considered idle
 * @returns True if the session has been idle longer than the timeout
 * @complexity O(1)
 */
export function isSessionIdle(lastActiveAt: Date, idleTimeoutDays: number): boolean {
  const idleTimeoutMs = idleTimeoutDays * MS_PER_DAY;
  const idleSince = Date.now() - lastActiveAt.getTime();
  return idleSince > idleTimeoutMs;
}

/**
 * Calculate how many milliseconds remain before a session becomes idle.
 * Returns 0 if the session is already idle.
 *
 * @param lastActiveAt - When the session was last active
 * @param idleTimeoutDays - Number of days of inactivity before session is considered idle
 * @returns Milliseconds remaining before idle, or 0 if already idle
 * @complexity O(1)
 */
export function getIdleTimeRemaining(lastActiveAt: Date, idleTimeoutDays: number): number {
  const idleTimeoutMs = idleTimeoutDays * MS_PER_DAY;
  const elapsed = Date.now() - lastActiveAt.getTime();
  const remaining = idleTimeoutMs - elapsed;
  return remaining > 0 ? remaining : 0;
}

// ============================================================================
// Concurrent Session Enforcement
// ============================================================================

/**
 * Enforce a maximum number of concurrent sessions for a user.
 * If the user exceeds the limit, the oldest sessions are revoked.
 *
 * @param repos - Repository container
 * @param userId - The user whose sessions to enforce
 * @param maxSessions - Maximum number of allowed concurrent sessions
 * @returns Number of sessions revoked
 * @complexity O(n log n) where n is the number of active sessions (due to sorting)
 */
export async function enforceMaxConcurrentSessions(
  repos: Repositories,
  userId: string,
  maxSessions: number,
): Promise<number> {
  if (maxSessions <= 0) {
    return 0;
  }

  const activeFamilies = await repos.refreshTokenFamilies.findActiveByUserId(userId);

  if (activeFamilies.length <= maxSessions) {
    return 0;
  }

  // Sort by creation date ascending (oldest first)
  const sorted = [...activeFamilies].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Revoke the oldest sessions that exceed the limit
  const excessCount = activeFamilies.length - maxSessions;
  const toEvict = sorted.slice(0, excessCount);

  let revokedCount = 0;
  for (const family of toEvict) {
    await repos.refreshTokenFamilies.revoke(family.id, 'Session limit exceeded');
    revokedCount++;
  }

  return revokedCount;
}
