// src/apps/web/src/features/workspace/hooks/usePermissions.ts
/**
 * Permission checking hook for workspace-scoped RBAC.
 *
 * Combines the user's app role with their workspace role
 * to provide policy-based authorization checks in UI components.
 */

import { can, hasPermission } from '@abe-stack/shared';
import { useCallback, useMemo } from 'react';

import type {
  AuthContext,
  Permission,
  PolicyAction,
  PolicyResource,
  TenantRole,
} from '@abe-stack/shared';

/** Options for usePermissions hook */
export interface UsePermissionsOptions {
  /** User's platform role (defaults to 'user') */
  appRole?: 'user' | 'admin' | 'moderator' | undefined;
  /** User's role within the current workspace */
  tenantRole?: TenantRole | null | undefined;
  /** Whether the user owns the specific resource being checked */
  isOwner?: boolean | undefined;
}

/** Return value of usePermissions hook */
export interface PermissionsResult {
  /** Check if user can perform action on resource */
  can: (action: PolicyAction, resource: PolicyResource) => boolean;
  /** Check if user has a specific permission string (e.g. "billing:manage") */
  hasPermission: (permission: Permission) => boolean;
  /** The computed auth context (for debugging or passing to children) */
  authContext: AuthContext;
}

/**
 * Hook that provides permission checking for the current user in a workspace.
 *
 * @param options - User role information
 * @returns Permission checking functions
 *
 * @example
 * ```tsx
 * const { can } = usePermissions({ appRole: user.role, tenantRole: 'admin' });
 *
 * if (can('write', 'tenant')) {
 *   // Show edit button
 * }
 * ```
 */
export function usePermissions(options: UsePermissionsOptions = {}): PermissionsResult {
  const { appRole = 'user', tenantRole, isOwner } = options;

  const authContext = useMemo<AuthContext>(() => {
    const ctx: AuthContext = {
      appRole,
      tenantRole: tenantRole ?? null,
    };
    if (isOwner !== undefined) {
      ctx.isOwner = isOwner;
    }
    return ctx;
  }, [appRole, tenantRole, isOwner]);

  const canCheck = useCallback(
    (action: PolicyAction, resource: PolicyResource): boolean => {
      return can(authContext, action, resource);
    },
    [authContext],
  );

  const hasPermissionCheck = useCallback(
    (permission: Permission): boolean => {
      return hasPermission(authContext, permission);
    },
    [authContext],
  );

  return {
    can: canCheck,
    hasPermission: hasPermissionCheck,
    authContext,
  };
}
