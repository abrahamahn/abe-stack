// apps/server/src/modules/users/sessions.service.ts
/**
 * Sessions Service
 *
 * Business logic for user session management.
 * Handles listing, revoking, and managing refresh token families.
 */

import { NotFoundError } from '@abe-stack/core';

import type { Repositories } from '@/infrastructure';

// ============================================================================
// Types
// ============================================================================

export interface UserSession {
  id: string;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * List all active sessions for a user
 * Marks the current session based on the provided familyId
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
 * Revoke a specific session
 * Users cannot revoke their current session (use logout instead)
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
 * Revoke all sessions except the current one
 * Returns the count of revoked sessions
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
 * Get session count for a user
 * Useful for displaying "X active sessions" in UI
 */
export async function getSessionCount(repos: Repositories, userId: string): Promise<number> {
  const families = await repos.refreshTokenFamilies.findActiveByUserId(userId);
  return families.length;
}
