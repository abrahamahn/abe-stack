// src/apps/web/src/features/admin/components/JobActionsMenu.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { JobActionsMenu } from './JobActionsMenu';

import type { JobStatus } from '@abe-stack/shared';

// ============================================================================
// Test Data
// ============================================================================

const mockOnRetry = vi.fn();
const mockOnCancel = vi.fn();

// ============================================================================
// Tests
// ============================================================================

describe('JobActionsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnRetry.mockResolvedValue(undefined);
    mockOnCancel.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render actions button for failed status', () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="failed"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should render actions button for dead_letter status', () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="dead_letter"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should render actions button for pending status', () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="pending"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should render actions button for processing status', () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="processing"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should render "No actions" for completed status', () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="completed"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByText('No actions')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument();
    });
  });

  describe('retry action', () => {
    it('should show retry option for failed status', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="failed"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        expect(screen.getByText('Retry Job')).toBeInTheDocument();
      });
    });

    it('should show retry option for dead_letter status', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="dead_letter"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        expect(screen.getByText('Retry Job')).toBeInTheDocument();
      });
    });

    it('should not show retry option for pending status', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="pending"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        expect(screen.queryByText('Retry Job')).not.toBeInTheDocument();
      });
    });

    it('should call onRetry with jobId when retry is clicked', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="failed"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        const retryButton = screen.getByText('Retry Job');
        fireEvent.click(retryButton);
      });

      expect(mockOnRetry).toHaveBeenCalledWith('job-123');
    });

    it('should show "Retrying..." text when isRetrying is true', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="failed"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
          isRetrying={true}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        expect(screen.getByText('Retrying...')).toBeInTheDocument();
      });
    });

    it('should disable retry menu item when isRetrying is true', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="failed"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
          isRetrying={true}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        const retryButton = screen.getByText('Retrying...');
        expect(retryButton.closest('button')).toBeDisabled();
      });
    });
  });

  describe('cancel action', () => {
    it('should show cancel option for pending status', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="pending"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        expect(screen.getByText('Cancel Job')).toBeInTheDocument();
      });
    });

    it('should show cancel option for processing status', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="processing"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        expect(screen.getByText('Cancel Job')).toBeInTheDocument();
      });
    });

    it('should not show cancel option for failed status', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="failed"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        expect(screen.queryByText('Cancel Job')).not.toBeInTheDocument();
      });
    });

    it('should call onCancel with jobId when cancel is clicked', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="pending"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel Job');
        fireEvent.click(cancelButton);
      });

      expect(mockOnCancel).toHaveBeenCalledWith('job-123');
    });

    it('should show "Cancelling..." text when isCancelling is true', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="pending"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
          isCancelling={true}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        expect(screen.getByText('Cancelling...')).toBeInTheDocument();
      });
    });

    it('should disable cancel menu item when isCancelling is true', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="pending"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
          isCancelling={true}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancelling...');
        expect(cancelButton.closest('button')).toBeDisabled();
      });
    });
  });

  describe('status-specific behavior', () => {
    const testCases: Array<{
      status: JobStatus;
      expectRetry: boolean;
      expectCancel: boolean;
    }> = [
      { status: 'pending', expectRetry: false, expectCancel: true },
      { status: 'processing', expectRetry: false, expectCancel: true },
      { status: 'completed', expectRetry: false, expectCancel: false },
      { status: 'failed', expectRetry: true, expectCancel: false },
      { status: 'dead_letter', expectRetry: true, expectCancel: false },
    ];

    testCases.forEach(({ status, expectRetry, expectCancel }) => {
      it(`should show correct actions for ${status} status`, async () => {
        render(
          <JobActionsMenu
            jobId="job-123"
            status={status}
            onRetry={mockOnRetry}
            onCancel={mockOnCancel}
          />,
        );

        if (expectRetry || expectCancel) {
          const actionsButton = screen.getByText('Actions');
          fireEvent.click(actionsButton);

          await waitFor(() => {
            if (expectRetry) {
              expect(screen.getByText('Retry Job')).toBeInTheDocument();
            } else {
              expect(screen.queryByText('Retry Job')).not.toBeInTheDocument();
            }

            if (expectCancel) {
              expect(screen.getByText('Cancel Job')).toBeInTheDocument();
            } else {
              expect(screen.queryByText('Cancel Job')).not.toBeInTheDocument();
            }
          });
        } else {
          expect(screen.getByText('No actions')).toBeInTheDocument();
        }
      });
    });
  });

  describe('error handling', () => {
    it('should handle onRetry promise rejection silently', async () => {
      mockOnRetry.mockRejectedValue(new Error('Retry failed'));

      render(
        <JobActionsMenu
          jobId="job-123"
          status="failed"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        const retryButton = screen.getByText('Retry Job');
        fireEvent.click(retryButton);
      });

      expect(mockOnRetry).toHaveBeenCalledWith('job-123');
      // Should not throw error
    });

    it('should handle onCancel promise rejection silently', async () => {
      mockOnCancel.mockRejectedValue(new Error('Cancel failed'));

      render(
        <JobActionsMenu
          jobId="job-123"
          status="pending"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel Job');
        fireEvent.click(cancelButton);
      });

      expect(mockOnCancel).toHaveBeenCalledWith('job-123');
      // Should not throw error
    });
  });

  describe('edge cases', () => {
    it('should handle both isRetrying and isCancelling being false', async () => {
      render(
        <JobActionsMenu
          jobId="job-123"
          status="failed"
          onRetry={mockOnRetry}
          onCancel={mockOnCancel}
          isRetrying={false}
          isCancelling={false}
        />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        expect(screen.getByText('Retry Job')).toBeInTheDocument();
      });
    });

    it('should handle empty jobId string', async () => {
      render(
        <JobActionsMenu jobId="" status="failed" onRetry={mockOnRetry} onCancel={mockOnCancel} />,
      );

      const actionsButton = screen.getByText('Actions');
      fireEvent.click(actionsButton);

      await waitFor(() => {
        const retryButton = screen.getByText('Retry Job');
        fireEvent.click(retryButton);
      });

      expect(mockOnRetry).toHaveBeenCalledWith('');
    });
  });
});
