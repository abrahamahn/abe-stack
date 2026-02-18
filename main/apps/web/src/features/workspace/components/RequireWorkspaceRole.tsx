// main/apps/web/src/features/workspace/components/RequireWorkspaceRole.tsx
/**
 * Route guard component that enforces a minimum workspace role.
 *
 * Renders children only when the user meets the required role level.
 * Otherwise renders a fallback (default: null).
 *
 * @example
 * ```tsx
 * <RequireWorkspaceRole requiredRole="admin" tenantRole={userRole}>
 *   <WorkspaceSettingsPage />
 * </RequireWorkspaceRole>
 * ```
 */

import type { TenantRole } from '@bslt/shared';
import type { ReactNode } from 'react';

export interface RequireWorkspaceRoleProps {
  /** Minimum role required */
  requiredRole: TenantRole;
  /** User's current workspace role */
  tenantRole?: TenantRole | null | undefined;
  /** Content to render when role is sufficient */
  children: ReactNode;
  /** Optional fallback to render when role is insufficient */
  fallback?: ReactNode | undefined;
}

const ROLE_LEVELS: Record<TenantRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

/**
 * Check if a role meets a minimum role level.
 * Utility for imperative checks outside of JSX.
 */
export function meetsRoleRequirement(
  currentRole: TenantRole | null | undefined,
  requiredRole: TenantRole,
): boolean {
  if (currentRole === null || currentRole === undefined) {
    return false;
  }
  return ROLE_LEVELS[currentRole] >= ROLE_LEVELS[requiredRole];
}

/**
 * Guards route content based on workspace role level.
 *
 * If the user's role meets or exceeds the required level,
 * children are rendered. Otherwise, the fallback is shown.
 */
export function RequireWorkspaceRole(props: RequireWorkspaceRoleProps): ReactNode {
  const { requiredRole, tenantRole, children, fallback } = props;

  if (meetsRoleRequirement(tenantRole, requiredRole)) {
    return children;
  }

  return fallback ?? null;
}
