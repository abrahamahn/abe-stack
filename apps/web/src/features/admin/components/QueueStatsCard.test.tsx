// apps/web/src/features/admin/components/QueueStatsCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QueueStatsCard } from './QueueStatsCard';

import type { QueueStats } from '@abe-stack/core';

// ============================================================================
// Test Data
// ============================================================================

const mockStats: QueueStats = {
  pending: 10,
  processing: 5,
  completed: 100,
  failed: 3,
  deadLetter: 0,
  total: 118,
  failureRate: 2.5,
  recentCompleted: 50,
  recentFailed: 1,
};

// ============================================================================
// Tests
// ============================================================================

describe('QueueStatsCard', () => {
  describe('loading state', () => {
    it('should show spinner when loading', () => {
      const { container } = render(
        <QueueStatsCard stats={undefined} isLoading={true} isError={false} error={null} />,
      );

      // Spinner has .spinner class, not role="status"
      expect(container.querySelector('.spinner')).toBeInTheDocument();
    });

    it('should not show stats when loading', () => {
      render(<QueueStatsCard stats={undefined} isLoading={true} isError={false} error={null} />);

      expect(screen.queryByText('Queue Statistics')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message when isError is true', () => {
      render(
        <QueueStatsCard
          stats={undefined}
          isLoading={false}
          isError={true}
          error={new Error('Failed to load')}
        />,
      );

      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });

    it('should show default error message when error is null', () => {
      render(<QueueStatsCard stats={undefined} isLoading={false} isError={true} error={null} />);

      expect(screen.getByText('Failed to load queue statistics')).toBeInTheDocument();
    });

    it('should show error message when stats is undefined', () => {
      render(<QueueStatsCard stats={undefined} isLoading={false} isError={false} error={null} />);

      expect(screen.getByText('Failed to load queue statistics')).toBeInTheDocument();
    });
  });

  describe('stats display', () => {
    it('should render heading', () => {
      render(<QueueStatsCard stats={mockStats} isLoading={false} isError={false} error={null} />);

      expect(screen.getByText('Queue Statistics')).toBeInTheDocument();
    });

    it('should render pending count', () => {
      render(<QueueStatsCard stats={mockStats} isLoading={false} isError={false} error={null} />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should render processing count', () => {
      render(<QueueStatsCard stats={mockStats} isLoading={false} isError={false} error={null} />);

      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should render completed count', () => {
      render(<QueueStatsCard stats={mockStats} isLoading={false} isError={false} error={null} />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should render failed count', () => {
      render(<QueueStatsCard stats={mockStats} isLoading={false} isError={false} error={null} />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render dead letter count', () => {
      render(<QueueStatsCard stats={mockStats} isLoading={false} isError={false} error={null} />);

      expect(screen.getByText('Dead Letter')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should render total jobs', () => {
      render(<QueueStatsCard stats={mockStats} isLoading={false} isError={false} error={null} />);

      expect(screen.getByText('Total Jobs')).toBeInTheDocument();
      expect(screen.getByText('118')).toBeInTheDocument();
    });

    it('should render failure rate', () => {
      render(<QueueStatsCard stats={mockStats} isLoading={false} isError={false} error={null} />);

      expect(screen.getByText('Failure Rate')).toBeInTheDocument();
      expect(screen.getByText('2.5%')).toBeInTheDocument();
    });

    it('should render recent statistics', () => {
      render(<QueueStatsCard stats={mockStats} isLoading={false} isError={false} error={null} />);

      expect(screen.getByText('Recent (1h)')).toBeInTheDocument();
      expect(screen.getByText('50 OK / 1 fail')).toBeInTheDocument();
    });
  });

  describe('alert banners', () => {
    it('should show high failure rate alert when rate > 10%', () => {
      const statsWithHighFailureRate: QueueStats = {
        ...mockStats,
        failureRate: 15.5,
      };

      render(
        <QueueStatsCard
          stats={statsWithHighFailureRate}
          isLoading={false}
          isError={false}
          error={null}
        />,
      );

      expect(screen.getByText(/High failure rate detected: 15.5%/i)).toBeInTheDocument();
    });

    it('should not show high failure rate alert when rate <= 10%', () => {
      render(<QueueStatsCard stats={mockStats} isLoading={false} isError={false} error={null} />);

      expect(screen.queryByText(/High failure rate detected/i)).not.toBeInTheDocument();
    });

    it('should show dead letter alert when dead letter > 0', () => {
      const statsWithDeadLetter: QueueStats = {
        ...mockStats,
        deadLetter: 5,
      };

      render(
        <QueueStatsCard
          stats={statsWithDeadLetter}
          isLoading={false}
          isError={false}
          error={null}
        />,
      );

      expect(
        screen.getByText(/5 job\(s\) in dead letter queue require attention/i),
      ).toBeInTheDocument();
    });

    it('should not show dead letter alert when dead letter is 0', () => {
      render(<QueueStatsCard stats={mockStats} isLoading={false} isError={false} error={null} />);

      expect(screen.queryByText(/dead letter queue/i)).not.toBeInTheDocument();
    });

    it('should show both alerts when conditions are met', () => {
      const statsWithBothAlerts: QueueStats = {
        ...mockStats,
        failureRate: 20,
        deadLetter: 3,
      };

      render(
        <QueueStatsCard
          stats={statsWithBothAlerts}
          isLoading={false}
          isError={false}
          error={null}
        />,
      );

      expect(screen.getByText(/High failure rate detected: 20/i)).toBeInTheDocument();
      expect(screen.getByText(/3 job\(s\) in dead letter queue/i)).toBeInTheDocument();
    });
  });

  describe('styling for metrics', () => {
    it('should apply danger styling to failed count when > 0', () => {
      render(<QueueStatsCard stats={mockStats} isLoading={false} isError={false} error={null} />);

      const failedText = screen.getByText('3');
      expect(failedText.className).toContain('red');
    });

    it('should apply danger styling to dead letter count when > 0', () => {
      const statsWithDeadLetter: QueueStats = {
        ...mockStats,
        deadLetter: 2,
      };

      render(
        <QueueStatsCard
          stats={statsWithDeadLetter}
          isLoading={false}
          isError={false}
          error={null}
        />,
      );

      const deadLetterText = screen.getByText('2');
      expect(deadLetterText.className).toContain('red');
    });

    it('should apply danger styling to failure rate when > 10%', () => {
      const statsWithHighFailureRate: QueueStats = {
        ...mockStats,
        failureRate: 15,
      };

      render(
        <QueueStatsCard
          stats={statsWithHighFailureRate}
          isLoading={false}
          isError={false}
          error={null}
        />,
      );

      const failureRateText = screen.getByText('15.0%');
      expect(failureRateText.className).toContain('red');
    });
  });

  describe('edge cases', () => {
    it('should handle zero values', () => {
      const emptyStats: QueueStats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        deadLetter: 0,
        total: 0,
        failureRate: 0,
        recentCompleted: 0,
        recentFailed: 0,
      };

      render(<QueueStatsCard stats={emptyStats} isLoading={false} isError={false} error={null} />);

      expect(screen.getByText('Total Jobs')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('should format failure rate to 1 decimal place', () => {
      const statsWithPreciseRate: QueueStats = {
        ...mockStats,
        failureRate: 3.456,
      };

      render(
        <QueueStatsCard
          stats={statsWithPreciseRate}
          isLoading={false}
          isError={false}
          error={null}
        />,
      );

      expect(screen.getByText('3.5%')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      const statsWithLargeNumbers: QueueStats = {
        ...mockStats,
        total: 1000000,
        completed: 999990,
      };

      render(
        <QueueStatsCard
          stats={statsWithLargeNumbers}
          isLoading={false}
          isError={false}
          error={null}
        />,
      );

      // Component doesn't format numbers with commas, renders raw values
      expect(screen.getByText('1000000')).toBeInTheDocument();
      expect(screen.getByText('999990')).toBeInTheDocument();
    });
  });
});
