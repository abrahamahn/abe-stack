// main/shared/src/core/users/users.roles.ts

/**
 * @file User Roles
 * @description Role-checking utility functions.
 * @module Core/Users
 */

import { APP_ROLES } from '../constants/auth';

import type { AppRole } from '../auth/roles';

// ============================================================================
// Functions
// ============================================================================

/** Check if a role has admin privileges */
export function isAdmin(role: AppRole): boolean {
  return role === 'admin';
}

/** Check if a role has moderator privileges */
export function isModerator(role: AppRole): boolean {
  return role === 'admin' || role === 'moderator';
}

/** Check if a role has user privileges */
export function isUser(role: AppRole): boolean {
  return role === 'user';
}

/** Get role display name */
export function getRoleDisplayName(role: AppRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** Get all available roles */
export function getAllRoles(): AppRole[] {
  return [...APP_ROLES];
}
