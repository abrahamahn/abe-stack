// src/shared/src/domain/membership/membership.logic.ts
/**
 * @file Membership Logic
 * @description Business logic for invite status, transitions, and role validation.
 * @module Domain/Membership
 */

import type { Invitation, Membership } from './membership.schemas';

// ============================================================================
// Invite Lifecycle
// ============================================================================

/**
 * Checks if an invitation has expired based on current time.
 */
export function isInviteExpired(invite: Invitation): boolean {
  return new Date(invite.expiresAt) < new Date();
}

/**
 * Determines if an invitation can be accepted.
 */
export function canAcceptInvite(invite: Invitation): boolean {
  return invite.status === 'pending' && !isInviteExpired(invite);
}

/**
 * Determines if an invitation can be revoked.
 */
export function canRevokeInvite(invite: Invitation): boolean {
  return invite.status === 'pending';
}

// ============================================================================
// Role Logic
// ============================================================================

/**
 * Checks if a membership has at least the required role level.
 * Hierarchy: owner > admin > member > viewer
 */
export function hasAtLeastRole(
  membership: Membership,
  requiredRole: 'owner' | 'admin' | 'member' | 'viewer',
): boolean {
  const roles = ['viewer', 'member', 'admin', 'owner']; // Ascending power
  const currentLevel = roles.indexOf(membership.role.toLowerCase());
  const requiredLevel = roles.indexOf(requiredRole.toLowerCase());

  return currentLevel >= requiredLevel;
}
