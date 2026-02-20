// main/apps/web/src/features/admin/pages/SystemHealthPage.tsx
/**
 * SystemHealthPage
 *
 * Admin system health dashboard showing:
 * - Component status cards (green/yellow/red) for DB, cache, queue, storage, email
 * - Job queue statistics widget
 * - Recent error log widget
 * - Active connections count / metrics
 */

import { Alert, Badge, Button, Card, Heading, Skeleton, Text } from '@bslt/ui';

import { ActiveConnectionsWidget } from '../components/ActiveConnectionsWidget';
import { HealthStatusCard } from '../components/HealthStatusCard';
import { JobQueueStatsWidget } from '../components/JobQueueStatsWidget';
import { RecentErrorLogWidget } from '../components/RecentErrorLogWidget';
import { useQueueStats } from '../hooks';
import { useAdminErrorLog } from '../hooks/useAdminErrorLog';
import { useAdminHealth } from '../hooks/useAdminHealth';
import { useAdminMetrics } from '../hooks/useAdminMetrics';

import type { ReactElement } from 'react';

// ============================================================================
// Overall Status Badge
// ============================================================================

function OverallStatusBadge({ status }: { status: 'healthy' | 'degraded' | 'down' }): ReactElement {
  const toneMap: Record<string, 'success' | 'warning' | 'danger'> = {
    healthy: 'success',
    degraded: 'warning',
    down: 'danger',
  };
  return <Badge tone={toneMap[status] ?? 'info'}>{status.toUpperCase()}</Badge>;
}

// ============================================================================
// Component
// ============================================================================

export function SystemHealthPage(): ReactElement {
  const {
    data: healthData,
    isLoading: healthLoading,
    isError: healthError,
    error: healthErr,
    refetch: refetchHealth,
  } = useAdminHealth();

  const {
    data: metricsData,
    isLoading: metricsLoading,
    isError: metricsError,
    error: metricsErr,
    refetch: refetchMetrics,
  } = useAdminMetrics();

  const {
    data: queueData,
    isLoading: queueLoading,
    isError: queueError,
    error: queueErr,
  } = useQueueStats();

  const {
    data: errorLogData,
    isLoading: errorLogLoading,
    isError: errorLogError,
    error: errorLogErr,
    refetch: refetchErrors,
  } = useAdminErrorLog({ limit: 25 });

  const handleRefreshAll = () => {
    void refetchHealth();
    void refetchMetrics();
    void refetchErrors();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <Heading as="h2">System Health</Heading>
            <Text tone="muted" size="sm">
              Real-time overview of system component status and performance.
            </Text>
          </div>
          {healthData !== undefined && <OverallStatusBadge status={healthData.status} />}
        </div>
        <Button variant="secondary" size="small" onClick={handleRefreshAll}>
          Refresh All
        </Button>
      </div>

      {/* Service Health Cards */}
      <div className="mb-6">
        <Heading as="h3" size="sm" className="mb-3">
          Service Status
        </Heading>
        {healthLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Skeleton width="100%" height="4rem" />
            <Skeleton width="100%" height="4rem" />
            <Skeleton width="100%" height="4rem" />
            <Skeleton width="100%" height="4rem" />
            <Skeleton width="100%" height="4rem" />
          </div>
        ) : healthError ? (
          <Alert tone="danger">{healthErr?.message ?? 'Failed to load health status'}</Alert>
        ) : healthData !== undefined ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(healthData.services).map(([name, status]) => (
              <HealthStatusCard key={name} serviceName={name} status={status} />
            ))}
          </div>
        ) : null}
      </div>

      {/* Two-Column Layout: Queue Stats + Connections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Job Queue Stats Widget */}
        <JobQueueStatsWidget
          stats={queueData}
          isLoading={queueLoading}
          isError={queueError}
          error={queueErr}
        />

        {/* Active Connections Widget */}
        <ActiveConnectionsWidget
          metrics={metricsData}
          isLoading={metricsLoading}
          isError={metricsError}
          error={metricsErr}
        />
      </div>

      {/* Queue Stats from Metrics (secondary) */}
      {metricsData?.queue !== null && metricsData?.queue !== undefined && (
        <div className="mb-6">
          <Card className="p-4">
            <Heading as="h3" size="sm" className="mb-3">
              Queue Summary (from Metrics)
            </Heading>
            <div className="flex gap-6">
              <div>
                <Text size="sm" tone="muted">
                  Pending
                </Text>
                <Text size="sm" className="font-semibold">
                  {metricsData.queue.pending}
                </Text>
              </div>
              <div>
                <Text size="sm" tone="muted">
                  Failed
                </Text>
                <Text
                  size="sm"
                  className={`font-semibold ${metricsData.queue.failed > 0 ? 'text-red-600 dark:text-red-400' : ''}`}
                >
                  {metricsData.queue.failed}
                </Text>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Error Log */}
      <div>
        <RecentErrorLogWidget
          errors={errorLogData?.errors}
          total={errorLogData?.total ?? 0}
          isLoading={errorLogLoading}
          isError={errorLogError}
          error={errorLogErr}
        />
      </div>
    </div>
  );
}
