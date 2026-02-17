// main/shared/src/core/auth/roles.ts
/**
 * @file App Roles
 * @description System-wide roles and associated types.
 *   Distinct from Tenant/Workspace roles.
 * @module Core/Auth
 */

import { createEnumSchema } from '../../primitives/schema';
import { APP_ROLES } from '../constants/auth';
import { PERMISSIONS, TENANT_ROLES } from '../constants/iam';

// ============================================================================
// Types
// ============================================================================

/**
 * Available application roles.
 * - `user`: Standard authenticated user
 * - `admin`: System administrator with full access
 * - `moderator`: Content or community moderator
 */
export type AppRole = (typeof APP_ROLES)[number];

export type TenantRole = (typeof TENANT_ROLES)[keyof typeof TENANT_ROLES];

export type Permission = (typeof PERMISSIONS)[number];

// ============================================================================
// Schemas
// ============================================================================

/** Schema for validating application roles. */
export const appRoleSchema = createEnumSchema(APP_ROLES, 'app role');

/** All valid tenant role values */
const TENANT_ROLE_VALUES = Object.values(TENANT_ROLES) as readonly TenantRole[];

export const tenantRoleSchema = createEnumSchema(TENANT_ROLE_VALUES, 'tenant role');

export const permissionSchema = createEnumSchema(PERMISSIONS, 'permission');
