// main/shared/src/core/users/users.permissions.ts

/**
 * @file User Permissions
 * @description Domain-specific permission helpers for Users.
 * @module Core/Users
 */

import {
  can as baseCan,
} from '../auth/auth.policy';

import type { AppRole, User } from './users.schemas';
import type { UserId } from '../../primitives/schema/ids';
import type { AuthContext, PolicyAction, PolicyResource } from '../auth/auth.policy';

// ============================================================================
// Access Control Logic
// ============================================================================

/**
 * Convenience wrapper for the core authorization policy.
 *
 * @param user - The user object
 * @param action - The action to perform
 * @param resource - The resource identifier
 * @param ctx - Additional context (tenantRole, isOwner)
 * @returns boolean - Whether the action is allowed
 */
export function canUser(
  user: User,
  action: PolicyAction,
  resource: PolicyResource,
  ctx: Partial<Omit<AuthContext, 'appRole'>> = {},
): boolean {
  return baseCan(
    {
      appRole: user.role,
      ...ctx,
    },
    action,
    resource,
  );
}

/**
 * Checks if a user is the owner of a resource.
 */
export function isOwner(userId: UserId, resourceOwnerId: UserId): boolean {
  return userId === resourceOwnerId;
}

// ============================================================================
// Role Checks
// ============================================================================

export function hasRole(user: User, role: AppRole): boolean {
  return user.role === role;
}

export function isAdmin(user: User): boolean {
  return hasRole(user, 'admin');
}

export function isModerator(user: User): boolean {
  return hasRole(user, 'moderator');
}

export function isRegularUser(user: User): boolean {
  return hasRole(user, 'user');
}
