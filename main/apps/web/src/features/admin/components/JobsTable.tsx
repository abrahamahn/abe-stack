// main/apps/web/src/features/admin/components/JobsTable.tsx
/**
 * JobsTable component
 *
 * Displays a paginated table of jobs with filtering by status.
 */

import { formatDateTime } from '@abe-stack/shared';
import {
  Button,
  Pagination,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Text,
} from '@abe-stack/ui';

import { JobStatusBadge } from './JobStatusBadge';

import type { JobStatus } from '@abe-stack/shared';
import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

interface JobDetailsLocal {
  id: string;
  name: string;
  status: JobStatus;
  createdAt: string;
  attempts: number;
  maxAttempts: number;
}

interface JobListResponseLocal {
  data: JobDetailsLocal[];
  page: number;
  totalPages: number;
}

export interface JobsTableProps {
  data: JobListResponseLocal | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  selectedStatus: JobStatus | undefined;
  onStatusChange: (status: JobStatus | undefined) => void;
  onPageChange: (page: number) => void;
  onJobClick: (job: JobDetailsLocal) => void;
  onRetry: (jobId: string) => Promise<void>;
  onCancel: (jobId: string) => Promise<void>;
}

// ============================================================================
// Status Tabs
// ============================================================================

const STATUS_TABS: Array<{ id: string; label: string; status: JobStatus | undefined }> = [
  { id: 'all', label: 'All', status: undefined },
  { id: 'pending', label: 'Pending', status: 'pending' },
  { id: 'processing', label: 'Processing', status: 'processing' },
  { id: 'failed', label: 'Failed', status: 'failed' },
  { id: 'dead_letter', label: 'Dead Letter', status: 'dead_letter' },
  { id: 'completed', label: 'Completed', status: 'completed' },
];

// ============================================================================
// Component
// ============================================================================

export const JobsTable = ({
  data,
  isLoading,
  isError,
  error,
  selectedStatus,
  onStatusChange,
  onPageChange,
  onJobClick,
  onRetry,
  onCancel,
}: JobsTableProps): JSX.Element => {
  const activeTabId = STATUS_TABS.find((tab) => tab.status === selectedStatus)?.id ?? 'all';

  const handleTabChange = (tabId: string): void => {
    const tab = STATUS_TABS.find((t) => t.id === tabId);
    onStatusChange(tab?.status);
  };

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <Tabs
        items={STATUS_TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          content: null,
        }))}
        value={activeTabId}
        onChange={handleTabChange}
      />

      {/* Table Content */}
      {isLoading ? (
        <div className="flex flex-col gap-3 py-4">
          <Skeleton width="100%" height="2.5rem" radius="var(--ui-radius-md)" />
          <Skeleton width="100%" height="2rem" />
          <Skeleton width="100%" height="2rem" />
          <Skeleton width="100%" height="2rem" />
        </div>
      ) : isError ? (
        <Text tone="danger">{error?.message ?? 'Failed to load jobs'}</Text>
      ) : (data?.data.length ?? 0) === 0 ? (
        <EmptyState
          title="No jobs found"
          description="Jobs will appear here when they are created"
        />
      ) : data !== undefined ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  onClick={() => {
                    onJobClick(job);
                  }}
                  onRetry={onRetry}
                  onCancel={onCancel}
                />
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex justify-center pt-4">
              <Pagination value={data.page} totalPages={data.totalPages} onChange={onPageChange} />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

interface JobRowProps {
  job: JobDetailsLocal;
  onClick: () => void;
  onRetry: (jobId: string) => Promise<void>;
  onCancel: (jobId: string) => Promise<void>;
}

const JobRow = ({ job, onClick, onRetry, onCancel }: JobRowProps): JSX.Element => {
  const canRetry = job.status === 'failed' || job.status === 'dead_letter';
  const canCancel = job.status === 'pending' || job.status === 'processing';

  return (
    <TableRow className="cursor-pointer hover-row" onClick={onClick}>
      <TableCell>
        <div>
          <Text className="font-medium">{job.name}</Text>
          <Text tone="muted" className="text-xs truncate max-w-xs">
            {job.id}
          </Text>
        </div>
      </TableCell>
      <TableCell>
        <JobStatusBadge status={job.status} />
      </TableCell>
      <TableCell>
        <Text>
          {job.attempts} / {job.maxAttempts}
        </Text>
      </TableCell>
      <TableCell>
        <Text tone="muted" className="text-sm">
          {formatDateTime(job.createdAt)}
        </Text>
      </TableCell>
      <TableCell
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="flex gap-1">
          {canRetry && (
            <Button
              variant="text"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onRetry(job.id).catch(() => {});
              }}
            >
              Retry
            </Button>
          )}
          {canCancel && (
            <Button
              variant="text"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(job.id).catch(() => {});
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};
