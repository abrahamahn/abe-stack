// main/apps/web/src/features/workspace/components/Can.tsx
/**
 * Declarative permission component for conditional rendering.
 *
 * Renders children only when the user has the required permission
 * in the current workspace.
 *
 * @example
 * ```tsx
 * <Can action="invite" resource="membership" tenantRole={role}>
 *   <InviteMemberButton />
 * </Can>
 * ```
 */

import { usePermissions } from '../hooks/usePermissions';

import type { PolicyAction, PolicyResource, TenantRole } from '@abe-stack/shared';
import type { ReactNode } from 'react';

export interface CanProps {
  /** The action to check */
  action: PolicyAction;
  /** The resource to check */
  resource: PolicyResource;
  /** User's app role (defaults to 'user') */
  appRole?: 'user' | 'admin' | 'moderator' | undefined;
  /** User's workspace role */
  tenantRole?: TenantRole | null | undefined;
  /** Whether user owns the specific resource */
  isOwner?: boolean | undefined;
  /** Content to render when permission is granted */
  children: ReactNode;
  /** Optional fallback to render when permission is denied */
  fallback?: ReactNode | undefined;
}

/**
 * Conditionally renders children based on RBAC permissions.
 *
 * Uses the centralized `can()` policy engine to determine
 * whether the user has permission to perform the specified
 * action on the resource.
 */
export function Can(props: CanProps): ReactNode {
  const { action, resource, appRole, tenantRole, isOwner, children, fallback } = props;

  const perms = usePermissions({ appRole, tenantRole, isOwner });

  if (perms.can(action, resource)) {
    return children;
  }

  return fallback ?? null;
}
