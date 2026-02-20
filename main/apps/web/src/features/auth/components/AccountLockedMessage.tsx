// main/apps/web/src/features/auth/components/AccountLockedMessage.tsx
/**
 * AccountLockedMessage Component
 *
 * Displays a user-facing message when login is blocked because the account
 * has been locked by an administrator.
 *
 * Sprint 3.15: Shows lock reason and expiry on the login page.
 */

import { Alert, Text } from '@bslt/ui';

import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface AccountLockedMessageProps {
  /** The admin-set reason for the lock, if available */
  lockReason?: string | null;
  /** ISO timestamp when the lock expires, if available */
  lockedUntil?: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format a lock expiry date into a human-readable relative string.
 */
function formatLockExpiry(lockedUntil: string): string {
  const expiryDate = new Date(lockedUntil);
  const now = new Date();

  // If the lock date is far in the future (permanent lock)
  if (expiryDate.getFullYear() > 2090) {
    return 'This suspension is permanent.';
  }

  // If the lock has already expired
  if (expiryDate <= now) {
    return 'This lock has expired. Please try logging in again.';
  }

  // Calculate relative time
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `Your account will be unlocked in approximately ${diffMinutes.toString()} minute${diffMinutes === 1 ? '' : 's'}.`;
  }
  if (diffHours < 24) {
    return `Your account will be unlocked in approximately ${diffHours.toString()} hour${diffHours === 1 ? '' : 's'}.`;
  }
  return `Your account will be unlocked in approximately ${diffDays.toString()} day${diffDays === 1 ? '' : 's'}.`;
}

// ============================================================================
// Component
// ============================================================================

export const AccountLockedMessage = ({
  lockReason,
  lockedUntil,
}: AccountLockedMessageProps): JSX.Element => {
  const hasReason = lockReason !== undefined && lockReason !== null && lockReason.length > 0;
  const hasExpiry = lockedUntil !== undefined && lockedUntil !== null && lockedUntil.length > 0;

  return (
    <Alert tone="danger" className="mt-4">
      <div className="space-y-2">
        <Text size="sm" className="font-semibold">
          Account Suspended
        </Text>

        {hasReason && (
          <Text size="sm">
            <strong>Reason:</strong> {lockReason}
          </Text>
        )}

        {hasExpiry && (
          <Text size="sm" tone="muted">
            {formatLockExpiry(lockedUntil)}
          </Text>
        )}

        <Text size="xs" tone="muted">
          If you believe this is a mistake, please contact support.
        </Text>
      </div>
    </Alert>
  );
};
