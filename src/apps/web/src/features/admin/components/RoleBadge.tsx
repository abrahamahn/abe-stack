// src/apps/web/src/features/admin/components/RoleBadge.tsx
/**
 * RoleBadge Component
 *
 * Displays a user's role with appropriate styling.
 */

import { getAppRoleLabel, getAppRoleTone } from '@abe-stack/shared';
import { Badge } from '@abe-stack/ui';

import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface RoleBadgeProps {
  role: string;
}

// ============================================================================
// Component
// ============================================================================

export const RoleBadge = ({ role }: RoleBadgeProps): JSX.Element => {
  return <Badge tone={getAppRoleTone(role)}>{getAppRoleLabel(role)}</Badge>;
};
