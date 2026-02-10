// src/apps/web/src/features/admin/components/SecurityMetricsCard.tsx
/**
 * SecurityMetricsCard Component
 *
 * Displays security metrics summary in a card format.
 */

import { Card, Heading, Skeleton, Text } from '@abe-stack/ui';

import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

interface SecurityMetricsLocal {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  tokenReuseCount: number;
  accountLockedCount: number;
  suspiciousLoginCount: number;
  periodStart: string;
  periodEnd: string;
}

export interface SecurityMetricsCardProps {
  metrics: SecurityMetricsLocal | undefined;
  isLoading: boolean;
}

// ============================================================================
// Helper Components
// ============================================================================

interface MetricItemProps {
  label: string;
  value: number;
  variant?: 'default' | 'critical' | 'high' | 'medium' | 'low';
  isLoading: boolean;
}

const MetricItem = ({
  label,
  value,
  variant = 'default',
  isLoading,
}: MetricItemProps): JSX.Element => {
  const getVariantClass = (): string => {
    switch (variant) {
      case 'critical':
        return 'text-danger';
      case 'high':
        return 'text-warning';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-success';
      case 'default':
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-12" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Text tone="muted" size="sm">
        {label}
      </Text>
      <Text size="xl" className={`font-bold ${getVariantClass()}`}>
        {value.toLocaleString()}
      </Text>
    </div>
  );
};

// ============================================================================
// Component
// ============================================================================

export const SecurityMetricsCard = ({
  metrics,
  isLoading,
}: SecurityMetricsCardProps): JSX.Element => {
  return (
    <Card className="p-6">
      <Heading as="h3" size="md" className="mb-4">
        Security Overview
      </Heading>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MetricItem label="Total Events" value={metrics?.totalEvents ?? 0} isLoading={isLoading} />
        <MetricItem
          label="Critical"
          value={metrics?.criticalEvents ?? 0}
          variant="critical"
          isLoading={isLoading}
        />
        <MetricItem
          label="High"
          value={metrics?.highEvents ?? 0}
          variant="high"
          isLoading={isLoading}
        />
        <MetricItem
          label="Medium"
          value={metrics?.mediumEvents ?? 0}
          variant="medium"
          isLoading={isLoading}
        />
      </div>

      <div className="mt-6 pt-4 border-t">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricItem
            label="Token Reuse"
            value={metrics?.tokenReuseCount ?? 0}
            variant="critical"
            isLoading={isLoading}
          />
          <MetricItem
            label="Account Lockouts"
            value={metrics?.accountLockedCount ?? 0}
            variant="high"
            isLoading={isLoading}
          />
          <MetricItem
            label="Suspicious Logins"
            value={metrics?.suspiciousLoginCount ?? 0}
            variant="medium"
            isLoading={isLoading}
          />
        </div>
      </div>

      {metrics !== undefined && (
        <div className="mt-4 pt-4 border-t">
          <Text tone="muted" size="xs">
            Period: {new Date(metrics.periodStart).toLocaleString()} -{' '}
            {new Date(metrics.periodEnd).toLocaleString()}
          </Text>
        </div>
      )}
    </Card>
  );
};
