// main/apps/web/src/features/admin/components/QueueStatsCard.tsx
/**
 * QueueStatsCard component
 *
 * Displays queue statistics in a card format with alert banners.
 */

import { Alert, Skeleton } from '@abe-stack/ui';
import { CardAsyncState } from '@abe-stack/ui/components/CardAsyncState';
import { MetricValue } from '@abe-stack/ui/components/MetricValue';
import { TitledCardSection } from '@abe-stack/ui/components/TitledCardSection';

import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

interface QueueStatsLocal {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  total: number;
  failureRate: number;
  recentCompleted: number;
  recentFailed: number;
}

export interface QueueStatsCardProps {
  stats: QueueStatsLocal | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// ============================================================================
// Thresholds
// ============================================================================

const HIGH_FAILURE_RATE_THRESHOLD = 10; // 10%

// ============================================================================
// Component
// ============================================================================

export const QueueStatsCard = ({
  stats,
  isLoading,
  isError,
  error,
}: QueueStatsCardProps): JSX.Element => {
  if (isLoading || isError || stats === undefined) {
    return (
      <CardAsyncState
        isLoading={isLoading}
        errorMessage={isError || stats === undefined ? (error?.message ?? 'Failed to load queue statistics') : null}
        loadingContent={
          <>
            <Skeleton width="10rem" height="1.25rem" className="mb-4" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <Skeleton width="100%" height="3rem" />
              <Skeleton width="100%" height="3rem" />
              <Skeleton width="100%" height="3rem" />
              <Skeleton width="100%" height="3rem" />
            </div>
          </>
        }
        cardClassName="p-4"
      />
    );
  }

  const hasHighFailureRate = stats.failureRate > HIGH_FAILURE_RATE_THRESHOLD;
  const hasDeadLetterItems = stats.deadLetter > 0;

  return (
    <TitledCardSection title="Queue Statistics" headingAs="h3" headingSize="sm" cardClassName="p-4">
      {/* Alert Banners */}
      {hasHighFailureRate && (
        <Alert tone="warning" className="mb-4">
          High failure rate detected: {stats.failureRate.toFixed(1)}% of jobs are failing.
        </Alert>
      )}

      {hasDeadLetterItems && (
        <Alert tone="danger" className="mb-4">
          {stats.deadLetter} job(s) in dead letter queue require attention.
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricValue
          label="Pending"
          value={stats.pending}
          labelClassName="text-xs uppercase tracking-wide"
          valueClassName="text-2xl font-semibold"
          formatNumber={false}
        />
        <MetricValue
          label="Processing"
          value={stats.processing}
          labelClassName="text-xs uppercase tracking-wide"
          valueClassName="text-2xl font-semibold"
          formatNumber={false}
        />
        <MetricValue
          label="Completed"
          value={stats.completed}
          labelClassName="text-xs uppercase tracking-wide"
          valueClassName="text-2xl font-semibold"
          formatNumber={false}
        />
        <MetricValue
          label="Failed"
          value={stats.failed}
          labelClassName="text-xs uppercase tracking-wide"
          valueClassName={`text-2xl font-semibold ${stats.failed > 0 ? 'text-danger' : ''}`}
          formatNumber={false}
        />
        <MetricValue
          label="Dead Letter"
          value={stats.deadLetter}
          labelClassName="text-xs uppercase tracking-wide"
          valueClassName={`text-2xl font-semibold ${stats.deadLetter > 0 ? 'text-danger' : ''}`}
          formatNumber={false}
        />
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricValue
            label="Total Jobs"
            value={stats.total}
            labelClassName="text-xs uppercase tracking-wide"
            valueClassName="text-2xl font-semibold"
            formatNumber={false}
          />
          <MetricValue
            label="Failure Rate"
            value={`${stats.failureRate.toFixed(1)}%`}
            labelClassName="text-xs uppercase tracking-wide"
            valueClassName={`text-2xl font-semibold ${hasHighFailureRate ? 'text-danger' : ''}`}
            formatNumber={false}
          />
          <MetricValue
            label="Recent (1h)"
            value={`${String(stats.recentCompleted)} OK / ${String(stats.recentFailed)} fail`}
            labelClassName="text-xs uppercase tracking-wide"
            valueClassName="text-2xl font-semibold"
            formatNumber={false}
          />
        </div>
      </div>
    </TitledCardSection>
  );
};
