// modules/users/src/handlers/sessions.ts
/**
 * Sessions Service
 *
 * Business logic for user session management.
 * Handles listing, revoking, and managing refresh token families.
 *
 * @module handlers/sessions
 */

import { NotFoundError } from '@abe-stack/shared';

import type { Repositories } from '@abe-stack/db';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a user's active session.
 * Maps to a refresh token family in the database.
 */
export interface UserSession {
  /** Session (token family) unique identifier */
  id: string;
  /** When the session was created */
  createdAt: Date;
  /** IP address used when session was created */
  ipAddress: string | null;
  /** User agent string when session was created */
  userAgent: string | null;
  /** Whether this is the current session */
  isCurrent: boolean;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * List all active sessions for a user.
 * Marks the current session based on the provided familyId.
 *
 * @param repos - Repository container
 * @param userId - ID of the user whose sessions to list
 * @param currentFamilyId - ID of the current session's token family
 * @returns Array of active user sessions
 * @complexity O(n) where n is the number of active sessions
 */
export async function listUserSessions(
  repos: Repositories,
  userId: string,
  currentFamilyId?: string,
): Promise<UserSession[]> {
  // Get all active (non-revoked) token families for this user
  const families = await repos.refreshTokenFamilies.findActiveByUserId(userId);

  return families.map((family) => ({
    id: family.id,
    createdAt: family.createdAt,
    ipAddress: family.ipAddress,
    userAgent: family.userAgent,
    isCurrent: family.id === currentFamilyId,
  }));
}

/**
 * Revoke a specific session.
 * Users cannot revoke their current session (use logout instead).
 *
 * @param repos - Repository container
 * @param userId - ID of the user who owns the session
 * @param sessionId - ID of the session to revoke
 * @param currentFamilyId - ID of the current session's token family
 * @throws NotFoundError if session is current, not found, or belongs to another user
 * @complexity O(1) - single database lookup and update
 */
export async function revokeSession(
  repos: Repositories,
  userId: string,
  sessionId: string,
  currentFamilyId?: string,
): Promise<void> {
  // Don't allow revoking current session
  if (sessionId === currentFamilyId) {
    throw new NotFoundError('Cannot revoke current session. Use logout instead.');
  }

  // Verify the session belongs to this user
  const family = await repos.refreshTokenFamilies.findById(sessionId);

  if (family?.userId !== userId) {
    throw new NotFoundError('Session not found');
  }

  if (family.revokedAt !== null) {
    // Already revoked, nothing to do
    return;
  }

  // Revoke the session
  await repos.refreshTokenFamilies.revoke(sessionId, 'User revoked session');
}

/**
 * Revoke all sessions except the current one.
 * Returns the count of revoked sessions.
 *
 * @param repos - Repository container
 * @param userId - ID of the user whose sessions to revoke
 * @param currentFamilyId - ID of the current session to exclude
 * @returns Number of sessions revoked
 * @complexity O(n) where n is the number of active sessions
 */
export async function revokeAllSessions(
  repos: Repositories,
  userId: string,
  currentFamilyId?: string,
): Promise<number> {
  // Get all active sessions
  const families = await repos.refreshTokenFamilies.findActiveByUserId(userId);

  // Filter out the current session
  const sessionsToRevoke = families.filter((f) => f.id !== currentFamilyId);

  // Revoke each session
  let revokedCount = 0;
  for (const family of sessionsToRevoke) {
    await repos.refreshTokenFamilies.revoke(family.id, 'User logged out from all devices');
    revokedCount++;
  }

  return revokedCount;
}

/**
 * Get session count for a user.
 * Useful for displaying "X active sessions" in UI.
 *
 * @param repos - Repository container
 * @param userId - ID of the user whose sessions to count
 * @returns Number of active sessions
 * @complexity O(1) after repository call - Array.length is O(1)
 */
export async function getSessionCount(repos: Repositories, userId: string): Promise<number> {
  const families = await repos.refreshTokenFamilies.findActiveByUserId(userId);
  return families.length;
}
