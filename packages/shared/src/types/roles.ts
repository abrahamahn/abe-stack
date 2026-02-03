// shared/src/types/roles.ts

/**
 * @file App Roles
 * @description System-wide roles and associated types.
 * Distinct from Tenant/Workspace roles.
 * @module Shared/Types
 */

import { z } from 'zod';

// ============================================================================
// Role Definitions
// ============================================================================

/**
 * Available application roles.
 * - `user`: Standard authenticated user
 * - `admin`: System administrator with full access
 * - `moderator`: Content or community moderator
 */
export const APP_ROLES = ['user', 'admin', 'moderator'] as const;

/**
 * Type representing a valid application role.
 */
export type AppRole = (typeof APP_ROLES)[number];

// ============================================================================
// Schemas
// ============================================================================

/**
 * Zod schema for validating application roles.
 */
export const appRoleSchema = z.enum(APP_ROLES);
// ============================================================================
// Tenant Role Definitions
// ============================================================================

export const TENANT_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type TenantRole = (typeof TENANT_ROLES)[keyof typeof TENANT_ROLES];
export const tenantRoleSchema = z.nativeEnum(TENANT_ROLES);

// ============================================================================
// Permissions
// ============================================================================

/**
 * High-level system permissions.
 * These are used by the can() function and UI to group protected actions.
 */
export const PERMISSIONS = [
  'billing:manage',
  'billing:read',
  'membership:invite',
  'membership:manage',
  'membership:read',
  'settings:manage',
  'audit-log:read',
  'data:read',
  'data:write',
  'data:delete',
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export const permissionSchema = z.enum(PERMISSIONS);
