// src/apps/web/src/features/admin/components/StatusBadge.tsx
/**
 * StatusBadge Component
 *
 * Displays a user's status (active, locked, unverified) with appropriate styling.
 */

import { getUserStatusLabel, getUserStatusTone } from '@abe-stack/shared';
import { Badge } from '@abe-stack/ui';

import type { UserStatus } from '@abe-stack/shared';
import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

interface AdminUserLocal {
  lockedUntil: string | null;
  emailVerified: boolean;
}

export interface StatusBadgeProps {
  status: UserStatus;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Determine user status from AdminUser data
 */
export function getUserStatus(user: AdminUserLocal): UserStatus {
  const now = new Date();

  if (
    user.lockedUntil !== null &&
    user.lockedUntil.length > 0 &&
    new Date(user.lockedUntil) > now
  ) {
    return 'locked';
  }

  if (!user.emailVerified) {
    return 'unverified';
  }

  return 'active';
}

// ============================================================================
// Component
// ============================================================================

export const StatusBadge = ({ status }: StatusBadgeProps): JSX.Element => {
  return <Badge tone={getUserStatusTone(status)}>{getUserStatusLabel(status)}</Badge>;
};
