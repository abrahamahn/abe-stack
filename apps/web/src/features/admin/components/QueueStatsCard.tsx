// apps/web/src/features/admin/components/QueueStatsCard.tsx
/**
 * QueueStatsCard component
 *
 * Displays queue statistics in a card format with alert banners.
 */

import { Alert, Card, Heading, Spinner, Text } from '@abe-stack/ui';

import type { QueueStats } from '@abe-stack/core';
import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface QueueStatsCardProps {
  stats: QueueStats | undefined;
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

export function QueueStatsCard({
  stats,
  isLoading,
  isError,
  error,
}: QueueStatsCardProps): JSX.Element {
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </Card>
    );
  }

  if (isError || !stats) {
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
          tone={stats.failed > 0 ? 'danger' : undefined}
        />
        <StatItem
          label="Dead Letter"
          value={stats.deadLetter}
          tone={stats.deadLetter > 0 ? 'danger' : undefined}
        />
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatItem label="Total Jobs" value={stats.total} />
          <StatItem
            label="Failure Rate"
            value={`${stats.failureRate.toFixed(1)}%`}
            tone={hasHighFailureRate ? 'danger' : undefined}
          />
          <StatItem
            label="Recent (1h)"
            value={`${String(stats.recentCompleted)} OK / ${String(stats.recentFailed)} fail`}
          />
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface StatItemProps {
  label: string;
  value: number | string;
  tone?: 'danger';
}

function StatItem({ label, value, tone }: StatItemProps): JSX.Element {
  const valueClass = tone === 'danger' ? 'text-red-600 dark:text-red-400' : '';

  return (
    <div>
      <Text tone="muted" className="text-xs uppercase tracking-wide">
        {label}
      </Text>
      <Text className={`text-2xl font-semibold ${valueClass}`}>{value}</Text>
    </div>
  );
}
