// main/apps/web/src/features/admin/components/SecurityMetricsCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SecurityMetricsCard } from './SecurityMetricsCard';

import type { SecurityMetrics } from '@abe-stack/shared';

// ============================================================================
// Test Data
// ============================================================================

const mockMetrics: SecurityMetrics = {
  totalEvents: 150,
  criticalEvents: 5,
  highEvents: 15,
  mediumEvents: 30,
  tokenReuseCount: 2,
  accountLockedCount: 8,
  suspiciousLoginCount: 12,
  lowEvents: 100,
  eventsByType: {
    login_failed: 20,
    token_reuse: 2,
    account_locked: 8,
    suspicious_login: 12,
  },
  period: 'day',
  periodStart: '2024-01-01T00:00:00Z',
  periodEnd: '2024-01-31T23:59:59Z',
};

// ============================================================================
// Tests
// ============================================================================

describe('SecurityMetricsCard', () => {
  describe('loading state', () => {
    it('should show skeletons when loading', () => {
      const { container } = render(<SecurityMetricsCard metrics={undefined} isLoading={true} />);

      // Skeleton elements have .skeleton class
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not show metrics when loading', () => {
      render(<SecurityMetricsCard metrics={undefined} isLoading={true} />);

      expect(screen.queryByText('150')).not.toBeInTheDocument();
    });
  });

  describe('metrics display', () => {
    it('should render heading', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      expect(screen.getByText('Security Overview')).toBeInTheDocument();
    });

    it('should render total events', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      expect(screen.getByText('Total Events')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('should render critical events count', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should render high events count', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('should render medium events count', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('should render token reuse count', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      expect(screen.getByText('Token Reuse')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should render account lockouts count', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      expect(screen.getByText('Account Lockouts')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should render suspicious logins count', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      expect(screen.getByText('Suspicious Logins')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should render period dates', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      expect(screen.getByText(/Period:/)).toBeInTheDocument();
    });
  });

  describe('zero values', () => {
    it('should display 0 for total events when metrics are available', () => {
      const emptyMetrics: SecurityMetrics = {
        ...mockMetrics,
        totalEvents: 0,
      };

      render(<SecurityMetricsCard metrics={emptyMetrics} isLoading={false} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should display 0 for all counts when no events', () => {
      const emptyMetrics: SecurityMetrics = {
        totalEvents: 0,
        criticalEvents: 0,
        highEvents: 0,
        mediumEvents: 0,
        tokenReuseCount: 0,
        accountLockedCount: 0,
        suspiciousLoginCount: 0,
        lowEvents: 0,
        eventsByType: {},
        period: 'day',
        periodStart: '2024-01-01T00:00:00Z',
        periodEnd: '2024-01-31T23:59:59Z',
      };

      render(<SecurityMetricsCard metrics={emptyMetrics} isLoading={false} />);

      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0);
    });
  });

  describe('styling by severity', () => {
    it('should apply critical styling to critical events', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      const criticalValue = screen.getByText('5');
      expect(criticalValue.className).toContain('text-danger');
    });

    it('should apply high styling to high events', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      const highValue = screen.getByText('15');
      expect(highValue.className).toContain('text-warning');
    });

    it('should apply medium styling to medium events', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      const mediumValue = screen.getByText('30');
      expect(mediumValue.className).toContain('text-warning');
    });

    it('should apply critical styling to token reuse', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      const tokenReuseValue = screen.getByText('2');
      expect(tokenReuseValue.className).toContain('text-danger');
    });

    it('should apply high styling to account lockouts', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      const lockoutsValue = screen.getByText('8');
      expect(lockoutsValue.className).toContain('text-warning');
    });

    it('should apply medium styling to suspicious logins', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      const suspiciousValue = screen.getByText('12');
      expect(suspiciousValue.className).toContain('text-warning');
    });
  });

  describe('number formatting', () => {
    it('should format large numbers with commas', () => {
      const metricsWithLargeNumbers: SecurityMetrics = {
        ...mockMetrics,
        totalEvents: 1000000,
        criticalEvents: 5000,
      };

      render(<SecurityMetricsCard metrics={metricsWithLargeNumbers} isLoading={false} />);

      expect(screen.getByText('1,000,000')).toBeInTheDocument();
      expect(screen.getByText('5,000')).toBeInTheDocument();
    });

    it('should handle single digit numbers', () => {
      const metricsWithSmallNumbers: SecurityMetrics = {
        ...mockMetrics,
        totalEvents: 5,
        criticalEvents: 1,
        highEvents: 3,
        tokenReuseCount: 4,
      };

      render(<SecurityMetricsCard metrics={metricsWithSmallNumbers} isLoading={false} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('period display', () => {
    it('should not render period when metrics is undefined', () => {
      render(<SecurityMetricsCard metrics={undefined} isLoading={false} />);

      expect(screen.queryByText(/Period:/)).not.toBeInTheDocument();
    });

    it('should format period dates correctly', () => {
      render(<SecurityMetricsCard metrics={mockMetrics} isLoading={false} />);

      const periodText = screen.getByText(/Period:/);
      expect(periodText).toBeInTheDocument();
    });
  });

  describe('loading state for metrics is undefined', () => {
    it('should show 0 for all metrics when metrics is undefined and not loading', () => {
      render(<SecurityMetricsCard metrics={undefined} isLoading={false} />);

      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle all metrics being zero', () => {
      const allZeroMetrics: SecurityMetrics = {
        totalEvents: 0,
        criticalEvents: 0,
        highEvents: 0,
        mediumEvents: 0,
        tokenReuseCount: 0,
        accountLockedCount: 0,
        suspiciousLoginCount: 0,
        periodStart: '2024-01-01T00:00:00Z',
        periodEnd: '2024-01-31T23:59:59Z',
        lowEvents: 0,
        eventsByType: {},
        period: 'day',
      };

      render(<SecurityMetricsCard metrics={allZeroMetrics} isLoading={false} />);

      expect(screen.getByText('Security Overview')).toBeInTheDocument();
    });

    it('should handle metrics with mixed zero and non-zero values', () => {
      const mixedMetrics: SecurityMetrics = {
        ...mockMetrics,
        criticalEvents: 0,
        tokenReuseCount: 0,
      };

      render(<SecurityMetricsCard metrics={mixedMetrics} isLoading={false} />);

      expect(screen.getByText('Total Events')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });
});
