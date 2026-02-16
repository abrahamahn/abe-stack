// main/shared/src/types/roles.ts

/**
 * @file App Roles
 * @description System-wide roles and associated types.
 * Distinct from Tenant/Workspace roles.
 * @module Shared/Types
 */

import { APP_ROLES, PERMISSIONS, TENANT_ROLES } from '../constants';
import { createEnumSchema } from '../schema';

/**
 * Available application roles.
 * - `user`: Standard authenticated user
 * - `admin`: System administrator with full access
 * - `moderator`: Content or community moderator
 */

/**
 * Type representing a valid application role.
 */
export type AppRole = (typeof APP_ROLES)[number];
/**
 * Schema for validating application roles.
 */
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
