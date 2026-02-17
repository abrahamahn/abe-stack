// main/shared/src/core/users/users.roles.ts

/**
 * @file User Roles
 * @description Role definitions, schemas, and role-checking utilities.
 * @module Core/Users
 */

import { createEnumSchema } from '../../primitives/schema';
import { APP_ROLES } from '../constants/auth';
import { PERMISSIONS, TENANT_ROLES } from '../constants/iam';

// ============================================================================
// App Role Definitions
// ============================================================================

/**
 * Type representing a valid application role.
 * - `user`: Standard authenticated user
 * - `admin`: System administrator with full access
 * - `moderator`: Content or community moderator
 */
export type AppRole = (typeof APP_ROLES)[number];

/** Schema for validating application roles. */
export const appRoleSchema = createEnumSchema(APP_ROLES, 'app role');

// ============================================================================
// Tenant Role Definitions
// ============================================================================

export type TenantRole = (typeof TENANT_ROLES)[keyof typeof TENANT_ROLES];

/** All valid tenant role values */
const TENANT_ROLE_VALUES = Object.values(TENANT_ROLES) as readonly TenantRole[];

export const tenantRoleSchema = createEnumSchema(TENANT_ROLE_VALUES, 'tenant role');

// ============================================================================
// Permissions
// ============================================================================

export type Permission = (typeof PERMISSIONS)[number];
export const permissionSchema = createEnumSchema(PERMISSIONS, 'permission');

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
