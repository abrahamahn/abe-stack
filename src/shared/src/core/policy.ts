// src/shared/src/core/policy.ts
/**
 * @file Authorization Policy
 * @description Centralized, pure authorization rules for the entire platform.
 * @module Core/Policy
 */

import { assertNever } from './guard';

import type { AppRole, Permission, TenantRole } from '../types/roles';

/**
 * Context required to make an authorization decision.
 */
export interface AuthContext {
  /** User's global platform role */
  appRole: AppRole;
  /** User's role within the specific tenant/workspace (if applicable) */
  tenantRole?: TenantRole | null;
  /** Whether the user is the explicit owner of the resource being accessed */
  isOwner?: boolean;
}

/**
 * Permission actions
 */
export type PolicyAction = 'read' | 'write' | 'delete' | 'manage' | 'invite';

/**
 * High-level resources
 */
export type PolicyResource =
  | 'tenant'
  | 'membership'
  | 'billing'
  | 'audit-log'
  | 'settings'
  | 'data';

/**
 * The "Big Can" - Centralized logic for every authorization check in the system.
 * This is a pure function that determines if a user can perform an action on a resource.
 *
 * @param ctx - The authorization context (roles, ownership)
 * @param action - The action to perform
 * @param resource - The resource type
 * @returns boolean
 */
export function can(ctx: AuthContext, action: PolicyAction, resource: PolicyResource): boolean {
  // 1. Platform Admin Bypass
  if (ctx.appRole === 'admin') return true;

  // 2. Resource-specific rules
  switch (resource) {
    case 'tenant':
      // Only owners/admins can edit tenant settings
      if (action === 'write' || action === 'manage') {
        return ctx.tenantRole === 'owner' || ctx.tenantRole === 'admin';
      }
      return ctx.tenantRole !== undefined && ctx.tenantRole !== null; // Any member can read

    case 'billing':
      // Only owners can manage billing
      if (action === 'manage' || action === 'write') {
        return ctx.tenantRole === 'owner';
      }
      return ctx.tenantRole === 'owner' || ctx.tenantRole === 'admin';

    case 'membership':
      // Owners/Admins can invite or manage members
      if (action === 'invite' || action === 'manage' || action === 'write') {
        return ctx.tenantRole === 'owner' || ctx.tenantRole === 'admin';
      }
      return ctx.tenantRole !== undefined && ctx.tenantRole !== null;

    case 'audit-log':
      // Only admins/owners see security logs
      return ctx.tenantRole === 'owner' || ctx.tenantRole === 'admin';

    case 'data':
      // Owners of resource can always write/delete
      if (ctx.isOwner === true) return true;
      // Admins/Owners can write/delete any data in the tenant
      if (action === 'write' || action === 'delete') {
        return ctx.tenantRole === 'owner' || ctx.tenantRole === 'admin';
      }
      return ctx.tenantRole !== undefined && ctx.tenantRole !== null;

    case 'settings':
      // Only owners/admins can edit tenant settings
      if (action === 'write' || action === 'manage') {
        return ctx.tenantRole === 'owner' || ctx.tenantRole === 'admin';
      }
      return ctx.tenantRole !== undefined && ctx.tenantRole !== null;

    default:
      return assertNever(resource);
  }
}

/**
 * Checks if a user has a specific granular permission.
 * This is a helper that wraps the can() function.
 *
 * @param ctx - The authorization context (roles, ownership)
 * @param permission - A typed permission string in "resource:action" format
 * @returns boolean — whether the user has the permission
 */
export function hasPermission(ctx: AuthContext, permission: Permission): boolean {
  const colonIdx = permission.indexOf(':');
  if (colonIdx < 1) {
    return false;
  }

  const resource = permission.slice(0, colonIdx);
  const action = permission.slice(colonIdx + 1);

  if (!isPolicyResource(resource) || !isPolicyAction(action)) {
    return false;
  }

  return can(ctx, action, resource);
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard: validates a string as a PolicyResource.
 *
 * @param value - The string to validate
 * @returns True if the value is a valid PolicyResource
 * @complexity O(1)
 */
function isPolicyResource(value: string): value is PolicyResource {
  switch (value) {
    case 'tenant':
    case 'membership':
    case 'billing':
    case 'audit-log':
    case 'settings':
    case 'data':
      return true;
    default:
      return false;
  }
}

/**
 * Type guard: validates a string as a PolicyAction.
 *
 * @param value - The string to validate
 * @returns True if the value is a valid PolicyAction
 * @complexity O(1)
 */
function isPolicyAction(value: string): value is PolicyAction {
  switch (value) {
    case 'read':
    case 'write':
    case 'delete':
    case 'manage':
    case 'invite':
      return true;
    default:
      return false;
  }
}
