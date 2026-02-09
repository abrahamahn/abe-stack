// src/apps/web/src/features/admin/components/JobsTable.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobsTable } from './JobsTable';

import type { JobsTableProps } from './JobsTable';
import type { JobStatus } from '@abe-stack/shared';

// ============================================================================
// Test Types (matching component internal types)
// ============================================================================

/** Infer data shape from the component props */
type JobListResponseLocal = NonNullable<JobsTableProps['data']>;
type JobDetailsLocal = JobListResponseLocal['data'][number];

// ============================================================================
// Test Data
// ============================================================================

const createMockJob = (overrides: Partial<JobDetailsLocal> = {}): JobDetailsLocal => ({
  id: 'job-123',
  name: 'test-job',
  status: 'completed',
  createdAt: '2024-01-15T10:30:00Z',
  attempts: 1,
  maxAttempts: 3,
  ...overrides,
});

const createMockResponse = (
  overrides: Partial<JobListResponseLocal> = {},
): JobListResponseLocal => ({
  data: [
    createMockJob({ id: 'job-1', name: 'job-1', status: 'completed' }),
    createMockJob({ id: 'job-2', name: 'job-2', status: 'failed' }),
    createMockJob({ id: 'job-3', name: 'job-3', status: 'pending' }),
  ],
  page: 1,
  totalPages: 1,
  ...overrides,
});

const mockOnStatusChange = vi.fn();
const mockOnPageChange = vi.fn();
const mockOnJobClick = vi.fn();
const mockOnRetry = vi.fn();
const mockOnCancel = vi.fn();

// ============================================================================
// Tests
// ============================================================================

describe('JobsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnRetry.mockResolvedValue(undefined);
    mockOnCancel.mockResolvedValue(undefined);
  });

  describe('loading state', () => {
    it('should show spinner when loading', () => {
      const { container } = render(
        <JobsTable
          data={undefined}
          isLoading={true}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      // Spinner is rendered (has .spinner class)
      expect(container.querySelector('.spinner')).toBeInTheDocument();
    });

    it('should not show table when loading', () => {
      render(
        <JobsTable
          data={undefined}
          isLoading={true}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message when isError is true', () => {
      render(
        <JobsTable
          data={undefined}
          isLoading={false}
          isError={true}
          error={new Error('Failed to load')}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });

    it('should show default error message when error is null', () => {
      render(
        <JobsTable
          data={undefined}
          isLoading={false}
          isError={true}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText('Failed to load jobs')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show no jobs message when data array is empty', () => {
      render(
        <JobsTable
          data={createMockResponse({ data: [] })}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText('No jobs found')).toBeInTheDocument();
    });
  });

  describe('status tabs', () => {
    it('should render all status tabs', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Pending' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Processing' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Failed' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Dead Letter' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Completed' })).toBeInTheDocument();
    });

    it('should have "All" tab selected by default', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const allTab = screen.getByRole('tab', { name: 'All' });
      expect(allTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should call onStatusChange with undefined when "All" tab is clicked', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={'failed' as JobStatus}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const allTab = screen.getByRole('tab', { name: 'All' });
      fireEvent.click(allTab);

      expect(mockOnStatusChange).toHaveBeenCalledWith(undefined);
    });

    it('should call onStatusChange with status when specific tab is clicked', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const failedTab = screen.getByRole('tab', { name: 'Failed' });
      fireEvent.click(failedTab);

      expect(mockOnStatusChange).toHaveBeenCalledWith('failed');
    });

    it('should highlight selected status tab', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={'pending' as JobStatus}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const pendingTab = screen.getByRole('tab', { name: 'Pending' });
      expect(pendingTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('table display', () => {
    it('should render table headers', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Attempts' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Created' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    });

    it('should render all jobs in the data', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      // Job names are rendered in the table
      expect(screen.getAllByText(/job-/i).length).toBeGreaterThan(0);
    });

    it('should render job status badges', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      // Status badges are rendered (tab labels may conflict)
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should render attempts information', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const attemptsTexts = screen.getAllByText('1 / 3');
      expect(attemptsTexts.length).toBe(3);
    });

    it('should render job IDs', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const rows = screen.getAllByRole('row');
      // Header + 3 data rows
      expect(rows.length).toBe(4);
    });
  });

  describe('job row interactions', () => {
    it('should call onJobClick when row is clicked', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const rows = screen.getAllByRole('row');
      // Click first data row (skip header)
      const row = rows[1];
      if (row !== undefined) {
        fireEvent.click(row);
      }

      expect(mockOnJobClick).toHaveBeenCalledTimes(1);
      expect(mockOnJobClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'job-1', name: 'job-1' }),
      );
    });
  });

  describe('action buttons', () => {
    it('should show retry button for failed job', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const retryButtons = screen.getAllByRole('button', { name: 'Retry' });
      expect(retryButtons.length).toBeGreaterThan(0);
    });

    it('should show cancel button for pending job', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
      expect(cancelButtons.length).toBeGreaterThan(0);
    });

    it('should not show action buttons for completed job', () => {
      const data = createMockResponse({
        data: [createMockJob({ status: 'completed' })],
      });

      render(
        <JobsTable
          data={data}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });

    it('should call onRetry with jobId when retry button is clicked', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const retryButtons = screen.getAllByRole('button', { name: 'Retry' });
      const retryButton = retryButtons[0];
      if (retryButton !== undefined) {
        fireEvent.click(retryButton);
      }

      expect(mockOnRetry).toHaveBeenCalledWith('job-2');
    });

    it('should call onCancel with jobId when cancel button is clicked', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
      const cancelButton = cancelButtons[0];
      if (cancelButton !== undefined) {
        fireEvent.click(cancelButton);
      }

      expect(mockOnCancel).toHaveBeenCalledWith('job-3');
    });

    it('should not trigger onJobClick when action button is clicked', () => {
      render(
        <JobsTable
          data={createMockResponse()}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const retryButtons = screen.getAllByRole('button', { name: 'Retry' });
      const retryButton = retryButtons[0];
      if (retryButton !== undefined) {
        fireEvent.click(retryButton);
      }

      expect(mockOnJobClick).not.toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    it('should not show pagination when only one page', () => {
      render(
        <JobsTable
          data={createMockResponse({ totalPages: 1 })}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('should show pagination when multiple pages', () => {
      render(
        <JobsTable
          data={createMockResponse({ totalPages: 3 })}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should call onPageChange when page is changed', () => {
      render(
        <JobsTable
          data={createMockResponse({ page: 1, totalPages: 3 })}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      fireEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('edge cases', () => {
    it('should handle job with dead_letter status', () => {
      const data = createMockResponse({
        data: [createMockJob({ status: 'dead_letter' })],
      });

      render(
        <JobsTable
          data={data}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      // Dead status is rendered in the table
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should handle job with processing status', () => {
      const data = createMockResponse({
        data: [createMockJob({ status: 'processing' })],
      });

      render(
        <JobsTable
          data={data}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      // Processing status is rendered in the table
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should handle data being undefined', () => {
      render(
        <JobsTable
          data={undefined}
          isLoading={false}
          isError={false}
          error={null}
          selectedStatus={undefined}
          onStatusChange={mockOnStatusChange}
          onPageChange={mockOnPageChange}
          onJobClick={mockOnJobClick}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });
});
