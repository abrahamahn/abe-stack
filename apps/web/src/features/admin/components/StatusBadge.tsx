// apps/web/src/features/admin/components/StatusBadge.tsx
/**
 * StatusBadge Component
 *
 * Displays a user's status (active, locked, unverified) with appropriate styling.
 */

import type { AdminUser, UserStatus } from '@abe-stack/core';
import type { JSX } from 'react';

export interface StatusBadgeProps {
  status: UserStatus;
}

/**
 * Determine user status from AdminUser data
 */
export function getUserStatus(user: AdminUser): UserStatus {
  const now = new Date();

  // Check if locked
  if (
    user.lockedUntil !== null &&
    user.lockedUntil.length > 0 &&
    new Date(user.lockedUntil) > now
  ) {
    return 'locked';
  }

  // Check if unverified
  if (!user.emailVerified) {
    return 'unverified';
  }

  return 'active';
}

function getStatusStyles(status: UserStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'locked':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'unverified':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}

function getStatusLabel(status: UserStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'locked':
      return 'Locked';
    case 'unverified':
      return 'Unverified';
    default:
      return 'Unknown';
  }
}

export const StatusBadge = ({ status }: StatusBadgeProps): JSX.Element => {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyles(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
};
