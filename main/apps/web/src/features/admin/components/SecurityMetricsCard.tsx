// main/apps/web/src/features/admin/components/SecurityMetricsCard.tsx
/**
 * SecurityMetricsCard Component
 *
 * Displays security metrics summary in a card format.
 */

import { Text } from '@bslt/ui';
import { MetricValue } from '@bslt/ui/components/MetricValue';
import { TitledCardSection } from '@bslt/ui/components/TitledCardSection';

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
// Helpers
// ============================================================================

function getSeverityClass(variant: 'default' | 'critical' | 'high' | 'medium' | 'low'): string {
  switch (variant) {
    case 'critical':
      return 'font-bold text-danger';
    case 'high':
      return 'font-bold text-warning';
    case 'medium':
      return 'font-bold text-warning';
    case 'low':
      return 'font-bold text-success';
    case 'default':
    default:
      return 'font-bold';
  }
}

// ============================================================================
// Component
// ============================================================================

export const SecurityMetricsCard = ({
  metrics,
  isLoading,
}: SecurityMetricsCardProps): JSX.Element => {
  return (
    <TitledCardSection
      title="Security Overview"
      headingAs="h3"
      headingSize="md"
      cardClassName="p-6"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MetricValue
          label="Total Events"
          value={metrics?.totalEvents ?? 0}
          isLoading={isLoading}
          formatNumber={true}
          valueClassName={getSeverityClass('default')}
        />
        <MetricValue
          label="Critical"
          value={metrics?.criticalEvents ?? 0}
          isLoading={isLoading}
          formatNumber={true}
          valueClassName={getSeverityClass('critical')}
        />
        <MetricValue
          label="High"
          value={metrics?.highEvents ?? 0}
          isLoading={isLoading}
          formatNumber={true}
          valueClassName={getSeverityClass('high')}
        />
        <MetricValue
          label="Medium"
          value={metrics?.mediumEvents ?? 0}
          isLoading={isLoading}
          formatNumber={true}
          valueClassName={getSeverityClass('medium')}
        />
      </div>

      <div className="mt-6 pt-4 border-t">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricValue
            label="Token Reuse"
            value={metrics?.tokenReuseCount ?? 0}
            isLoading={isLoading}
            formatNumber={true}
            valueClassName={getSeverityClass('critical')}
          />
          <MetricValue
            label="Account Lockouts"
            value={metrics?.accountLockedCount ?? 0}
            isLoading={isLoading}
            formatNumber={true}
            valueClassName={getSeverityClass('high')}
          />
          <MetricValue
            label="Suspicious Logins"
            value={metrics?.suspiciousLoginCount ?? 0}
            isLoading={isLoading}
            formatNumber={true}
            valueClassName={getSeverityClass('medium')}
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
    </TitledCardSection>
  );
};
