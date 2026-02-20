// main/apps/web/src/features/admin/components/ActiveConnectionsWidget.tsx
/**
 * ActiveConnectionsWidget Component
 *
 * Displays WebSocket and HTTP connection metrics.
 */

import { Card, Heading, Skeleton, Text } from '@bslt/ui';

import type { AdminMetricsResponse } from '../services/adminApi';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ActiveConnectionsWidgetProps {
  metrics: AdminMetricsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// ============================================================================
// Metric Display
// ============================================================================

interface MetricDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
}

function MetricDisplay({ label, value, unit }: MetricDisplayProps): ReactElement {
  return (
    <div className="text-center p-3">
      <Text size="sm" tone="muted" className="text-xs uppercase tracking-wide">
        {label}
      </Text>
      <div className="text-2xl font-semibold">
        {value}
        {unit !== undefined && <span className="text-sm font-normal text-muted ml-1">{unit}</span>}
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function ActiveConnectionsWidget({
  metrics,
  isLoading,
  isError,
  error,
}: ActiveConnectionsWidgetProps): ReactElement {
  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton width="10rem" height="1.25rem" className="mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton width="100%" height="3rem" />
          <Skeleton width="100%" height="3rem" />
          <Skeleton width="100%" height="3rem" />
          <Skeleton width="100%" height="3rem" />
        </div>
      </Card>
    );
  }

  if (isError || metrics === undefined) {
    return (
      <Card className="p-4">
        <Heading as="h3" size="sm" className="mb-2">
          Active Connections
        </Heading>
        <Text tone="muted" size="sm">
          {error?.message ?? 'Unable to load connection metrics'}
        </Text>
      </Card>
    );
  }

  const { metrics: m } = metrics;

  return (
    <Card className="p-4">
      <Heading as="h3" size="sm" className="mb-4">
        Connection Metrics
      </Heading>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricDisplay label="Active Connections" value={m.activeConnections} />
        <MetricDisplay label="Requests/sec" value={m.requestsPerSecond.toFixed(1)} />
        <MetricDisplay label="Total Requests" value={m.totalRequests.toLocaleString()} />
        <MetricDisplay label="Error Rate" value={`${m.errorRate.toFixed(1)}%`} />
      </div>

      <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2">
        <MetricDisplay label="Avg Response" value={m.avgResponseTime.toFixed(0)} unit="ms" />
        <MetricDisplay label="P95 Response" value={m.p95ResponseTime.toFixed(0)} unit="ms" />
        <MetricDisplay label="P99 Response" value={m.p99ResponseTime.toFixed(0)} unit="ms" />
      </div>
    </Card>
  );
}
