// main/apps/web/src/features/admin/components/JobDetailsPanel.tsx
/**
 * JobDetailsPanel component
 *
 * Displays detailed information about a job in a side panel.
 */

import { formatDateTime } from '@bslt/shared';
import { Button, Card, Heading, Skeleton, Text } from '@bslt/ui';
import { LabeledValueRow } from '@bslt/ui/components/LabeledValueRow';

import { JobStatusBadge } from './JobStatusBadge';

import type { JobStatus } from '@bslt/shared';
import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

interface JobDetailsLocal {
  id: string;
  name: string;
  status: JobStatus;
  createdAt: string;
  scheduledAt: string;
  completedAt: string | null;
  durationMs: number | null;
  attempts: number;
  maxAttempts: number;
  args: unknown;
  error: { name: string; message: string; stack?: string | undefined } | null;
  deadLetterReason?: string | null | undefined;
}

export interface JobDetailsPanelProps {
  job: JobDetailsLocal | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onClose: () => void;
  onRetry?: (jobId: string) => Promise<void>;
  onCancel?: (jobId: string) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export const JobDetailsPanel = ({
  job,
  isLoading,
  isError,
  error,
  onClose,
  onRetry,
  onCancel,
}: JobDetailsPanelProps): JSX.Element => {
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton width="60%" height="1.5rem" />
        <Skeleton width="40%" height="1rem" />
        <Skeleton width="100%" height="5rem" radius="var(--ui-radius-md)" />
        <Skeleton width="100%" height="3rem" radius="var(--ui-radius-md)" />
        <Skeleton width="100%" height="4rem" radius="var(--ui-radius-md)" />
      </div>
    );
  }

  if (isError || job === undefined) {
    return (
      <div className="p-4">
        <Text tone="danger">{error?.message ?? 'Failed to load job details'}</Text>
        <Button variant="text" onClick={onClose} className="mt-4">
          Close
        </Button>
      </div>
    );
  }

  const canRetry = job.status === 'failed' || job.status === 'dead_letter';
  const canCancel = job.status === 'pending' || job.status === 'processing';

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Heading as="h3" size="md">
            {job.name}
          </Heading>
          <Text tone="muted" className="text-sm">
            {job.id}
          </Text>
        </div>
        <Button variant="text" size="small" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Status */}
      <div>
        <Text tone="muted" className="text-xs uppercase tracking-wide mb-1">
          Status
        </Text>
        <JobStatusBadge status={job.status} />
      </div>

      {/* Timing */}
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-4">
          <LabeledValueRow
            label="Created"
            value={formatDateTime(job.createdAt)}
            labelClassName="text-xs uppercase tracking-wide"
          />
          <LabeledValueRow
            label="Scheduled"
            value={formatDateTime(job.scheduledAt)}
            labelClassName="text-xs uppercase tracking-wide"
          />
          <LabeledValueRow
            label="Completed"
            value={job.completedAt !== null ? formatDateTime(job.completedAt) : '-'}
            labelClassName="text-xs uppercase tracking-wide"
          />
          <LabeledValueRow
            label="Duration"
            value={
              job.durationMs !== null && job.durationMs !== 0 ? `${String(job.durationMs)}ms` : '-'
            }
            labelClassName="text-xs uppercase tracking-wide"
          />
        </div>
      </Card>

      {/* Attempts */}
      <Card className="p-3">
        <LabeledValueRow
          label="Attempts"
          value={`${String(job.attempts)} / ${String(job.maxAttempts)}`}
          labelClassName="text-xs uppercase tracking-wide"
        />
      </Card>

      {/* Arguments */}
      <Card className="p-3">
        <Text tone="muted" className="text-xs uppercase tracking-wide mb-2">
          Arguments
        </Text>
        <pre className="bg-surface p-2 rounded text-xs overflow-auto max-h-48">
          {JSON.stringify(job.args, null, 2)}
        </pre>
      </Card>

      {/* Error (if any) */}
      {job.error !== null && (
        <Card className="p-3 border-current text-danger">
          <Text tone="muted" className="text-xs uppercase tracking-wide mb-2">
            Error
          </Text>
          <Text tone="danger" className="font-semibold">
            {job.error.name}: {job.error.message}
          </Text>
          {job.error.stack !== undefined && job.error.stack !== '' && (
            <pre className="bg-danger-muted p-2 rounded text-xs overflow-auto max-h-32 mt-2">
              {job.error.stack}
            </pre>
          )}
        </Card>
      )}

      {/* Dead Letter Reason (if any) */}
      {job.deadLetterReason !== undefined &&
        job.deadLetterReason !== null &&
        job.deadLetterReason !== '' && (
          <Card className="p-3 border-current text-danger">
            <Text tone="muted" className="text-xs uppercase tracking-wide mb-2">
              Dead Letter Reason
            </Text>
            <Text tone="danger">{job.deadLetterReason}</Text>
          </Card>
        )}

      {/* Actions */}
      {(canRetry || canCancel) && (
        <div className="flex gap-2 pt-4 border-t">
          {canRetry && onRetry !== undefined && (
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                onRetry(job.id).catch(() => {});
              }}
            >
              Retry Job
            </Button>
          )}
          {canCancel && onCancel !== undefined && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                onCancel(job.id).catch(() => {});
              }}
            >
              Cancel Job
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
