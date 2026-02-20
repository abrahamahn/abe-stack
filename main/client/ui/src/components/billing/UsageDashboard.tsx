// main/client/ui/src/components/billing/UsageDashboard.tsx
import { forwardRef, type ComponentPropsWithoutRef, type ReactElement } from 'react';

import { Button } from '../../elements/Button';
import { cn } from '../../utils/cn';

import { UsageBar } from './UsageBar';

import type { UsageMetricSummary } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

export interface UsageDashboardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Array of usage metric summaries from the API */
  metrics: UsageMetricSummary[];
  /** Period start date (ISO string) */
  periodStart: string;
  /** Period end date (ISO string) */
  periodEnd: string;
  /** Optional title override */
  title?: string;
  /** Whether data is currently loading */
  loading?: boolean;
  /** Error message if data failed to load */
  error?: string | null;
  /** Callback when refresh is requested */
  onRefresh?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format a period date for display.
 */
function formatPeriodDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/**
 * Format a metric value with its unit for display.
 */
function formatMetricValue(value: number, unit: string): string {
  if (unit === '') return String(value);
  return `${String(value)} ${unit}`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * UsageDashboard displays a complete usage overview for a workspace,
 * with bar charts for each metered metric showing current value vs limit.
 *
 * This component is designed for workspace settings pages and admin dashboards.
 *
 * @example
 * ```tsx
 * <UsageDashboard
 *   metrics={usageData.metrics}
 *   periodStart={usageData.periodStart}
 *   periodEnd={usageData.periodEnd}
 *   loading={isLoading}
 *   error={error?.message}
 *   onRefresh={refetch}
 * />
 * ```
 */
export const UsageDashboard = forwardRef<HTMLDivElement, UsageDashboardProps>(
  (
    {
      metrics,
      periodStart,
      periodEnd,
      title = 'Usage Overview',
      loading = false,
      error = null,
      onRefresh,
      className,
      ...rest
    },
    ref,
  ): ReactElement => {
    // Loading state
    if (loading) {
      return (
        <div
          ref={ref}
          className={cn('usage-dashboard', 'usage-dashboard--loading', className)}
          {...rest}
        >
          <div className="usage-dashboard__header">
            <h3 className="usage-dashboard__title">{title}</h3>
          </div>
          <div className="usage-dashboard__loading">
            <p>Loading usage data...</p>
          </div>
        </div>
      );
    }

    // Error state
    if (error !== null) {
      return (
        <div
          ref={ref}
          className={cn('usage-dashboard', 'usage-dashboard--error', className)}
          {...rest}
        >
          <div className="usage-dashboard__header">
            <h3 className="usage-dashboard__title">{title}</h3>
            {onRefresh !== undefined && (
              <Button
                type="button"
                variant="secondary"
                className="usage-dashboard__refresh-btn"
                onClick={onRefresh}
              >
                Retry
              </Button>
            )}
          </div>
          <div className="usage-dashboard__error">
            <p>{error}</p>
          </div>
        </div>
      );
    }

    // Filter to metrics with positive limits
    const displayMetrics = metrics.filter((m) => m.limit > 0);

    return (
      <div ref={ref} className={cn('usage-dashboard', className)} {...rest}>
        <div className="usage-dashboard__header">
          <h3 className="usage-dashboard__title">{title}</h3>
          <span className="usage-dashboard__period">
            {formatPeriodDate(periodStart)} - {formatPeriodDate(periodEnd)}
          </span>
          {onRefresh !== undefined && (
            <Button
              type="button"
              variant="secondary"
              className="usage-dashboard__refresh-btn"
              onClick={onRefresh}
            >
              Refresh
            </Button>
          )}
        </div>

        {displayMetrics.length === 0 ? (
          <div className="usage-dashboard__empty">
            <p className="usage-dashboard__empty-text">
              No metered usage limits configured for your plan.
            </p>
          </div>
        ) : (
          <div className="usage-dashboard__grid flex flex-col gap-4">
            {displayMetrics.map((metric) => (
              <UsageBar
                key={metric.metricKey}
                label={metric.name}
                current={metric.currentValue}
                max={metric.limit}
                unit={metric.unit}
                formatValue={(value, unit) => formatMetricValue(value, unit ?? '')}
              />
            ))}
          </div>
        )}

        {/* Summary stats */}
        {displayMetrics.length > 0 && (
          <div className="usage-dashboard__summary mt-4 flex gap-6 text-sm text-muted-foreground">
            {displayMetrics.map((metric) => (
              <div key={metric.metricKey} className="usage-dashboard__stat">
                <span className="usage-dashboard__stat-label">{metric.name}: </span>
                <span className="usage-dashboard__stat-value">
                  {formatMetricValue(metric.currentValue, metric.unit)} of{' '}
                  {formatMetricValue(metric.limit, metric.unit)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

UsageDashboard.displayName = 'UsageDashboard';
