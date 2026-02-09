// src/shared/src/domain/sessions/sessions.logic.ts

/**
 * @file Session Domain Logic
 * @description Pure functions for user session state evaluation.
 * @module Domain/Sessions
 */

import type { UserSession } from './sessions.schemas';

// ============================================================================
// Session State Queries
// ============================================================================

/**
 * Checks whether a session is currently active (not revoked).
 *
 * @param session - The session to evaluate
 * @returns `true` if `revokedAt` is `null`
 * @complexity O(1)
 */
export function isSessionActive(session: Pick<UserSession, 'revokedAt'>): boolean {
  return session.revokedAt === null;
}

/**
 * Checks whether a session has been revoked.
 *
 * @param session - The session to evaluate
 * @returns `true` if `revokedAt` is set
 * @complexity O(1)
 */
export function isSessionRevoked(session: Pick<UserSession, 'revokedAt'>): boolean {
  return session.revokedAt !== null;
}

/**
 * Calculates the age of a session in milliseconds.
 *
 * @param session - The session to evaluate
 * @param now - Reference time (defaults to `Date.now()`)
 * @returns Age in milliseconds
 * @complexity O(1)
 */
export function getSessionAge(
  session: Pick<UserSession, 'createdAt'>,
  now: number = Date.now(),
): number {
  return now - session.createdAt.getTime();
}
