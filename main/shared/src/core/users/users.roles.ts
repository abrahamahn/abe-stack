// main/shared/src/domain/users/users.roles.ts
/**
 * User Roles
 */

import { APP_ROLES } from './users.schemas';

import type { AppRole } from './users.schemas';

/**
 * Check if a role has admin privileges
 */
export function isAdmin(role: AppRole): boolean {
  return role === 'admin';
}

/**
 * Check if a role has moderator privileges
 */
export function isModerator(role: AppRole): boolean {
  return role === 'admin' || role === 'moderator';
}

/**
 * Check if a role has user privileges
 */
export function isUser(role: AppRole): boolean {
  return role === 'user';
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: AppRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Get all available roles
 */
export function getAllRoles(): AppRole[] {
  return [...APP_ROLES];
}
