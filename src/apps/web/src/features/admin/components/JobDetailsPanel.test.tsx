// src/apps/web/src/features/admin/components/JobDetailsPanel.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobDetailsPanel } from './JobDetailsPanel';

import type { JobDetailsPanelProps } from './JobDetailsPanel';

// ============================================================================
// Test Types (matching component internal types)
// ============================================================================

/** Infer job details shape from the component props */
type JobDetailsLocal = NonNullable<JobDetailsPanelProps['job']>;

// ============================================================================
// Test Data
// ============================================================================

const mockJob: JobDetailsLocal = {
  id: 'job-123',
  name: 'test-job',
  status: 'completed',
  createdAt: '2024-01-15T10:30:00Z',
  scheduledAt: '2024-01-15T10:30:00Z',
  completedAt: '2024-01-15T10:31:00Z',
  durationMs: 60000,
  attempts: 1,
  maxAttempts: 3,
  args: { userId: 'user-123', action: 'process' },
  error: null,
  deadLetterReason: null,
};

const mockOnClose = vi.fn();
const mockOnRetry = vi.fn();
const mockOnCancel = vi.fn();

// ============================================================================
// Tests
// ============================================================================

describe('JobDetailsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnRetry.mockResolvedValue(undefined);
    mockOnCancel.mockResolvedValue(undefined);
  });

  describe('loading state', () => {
    it('should show spinner when loading', () => {
      const { container } = render(
        <JobDetailsPanel
          job={undefined}
          isLoading={true}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      const spinner = container.querySelector('.spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show job details when loading', () => {
      render(
        <JobDetailsPanel
          job={undefined}
          isLoading={true}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.queryByText('test-job')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message when isError is true', () => {
      render(
        <JobDetailsPanel
          job={undefined}
          isLoading={false}
          isError={true}
          error={new Error('Failed to load job')}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('Failed to load job')).toBeInTheDocument();
    });

    it('should show default error message when error is null', () => {
      render(
        <JobDetailsPanel
          job={undefined}
          isLoading={false}
          isError={true}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('Failed to load job details')).toBeInTheDocument();
    });

    it('should show error message when job is undefined without loading', () => {
      render(
        <JobDetailsPanel
          job={undefined}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('Failed to load job details')).toBeInTheDocument();
    });

    it('should show close button in error state', () => {
      render(
        <JobDetailsPanel
          job={undefined}
          isLoading={false}
          isError={true}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked in error state', () => {
      render(
        <JobDetailsPanel
          job={undefined}
          isLoading={false}
          isError={true}
          error={null}
          onClose={mockOnClose}
        />,
      );

      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('job details display', () => {
    it('should render job name', () => {
      render(
        <JobDetailsPanel
          job={mockJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('test-job')).toBeInTheDocument();
    });

    it('should render job id', () => {
      render(
        <JobDetailsPanel
          job={mockJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('job-123')).toBeInTheDocument();
    });

    it('should render job status badge', () => {
      render(
        <JobDetailsPanel
          job={mockJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('Status')).toBeInTheDocument();
      const badges = screen.getAllByText('Completed');
      // Should appear as both badge and timing label
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should render timing information', () => {
      render(
        <JobDetailsPanel
          job={mockJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
      // "Completed" appears as both badge and timing label
      expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
      expect(screen.getByText('Duration')).toBeInTheDocument();
    });

    it('should render duration in milliseconds', () => {
      render(
        <JobDetailsPanel
          job={mockJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('60000ms')).toBeInTheDocument();
    });

    it('should render attempts information', () => {
      render(
        <JobDetailsPanel
          job={mockJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('Attempts')).toBeInTheDocument();
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('should render arguments as JSON', () => {
      render(
        <JobDetailsPanel
          job={mockJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('Arguments')).toBeInTheDocument();
      expect(screen.getByText(/"userId": "user-123"/)).toBeInTheDocument();
      expect(screen.getByText(/"action": "process"/)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(
        <JobDetailsPanel
          job={mockJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(
        <JobDetailsPanel
          job={mockJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('null field handling', () => {
    it('should show "-" for null completedAt', () => {
      const jobWithoutCompletion: JobDetailsLocal = {
        ...mockJob,
        completedAt: null,
      };

      render(
        <JobDetailsPanel
          job={jobWithoutCompletion}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      const completedCells = screen.getAllByText('-');
      expect(completedCells.length).toBeGreaterThan(0);
    });

    it('should show "-" for null durationMs', () => {
      const jobWithoutDuration: JobDetailsLocal = {
        ...mockJob,
        durationMs: null,
      };

      render(
        <JobDetailsPanel
          job={jobWithoutDuration}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      const durationLabel = screen.getByText('Duration');
      const durationContainer = durationLabel.closest('div');
      const durationValue = durationContainer?.querySelector('p:last-child');
      expect(durationValue?.textContent).toBe('-');
    });

    it('should show "-" for zero durationMs', () => {
      const jobWithZeroDuration: JobDetailsLocal = {
        ...mockJob,
        durationMs: 0,
      };

      render(
        <JobDetailsPanel
          job={jobWithZeroDuration}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      const durationLabel = screen.getByText('Duration');
      const durationContainer = durationLabel.closest('div');
      const durationValue = durationContainer?.querySelector('p:last-child');
      expect(durationValue?.textContent).toBe('-');
    });
  });

  describe('error information display', () => {
    it('should render error section when error is present', () => {
      const jobWithError: JobDetailsLocal = {
        ...mockJob,
        status: 'failed',
        error: {
          name: 'ValidationError',
          message: 'Invalid input data',
          stack: 'Error: Invalid input data\n    at processJob...',
        },
      };

      render(
        <JobDetailsPanel
          job={jobWithError}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('ValidationError: Invalid input data')).toBeInTheDocument();
    });

    it('should render error stack trace when available', () => {
      const jobWithError: JobDetailsLocal = {
        ...mockJob,
        status: 'failed',
        error: {
          name: 'Error',
          message: 'Test error',
          stack: 'Error: Test error\n    at processJob',
        },
      };

      render(
        <JobDetailsPanel
          job={jobWithError}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText(/at processJob/)).toBeInTheDocument();
    });

    it('should not render error section when error is null', () => {
      render(
        <JobDetailsPanel
          job={mockJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.queryByText('ValidationError:')).not.toBeInTheDocument();
    });

    it('should not render stack trace when stack is empty', () => {
      const jobWithErrorNoStack: JobDetailsLocal = {
        ...mockJob,
        status: 'failed',
        error: {
          name: 'Error',
          message: 'Test error',
          stack: '',
        },
      };

      render(
        <JobDetailsPanel
          job={jobWithErrorNoStack}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      const errorSection = screen.getByText('Error: Test error');
      expect(errorSection.parentElement?.querySelector('pre')).not.toBeInTheDocument();
    });

    it('should not render stack trace when stack is undefined', () => {
      const jobWithErrorNoStack: JobDetailsLocal = {
        ...mockJob,
        status: 'failed',
        error: {
          name: 'Error',
          message: 'Test error',
          stack: undefined,
        },
      };

      render(
        <JobDetailsPanel
          job={jobWithErrorNoStack}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      const errorSection = screen.getByText('Error: Test error');
      expect(errorSection.parentElement?.querySelector('pre')).not.toBeInTheDocument();
    });
  });

  describe('dead letter information', () => {
    it('should render dead letter reason when present', () => {
      const jobWithDeadLetter: JobDetailsLocal = {
        ...mockJob,
        status: 'dead_letter',
        deadLetterReason: 'Maximum retry attempts exceeded',
      };

      render(
        <JobDetailsPanel
          job={jobWithDeadLetter}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByText('Dead Letter Reason')).toBeInTheDocument();
      expect(screen.getByText('Maximum retry attempts exceeded')).toBeInTheDocument();
    });

    it('should not render dead letter section when reason is null', () => {
      render(
        <JobDetailsPanel
          job={mockJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.queryByText('Dead Letter Reason')).not.toBeInTheDocument();
    });

    it('should not render dead letter section when reason is empty string', () => {
      const jobWithEmptyReason: JobDetailsLocal = {
        ...mockJob,
        deadLetterReason: '',
      };

      render(
        <JobDetailsPanel
          job={jobWithEmptyReason}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.queryByText('Dead Letter Reason')).not.toBeInTheDocument();
    });

    it('should not render dead letter section when reason is undefined', () => {
      const jobWithUndefinedReason: JobDetailsLocal = {
        ...mockJob,
        deadLetterReason: undefined as any,
      };

      render(
        <JobDetailsPanel
          job={jobWithUndefinedReason}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.queryByText('Dead Letter Reason')).not.toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('should show retry button for failed job', () => {
      const failedJob: JobDetailsLocal = { ...mockJob, status: 'failed' };

      render(
        <JobDetailsPanel
          job={failedJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />,
      );

      expect(screen.getByRole('button', { name: 'Retry Job' })).toBeInTheDocument();
    });

    it('should show retry button for dead_letter job', () => {
      const deadLetterJob: JobDetailsLocal = { ...mockJob, status: 'dead_letter' };

      render(
        <JobDetailsPanel
          job={deadLetterJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />,
      );

      expect(screen.getByRole('button', { name: 'Retry Job' })).toBeInTheDocument();
    });

    it('should show cancel button for pending job', () => {
      const pendingJob: JobDetailsLocal = { ...mockJob, status: 'pending' };

      render(
        <JobDetailsPanel
          job={pendingJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByRole('button', { name: 'Cancel Job' })).toBeInTheDocument();
    });

    it('should show cancel button for processing job', () => {
      const processingJob: JobDetailsLocal = { ...mockJob, status: 'processing' };

      render(
        <JobDetailsPanel
          job={processingJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByRole('button', { name: 'Cancel Job' })).toBeInTheDocument();
    });

    it('should not show action buttons for completed job', () => {
      render(
        <JobDetailsPanel
          job={mockJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.queryByRole('button', { name: 'Retry Job' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel Job' })).not.toBeInTheDocument();
    });

    it('should call onRetry with job id when retry button is clicked', () => {
      const failedJob: JobDetailsLocal = { ...mockJob, status: 'failed' };

      render(
        <JobDetailsPanel
          job={failedJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />,
      );

      const retryButton = screen.getByRole('button', { name: 'Retry Job' });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledWith('job-123');
    });

    it('should call onCancel with job id when cancel button is clicked', () => {
      const pendingJob: JobDetailsLocal = { ...mockJob, status: 'pending' };

      render(
        <JobDetailsPanel
          job={pendingJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
          onCancel={mockOnCancel}
        />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel Job' });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledWith('job-123');
    });

    it('should not render actions section when onRetry is undefined for failed job', () => {
      const failedJob: JobDetailsLocal = { ...mockJob, status: 'failed' };

      render(
        <JobDetailsPanel
          job={failedJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.queryByRole('button', { name: 'Retry Job' })).not.toBeInTheDocument();
    });

    it('should not render actions section when onCancel is undefined for pending job', () => {
      const pendingJob: JobDetailsLocal = { ...mockJob, status: 'pending' };

      render(
        <JobDetailsPanel
          job={pendingJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.queryByRole('button', { name: 'Cancel Job' })).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle onRetry promise rejection silently', () => {
      mockOnRetry.mockRejectedValue(new Error('Retry failed'));
      const failedJob: JobDetailsLocal = { ...mockJob, status: 'failed' };

      render(
        <JobDetailsPanel
          job={failedJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />,
      );

      const retryButton = screen.getByRole('button', { name: 'Retry Job' });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledWith('job-123');
      // Should not throw
    });

    it('should handle onCancel promise rejection silently', () => {
      mockOnCancel.mockRejectedValue(new Error('Cancel failed'));
      const pendingJob: JobDetailsLocal = { ...mockJob, status: 'pending' };

      render(
        <JobDetailsPanel
          job={pendingJob}
          isLoading={false}
          isError={false}
          error={null}
          onClose={mockOnClose}
          onCancel={mockOnCancel}
        />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel Job' });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledWith('job-123');
      // Should not throw
    });
  });
});
