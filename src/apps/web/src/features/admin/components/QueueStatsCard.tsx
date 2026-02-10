// src/apps/web/src/features/admin/components/QueueStatsCard.tsx
/**
 * QueueStatsCard component
 *
 * Displays queue statistics in a card format with alert banners.
 */

import { Alert, Card, Heading, Spinner, Text } from '@abe-stack/ui';

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
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </Card>
    );
  }

  if (isError || stats === undefined) {
    return (
      <Card className="p-4">
        <Alert tone="danger">{error?.message ?? 'Failed to load queue statistics'}</Alert>
      </Card>
    );
  }

  const hasHighFailureRate = stats.failureRate > HIGH_FAILURE_RATE_THRESHOLD;
  const hasDeadLetterItems = stats.deadLetter > 0;

  return (
    <Card className="p-4">
      <Heading as="h3" size="sm" className="mb-4">
        Queue Statistics
      </Heading>

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
        <StatItem label="Pending" value={stats.pending} />
        <StatItem label="Processing" value={stats.processing} />
        <StatItem label="Completed" value={stats.completed} />
        <StatItem
          label="Failed"
          value={stats.failed}
          {...(stats.failed > 0 && { tone: 'danger' as const })}
        />
        <StatItem
          label="Dead Letter"
          value={stats.deadLetter}
          {...(stats.deadLetter > 0 && { tone: 'danger' as const })}
        />
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatItem label="Total Jobs" value={stats.total} />
          <StatItem
            label="Failure Rate"
            value={`${stats.failureRate.toFixed(1)}%`}
            {...(hasHighFailureRate && { tone: 'danger' as const })}
          />
          <StatItem
            label="Recent (1h)"
            value={`${String(stats.recentCompleted)} OK / ${String(stats.recentFailed)} fail`}
          />
        </div>
      </div>
    </Card>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

interface StatItemProps {
  label: string;
  value: number | string;
  tone?: 'danger';
}

const StatItem = ({ label, value, tone }: StatItemProps): JSX.Element => {
  const valueClass = tone === 'danger' ? 'text-danger' : '';

  return (
    <div>
      <Text tone="muted" className="text-xs uppercase tracking-wide">
        {label}
      </Text>
      <Text className={`text-2xl font-semibold ${valueClass}`}>{value}</Text>
    </div>
  );
};
