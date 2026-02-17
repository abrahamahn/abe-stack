// main/shared/src/core/membership/membership.logic.ts
/**
 * @file Membership Logic
 * @description Business logic for invite status, transitions, and role validation.
 * @module Core/Membership
 */

import type { TenantRole } from '../auth/roles';
import type { Invitation, Membership } from './membership.schemas';

// ============================================================================
// Constants
// ============================================================================

/** Numeric level for each role (ascending power). */
export const ROLE_LEVELS: Record<TenantRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

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
  const currentLevel = ROLE_LEVELS[membership.role.toLowerCase() as TenantRole];
  const requiredLevel = ROLE_LEVELS[requiredRole.toLowerCase() as TenantRole];

  return currentLevel >= requiredLevel;
}

/**
 * Returns the numeric level for a tenant role.
 */
export function getRoleLevel(role: TenantRole): number {
  return ROLE_LEVELS[role];
}

// ============================================================================
// Role Hierarchy Protection
// ============================================================================

/**
 * Determines if an actor with `actorRole` can assign `targetRole` to another member.
 *
 * Rules:
 * - Owner can assign any role except owner (ownership is transferred, not assigned).
 * - Admin can assign member or viewer.
 * - Member and viewer cannot assign roles.
 */
export function canAssignRole(actorRole: TenantRole, targetRole: TenantRole): boolean {
  const actorLevel = ROLE_LEVELS[actorRole];
  const targetLevel = ROLE_LEVELS[targetRole];

  // Must be admin or above to assign roles
  if (actorLevel < ROLE_LEVELS.admin) return false;

  // Cannot assign a role at or above your own level
  return targetLevel < actorLevel;
}

/**
 * Determines if an actor can remove a member with `targetRole`.
 *
 * Rules:
 * - Owner can remove anyone except another owner.
 * - Admin can remove members and viewers (not other admins or owners).
 * - Member and viewer cannot remove anyone.
 */
export function canRemoveMember(actorRole: TenantRole, targetRole: TenantRole): boolean {
  const actorLevel = ROLE_LEVELS[actorRole];
  const targetLevel = ROLE_LEVELS[targetRole];

  // Must be admin or above to remove members
  if (actorLevel < ROLE_LEVELS.admin) return false;

  // Can only remove members with a strictly lower role
  return targetLevel < actorLevel;
}

/**
 * Determines if an actor can change a member's role from `fromRole` to `toRole`.
 *
 * Rules:
 * - Actor must be able to "manage" the target (target's current role < actor's role).
 * - Actor must be able to assign the new role (new role < actor's role).
 * - Cannot change to/from owner (ownership uses transfer, not role change).
 */
export function canChangeRole(
  actorRole: TenantRole,
  fromRole: TenantRole,
  toRole: TenantRole,
): boolean {
  // No-op changes are not allowed
  if (fromRole === toRole) return false;

  // Owner role changes use the transfer mechanism, not role change
  if (fromRole === 'owner' || toRole === 'owner') return false;

  const actorLevel = ROLE_LEVELS[actorRole];
  const fromLevel = ROLE_LEVELS[fromRole];
  const toLevel = ROLE_LEVELS[toRole];

  // Must be admin or above
  if (actorLevel < ROLE_LEVELS.admin) return false;

  // Actor must outrank both the current and new role
  return fromLevel < actorLevel && toLevel < actorLevel;
}

// ============================================================================
// Orphan Prevention
// ============================================================================

/**
 * Determines if the given userId is the sole owner of the membership list.
 * Returns true if there is exactly one owner and that owner is the given user.
 */
export function isSoleOwner(memberships: Membership[], userId: string): boolean {
  const owners = memberships.filter((m) => m.role === 'owner');
  return owners.length === 1 && owners[0]?.userId === userId;
}

/**
 * Determines if a user can leave a workspace.
 * A user cannot leave if they are the sole owner — they must transfer ownership first.
 */
export function canLeave(memberships: Membership[], userId: string): boolean {
  return !isSoleOwner(memberships, userId);
}

/**
 * Returns the best candidate for automatic ownership transfer.
 * Priority: highest-role non-owner member, then by earliest join date.
 * Returns undefined if no candidates exist (sole member).
 */
export function getNextOwnerCandidate(
  memberships: Membership[],
  currentOwnerId: string,
): Membership | undefined {
  const candidates = memberships.filter((m) => m.userId !== currentOwnerId);

  if (candidates.length === 0) {
    return undefined;
  }

  // Sort by role level (descending) then by creation date (ascending)
  candidates.sort((a, b) => {
    const levelDiff = ROLE_LEVELS[b.role] - ROLE_LEVELS[a.role];
    if (levelDiff !== 0) return levelDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return candidates[0];
}
