// apps/web/src/features/admin/components/JobDetailsPanel.tsx
/**
 * JobDetailsPanel component
 *
 * Displays detailed information about a job in a side panel.
 */

import { Button, Card, Heading, Spinner, Text } from '@abe-stack/ui';

import { JobStatusBadge } from './JobStatusBadge';

import type { JobDetails } from '@abe-stack/core';
import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface JobDetailsPanelProps {
  job: JobDetails | undefined;
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

export function JobDetailsPanel({
  job,
  isLoading,
  isError,
  error,
  onClose,
  onRetry,
  onCancel,
}: JobDetailsPanelProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </div>
    );
  }

  if (isError || !job) {
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
          <DetailItem label="Created" value={formatDate(job.createdAt)} />
          <DetailItem label="Scheduled" value={formatDate(job.scheduledAt)} />
          <DetailItem
            label="Completed"
            value={job.completedAt ? formatDate(job.completedAt) : '-'}
          />
          <DetailItem
            label="Duration"
            value={job.durationMs ? `${job.durationMs}ms` : '-'}
          />
        </div>
      </Card>

      {/* Attempts */}
      <Card className="p-3">
        <DetailItem label="Attempts" value={`${job.attempts} / ${job.maxAttempts}`} />
      </Card>

      {/* Arguments */}
      <Card className="p-3">
        <Text tone="muted" className="text-xs uppercase tracking-wide mb-2">
          Arguments
        </Text>
        <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-48">
          {JSON.stringify(job.args, null, 2)}
        </pre>
      </Card>

      {/* Error (if any) */}
      {job.error && (
        <Card className="p-3 border-red-200 dark:border-red-800">
          <Text tone="muted" className="text-xs uppercase tracking-wide mb-2">
            Error
          </Text>
          <Text tone="danger" className="font-semibold">
            {job.error.name}: {job.error.message}
          </Text>
          {job.error.stack && (
            <pre className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs overflow-auto max-h-32 mt-2">
              {job.error.stack}
            </pre>
          )}
        </Card>
      )}

      {/* Dead Letter Reason (if any) */}
      {job.deadLetterReason && (
        <Card className="p-3 border-red-200 dark:border-red-800">
          <Text tone="muted" className="text-xs uppercase tracking-wide mb-2">
            Dead Letter Reason
          </Text>
          <Text tone="danger">{job.deadLetterReason}</Text>
        </Card>
      )}

      {/* Actions */}
      {(canRetry || canCancel) && (
        <div className="flex gap-2 pt-4 border-t">
          {canRetry && onRetry && (
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
          {canCancel && onCancel && (
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
}

// ============================================================================
// Helpers
// ============================================================================

interface DetailItemProps {
  label: string;
  value: string;
}

function DetailItem({ label, value }: DetailItemProps): JSX.Element {
  return (
    <div>
      <Text tone="muted" className="text-xs uppercase tracking-wide">
        {label}
      </Text>
      <Text>{value}</Text>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString();
  } catch {
    return dateStr;
  }
}
