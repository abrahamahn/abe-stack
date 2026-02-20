// main/apps/web/src/features/settings/components/DeletionStatusIndicator.tsx
/**
 * Deletion Status Indicator
 *
 * Displays a countdown to permanent account deletion with a cancel button.
 * Used in account settings / danger zone when accountStatus === 'pending_deletion'.
 *
 * Shows:
 * - Warning alert with days remaining until permanent deletion
 * - Visual progress bar showing how much of the grace period has elapsed
 * - Cancel deletion button that triggers reactivation
 */

import { MS_PER_DAY } from '@bslt/shared';
import { Alert, Button, Card, Heading, Text } from '@bslt/ui';
import { useCallback, useMemo, type ReactElement } from 'react';

// ============================================================================
// Constants
// ============================================================================

/** Default GDPR grace period before hard deletion (matches server-side GRACE_PERIOD_DAYS) */
const GRACE_PERIOD_DAYS = 30;

// ============================================================================
// Types
// ============================================================================

export interface DeletionStatusIndicatorProps {
  /** ISO date string when permanent deletion is scheduled */
  scheduledDeletionAt: string;
  /** Whether a cancel/reactivation operation is currently in progress */
  isCanceling?: boolean;
  /** Called when the user clicks the cancel deletion button */
  onCancelDeletion?: () => void;
  /** Optional className for the root element */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate the number of full days remaining until the scheduled deletion date.
 *
 * @param scheduledAt - ISO date string of the scheduled hard delete
 * @returns Number of days remaining (minimum 0)
 */
function calculateDaysLeft(scheduledAt: string): number {
  const now = Date.now();
  const deletionTime = new Date(scheduledAt).getTime();
  const diff = deletionTime - now;
  return Math.max(0, Math.ceil(diff / MS_PER_DAY));
}

/**
 * Calculate the progress percentage through the grace period.
 *
 * @param scheduledAt - ISO date string of the scheduled hard delete
 * @param gracePeriodDays - Total grace period in days
 * @returns Percentage elapsed (0-100, clamped)
 */
function calculateProgress(scheduledAt: string, gracePeriodDays: number): number {
  const daysLeft = calculateDaysLeft(scheduledAt);
  const elapsed = gracePeriodDays - daysLeft;
  const pct = (elapsed / gracePeriodDays) * 100;
  return Math.min(100, Math.max(0, pct));
}

// ============================================================================
// Component
// ============================================================================

export const DeletionStatusIndicator = ({
  scheduledDeletionAt,
  isCanceling = false,
  onCancelDeletion,
  className,
}: DeletionStatusIndicatorProps): ReactElement => {
  const daysLeft = useMemo(() => calculateDaysLeft(scheduledDeletionAt), [scheduledDeletionAt]);

  const progressPct = useMemo(
    () => calculateProgress(scheduledDeletionAt, GRACE_PERIOD_DAYS),
    [scheduledDeletionAt],
  );

  const handleCancel = useCallback(() => {
    onCancelDeletion?.();
  }, [onCancelDeletion]);

  const isExpired = daysLeft === 0;

  return (
    <Card
      className={`p-4 border-2 border-danger ${className ?? ''}`}
      data-testid="deletion-status-indicator"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Heading as="h4" size="sm" className="text-danger">
            Account Deletion Scheduled
          </Heading>
        </div>

        {/* Countdown message */}
        <Alert tone="danger" data-testid="deletion-countdown-alert">
          {isExpired
            ? 'Your account is being permanently deleted. This process cannot be reversed.'
            : `Your account will be permanently deleted in ${String(daysLeft)} ${daysLeft === 1 ? 'day' : 'days'}.`}
        </Alert>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <Text size="xs" tone="muted">
              Grace period
            </Text>
            <Text size="xs" tone="muted">
              {Math.round(progressPct)}% elapsed
            </Text>
          </div>
          <div
            className="w-full bg-surface-muted rounded-full h-2 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Deletion grace period: ${String(Math.round(progressPct))}% elapsed`}
            data-testid="deletion-progress-bar"
          >
            <div
              className="bg-danger h-full rounded-full transition-all duration-300"
              style={{ width: `${String(progressPct)}%` }}
            />
          </div>
        </div>

        {/* Info text */}
        <Text size="sm" tone="muted">
          {isExpired
            ? 'The grace period has expired. Your data is being removed.'
            : `You have ${String(daysLeft)} ${daysLeft === 1 ? 'day' : 'days'} remaining to cancel the deletion and restore your account. After that, all data will be permanently removed.`}
        </Text>

        {/* Cancel button - only show if not expired */}
        {!isExpired && onCancelDeletion !== undefined && (
          <Button
            type="button"
            variant="primary"
            onClick={handleCancel}
            disabled={isCanceling}
            data-testid="cancel-deletion-button"
          >
            {isCanceling ? 'Canceling...' : 'Cancel Deletion'}
          </Button>
        )}
      </div>
    </Card>
  );
};
