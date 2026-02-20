// main/apps/web/src/features/admin/components/JobQueueStatsWidget.tsx
/**
 * JobQueueStatsWidget Component
 *
 * Shows pending, processing, failed counts with visual indicators.
 * Designed for the system health dashboard.
 */

import { Alert, Badge, Card, Heading, Skeleton, Text } from '@bslt/ui';

import type { QueueStatsLocal } from '../services/adminApi';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface JobQueueStatsWidgetProps {
  stats: QueueStatsLocal | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// ============================================================================
// Stat Item
// ============================================================================

interface StatItemProps {
  label: string;
  value: number;
  tone?: 'default' | 'danger' | 'warning' | 'success';
}

function StatItem({ label, value, tone = 'default' }: StatItemProps): ReactElement {
  const colorClass =
    tone === 'danger'
      ? 'text-red-600 dark:text-red-400'
      : tone === 'warning'
        ? 'text-yellow-600 dark:text-yellow-400'
        : tone === 'success'
          ? 'text-green-600 dark:text-green-400'
          : '';

  return (
    <div className="text-center">
      <Text size="sm" tone="muted" className="text-xs uppercase tracking-wide">
        {label}
      </Text>
      <div className={`text-2xl font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function JobQueueStatsWidget({
  stats,
  isLoading,
  isError,
  error,
}: JobQueueStatsWidgetProps): ReactElement {
  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton width="10rem" height="1.25rem" className="mb-4" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton width="100%" height="3rem" />
          <Skeleton width="100%" height="3rem" />
          <Skeleton width="100%" height="3rem" />
        </div>
      </Card>
    );
  }

  if (isError || stats === undefined) {
    return (
      <Card className="p-4">
        <Heading as="h3" size="sm" className="mb-2">
          Job Queue
        </Heading>
        <Alert tone="danger">{error?.message ?? 'Failed to load queue statistics'}</Alert>
      </Card>
    );
  }

  const hasHighFailureRate = stats.failureRate > 10;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Heading as="h3" size="sm">
          Job Queue
        </Heading>
        {hasHighFailureRate && <Badge tone="danger">High Failure Rate</Badge>}
      </div>

      {stats.deadLetter > 0 && (
        <Alert tone="danger" className="mb-3">
          {stats.deadLetter} job(s) in dead letter queue require attention.
        </Alert>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatItem label="Pending" value={stats.pending} tone="warning" />
        <StatItem label="Processing" value={stats.processing} />
        <StatItem label="Completed" value={stats.completed} tone="success" />
        <StatItem
          label="Failed"
          value={stats.failed}
          tone={stats.failed > 0 ? 'danger' : 'default'}
        />
        <StatItem
          label="Dead Letter"
          value={stats.deadLetter}
          tone={stats.deadLetter > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center gap-6">
        <Text size="sm" tone="muted">
          Total: <strong>{stats.total}</strong>
        </Text>
        <Text size="sm" tone="muted">
          Failure Rate:{' '}
          <strong className={hasHighFailureRate ? 'text-red-600 dark:text-red-400' : ''}>
            {stats.failureRate.toFixed(1)}%
          </strong>
        </Text>
        <Text size="sm" tone="muted">
          Recent (1h): {stats.recentCompleted} OK / {stats.recentFailed} fail
        </Text>
      </div>
    </Card>
  );
}
