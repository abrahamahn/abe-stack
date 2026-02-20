// main/apps/web/src/features/settings/components/DeletionStatusIndicator.test.tsx
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeletionStatusIndicator } from './DeletionStatusIndicator';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create an ISO date string N days in the future from now.
 */
function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// ============================================================================
// Tests
// ============================================================================

describe('DeletionStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the indicator with correct test id', () => {
      render(<DeletionStatusIndicator scheduledDeletionAt={daysFromNow(15)} />);

      expect(screen.getByTestId('deletion-status-indicator')).toBeInTheDocument();
    });

    it('should display "Account Deletion Scheduled" heading', () => {
      render(<DeletionStatusIndicator scheduledDeletionAt={daysFromNow(15)} />);

      expect(screen.getByText('Account Deletion Scheduled')).toBeInTheDocument();
    });

    it('should display a progress bar', () => {
      render(<DeletionStatusIndicator scheduledDeletionAt={daysFromNow(15)} />);

      expect(screen.getByTestId('deletion-progress-bar')).toBeInTheDocument();
    });
  });

  describe('countdown display', () => {
    it('should display days remaining when deletion is in the future', () => {
      render(<DeletionStatusIndicator scheduledDeletionAt={daysFromNow(15)} />);

      expect(screen.getByTestId('deletion-countdown-alert')).toHaveTextContent(
        /will be permanently deleted in 15 days/i,
      );
    });

    it('should use singular "day" when 1 day remains', () => {
      render(<DeletionStatusIndicator scheduledDeletionAt={daysFromNow(1)} />);

      expect(screen.getByTestId('deletion-countdown-alert')).toHaveTextContent(
        /will be permanently deleted in 1 day\./i,
      );
    });

    it('should display expired message when deletion date has passed', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      render(<DeletionStatusIndicator scheduledDeletionAt={pastDate.toISOString()} />);

      expect(screen.getByTestId('deletion-countdown-alert')).toHaveTextContent(
        /being permanently deleted/i,
      );
    });
  });

  describe('progress bar', () => {
    it('should have progressbar role with correct aria attributes', () => {
      render(<DeletionStatusIndicator scheduledDeletionAt={daysFromNow(15)} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label');
    });

    it('should show approximately 50% elapsed when half the grace period remains', () => {
      // 30-day grace period, 15 days remaining = ~50% elapsed
      render(<DeletionStatusIndicator scheduledDeletionAt={daysFromNow(15)} />);

      const progressBar = screen.getByRole('progressbar');
      const progressValue = Number(progressBar.getAttribute('aria-valuenow'));
      expect(progressValue).toBeGreaterThanOrEqual(45);
      expect(progressValue).toBeLessThanOrEqual(55);
    });

    it('should show near 100% when deletion is imminent', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      render(<DeletionStatusIndicator scheduledDeletionAt={pastDate.toISOString()} />);

      const progressBar = screen.getByRole('progressbar');
      const progressValue = Number(progressBar.getAttribute('aria-valuenow'));
      expect(progressValue).toBe(100);
    });
  });

  describe('cancel deletion button', () => {
    it('should render cancel button when onCancelDeletion is provided', () => {
      const onCancel = vi.fn();

      render(
        <DeletionStatusIndicator
          scheduledDeletionAt={daysFromNow(15)}
          onCancelDeletion={onCancel}
        />,
      );

      expect(screen.getByTestId('cancel-deletion-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-deletion-button')).toHaveTextContent('Cancel Deletion');
    });

    it('should not render cancel button when onCancelDeletion is not provided', () => {
      render(<DeletionStatusIndicator scheduledDeletionAt={daysFromNow(15)} />);

      expect(screen.queryByTestId('cancel-deletion-button')).not.toBeInTheDocument();
    });

    it('should call onCancelDeletion when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <DeletionStatusIndicator
          scheduledDeletionAt={daysFromNow(15)}
          onCancelDeletion={onCancel}
        />,
      );

      await user.click(screen.getByTestId('cancel-deletion-button'));

      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('should show "Canceling..." text when isCanceling is true', () => {
      const onCancel = vi.fn();

      render(
        <DeletionStatusIndicator
          scheduledDeletionAt={daysFromNow(15)}
          isCanceling={true}
          onCancelDeletion={onCancel}
        />,
      );

      expect(screen.getByTestId('cancel-deletion-button')).toHaveTextContent('Canceling...');
      expect(screen.getByTestId('cancel-deletion-button')).toBeDisabled();
    });

    it('should not render cancel button when grace period has expired', () => {
      const onCancel = vi.fn();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      render(
        <DeletionStatusIndicator
          scheduledDeletionAt={pastDate.toISOString()}
          onCancelDeletion={onCancel}
        />,
      );

      expect(screen.queryByTestId('cancel-deletion-button')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className when provided', () => {
      render(
        <DeletionStatusIndicator
          scheduledDeletionAt={daysFromNow(15)}
          className="my-custom-class"
        />,
      );

      expect(screen.getByTestId('deletion-status-indicator')).toHaveClass('my-custom-class');
    });

    it('should have danger border styling', () => {
      render(<DeletionStatusIndicator scheduledDeletionAt={daysFromNow(15)} />);

      expect(screen.getByTestId('deletion-status-indicator')).toHaveClass('border-danger');
    });
  });

  describe('edge cases', () => {
    it('should handle exactly 0 days left', () => {
      // Create a date exactly at the current time (0 days remaining)
      render(<DeletionStatusIndicator scheduledDeletionAt={new Date().toISOString()} />);

      // Should show expired state
      expect(screen.getByTestId('deletion-countdown-alert')).toHaveTextContent(
        /being permanently deleted/i,
      );
    });

    it('should handle 30 days left (full grace period)', () => {
      render(<DeletionStatusIndicator scheduledDeletionAt={daysFromNow(30)} />);

      expect(screen.getByTestId('deletion-countdown-alert')).toHaveTextContent(
        /will be permanently deleted in 30 days/i,
      );
    });

    it('should display grace period percentage text', () => {
      render(<DeletionStatusIndicator scheduledDeletionAt={daysFromNow(15)} />);

      expect(screen.getByText(/% elapsed/)).toBeInTheDocument();
    });
  });
});
