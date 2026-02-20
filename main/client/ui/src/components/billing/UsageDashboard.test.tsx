// main/client/ui/src/components/billing/UsageDashboard.test.tsx
/**
 * Tests for UsageDashboard component.
 *
 * Tests usage dashboard rendering with metrics, loading, error,
 * and empty states.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { UsageDashboard } from './UsageDashboard';

import type { UsageMetricSummary } from '@bslt/shared';

// ============================================================================
// Test Helpers
// ============================================================================

const createMetric = (overrides?: Partial<UsageMetricSummary>): UsageMetricSummary => ({
  metricKey: 'api_calls',
  name: 'API Calls',
  unit: 'calls',
  currentValue: 500,
  limit: 1000,
  percentUsed: 50,
  ...overrides,
});

const DEFAULT_PROPS = {
  metrics: [
    createMetric(),
    createMetric({
      metricKey: 'storage_gb',
      name: 'Storage',
      unit: 'GB',
      currentValue: 8,
      limit: 10,
      percentUsed: 80,
    }),
  ],
  periodStart: '2026-02-01T00:00:00.000Z',
  periodEnd: '2026-03-01T00:00:00.000Z',
};

// ============================================================================
// Tests
// ============================================================================

describe('UsageDashboard', () => {
  describe('rendering', () => {
    it('should render the default title', () => {
      render(<UsageDashboard {...DEFAULT_PROPS} />);

      expect(screen.getByText('Usage Overview')).toBeInTheDocument();
    });

    it('should render a custom title', () => {
      render(<UsageDashboard {...DEFAULT_PROPS} title="Resource Usage" />);

      expect(screen.getByText('Resource Usage')).toBeInTheDocument();
    });

    it('should render the period dates', () => {
      render(<UsageDashboard {...DEFAULT_PROPS} />);

      // Period dates are formatted as "Feb 1, 2026 - Mar 1, 2026"
      expect(screen.getByText(/Feb/)).toBeInTheDocument();
      expect(screen.getByText(/Mar/)).toBeInTheDocument();
    });

    it('should render usage bars for each metric', () => {
      render(<UsageDashboard {...DEFAULT_PROPS} />);

      expect(screen.getByText('API Calls')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
    });

    it('should render progress bars with correct labels', () => {
      render(<UsageDashboard {...DEFAULT_PROPS} />);

      // UsageBar renders aria labels like "API Calls: 50% used"
      const bars = screen.getAllByRole('progressbar');
      expect(bars.length).toBeGreaterThanOrEqual(2);
    });

    it('should forward ref to root element', () => {
      const ref = createRef<HTMLDivElement>();
      render(<UsageDashboard {...DEFAULT_PROPS} ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should apply custom className', () => {
      const ref = createRef<HTMLDivElement>();
      render(<UsageDashboard {...DEFAULT_PROPS} ref={ref} className="custom-class" />);

      expect(ref.current?.classList.contains('custom-class')).toBe(true);
    });
  });

  describe('loading state', () => {
    it('should render loading message when loading', () => {
      render(<UsageDashboard {...DEFAULT_PROPS} loading />);

      expect(screen.getByText('Loading usage data...')).toBeInTheDocument();
    });

    it('should not render metrics when loading', () => {
      render(<UsageDashboard {...DEFAULT_PROPS} loading />);

      expect(screen.queryByText('API Calls')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should render error message', () => {
      render(<UsageDashboard {...DEFAULT_PROPS} error="Failed to load usage data" />);

      expect(screen.getByText('Failed to load usage data')).toBeInTheDocument();
    });

    it('should render retry button when onRefresh is provided', () => {
      const onRefresh = vi.fn();
      render(<UsageDashboard {...DEFAULT_PROPS} error="Error" onRefresh={onRefresh} />);

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should call onRefresh when retry is clicked', async () => {
      const onRefresh = vi.fn();
      render(<UsageDashboard {...DEFAULT_PROPS} error="Error" onRefresh={onRefresh} />);

      await userEvent.click(screen.getByText('Retry'));

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state', () => {
    it('should render empty message when no metrics have limits', () => {
      render(
        <UsageDashboard
          metrics={[createMetric({ limit: -1 }), createMetric({ limit: 0 })]}
          periodStart={DEFAULT_PROPS.periodStart}
          periodEnd={DEFAULT_PROPS.periodEnd}
        />,
      );

      expect(
        screen.getByText('No metered usage limits configured for your plan.'),
      ).toBeInTheDocument();
    });
  });

  describe('refresh button', () => {
    it('should render refresh button when onRefresh is provided', () => {
      const onRefresh = vi.fn();
      render(<UsageDashboard {...DEFAULT_PROPS} onRefresh={onRefresh} />);

      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('should call onRefresh when refresh is clicked', async () => {
      const onRefresh = vi.fn();
      render(<UsageDashboard {...DEFAULT_PROPS} onRefresh={onRefresh} />);

      await userEvent.click(screen.getByText('Refresh'));

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should not render refresh button without onRefresh', () => {
      render(<UsageDashboard {...DEFAULT_PROPS} />);

      expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
    });
  });
});
