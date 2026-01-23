// apps/web/src/features/admin/components/JobActionsMenu.tsx
/**
 * JobActionsMenu component
 *
 * Dropdown menu with job actions (retry, cancel).
 */

import { Button, Dropdown, MenuItem, Text } from '@abe-stack/ui';

import type { JobStatus } from '@abe-stack/core';
import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface JobActionsMenuProps {
  jobId: string;
  status: JobStatus;
  onRetry: (jobId: string) => Promise<void>;
  onCancel: (jobId: string) => Promise<void>;
  isRetrying?: boolean;
  isCancelling?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function JobActionsMenu({
  jobId,
  status,
  onRetry,
  onCancel,
  isRetrying = false,
  isCancelling = false,
}: JobActionsMenuProps): JSX.Element {
  const canRetry = status === 'failed' || status === 'dead_letter';
  const canCancel = status === 'pending' || status === 'processing';

  if (!canRetry && !canCancel) {
    return (
      <Text tone="muted" className="text-sm">
        No actions
      </Text>
    );
  }

  return (
    <Dropdown trigger={<Button variant="text" size="small">Actions</Button>}>
      {(close) => (
        <>
          {canRetry && (
            <MenuItem
              onClick={() => {
                close();
                onRetry(jobId).catch(() => {});
              }}
              disabled={isRetrying}
            >
              {isRetrying ? 'Retrying...' : 'Retry Job'}
            </MenuItem>
          )}
          {canCancel && (
            <MenuItem
              onClick={() => {
                close();
                onCancel(jobId).catch(() => {});
              }}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Job'}
            </MenuItem>
          )}
        </>
      )}
    </Dropdown>
  );
}
