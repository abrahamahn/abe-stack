// apps/web/src/features/admin/components/RoleBadge.tsx
/**
 * RoleBadge Component
 *
 * Displays a user's role with appropriate styling.
 */

import { Badge } from '@abe-stack/ui';

import type { JSX } from 'react';

type UserRoleLocal = 'user' | 'moderator' | 'admin';

export interface RoleBadgeProps {
  role: UserRoleLocal;
}

function getRoleTone(role: UserRoleLocal): 'info' | 'success' | 'danger' | 'warning' {
  switch (role) {
    case 'admin':
      return 'danger';
    case 'moderator':
      return 'warning';
    case 'user':
    default:
      return 'info';
  }
}

export const RoleBadge = ({ role }: RoleBadgeProps): JSX.Element => {
  return <Badge tone={getRoleTone(role)}>{role.charAt(0).toUpperCase() + role.slice(1)}</Badge>;
};
