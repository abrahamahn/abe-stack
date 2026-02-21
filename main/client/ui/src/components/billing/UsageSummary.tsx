// main/client/ui/src/components/billing/UsageSummary.tsx
import { FEATURE_KEYS } from '@bslt/shared';
import { forwardRef, type ComponentPropsWithoutRef, type ReactElement } from 'react';

import { cn } from '../../utils/cn';

import { UsageBar } from './UsageBar';

import type { Plan } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

/** Usage data for a single metered resource */
export interface UsageMetric {
  /** Feature key matching the plan feature (e.g., "storage:limit") */
  featureKey: string;
  /** Human-readable label (e.g., "Storage") */
  label: string;
  /** Current usage value */
  current: number;
  /** Unit label (e.g., "GB", "seats", "projects") */
  unit?: string;
}

export interface UsageSummaryProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** The user's current plan (to resolve limits) */
  plan: Plan;
  /** Array of current usage metrics */
  usage: UsageMetric[];
  /** Optional title override */
  title?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Resolve the numeric limit for a feature key from plan features.
 * Returns -1 (unlimited) when the feature is a toggle or not found.
 */
function resolveLimit(plan: Plan, featureKey: string): number {
  const feature = plan.features.find((f) => f.key === featureKey);
  if (feature == null || !feature.included) return 0;
  if (typeof feature.value === 'number') return feature.value;
  return -1;
}

/**
 * Build a default set of usage metrics from well-known feature keys.
 * Only includes limit-type features that are present on the plan.
 */
export function buildDefaultUsageMetrics(plan: Plan): UsageMetric[] {
  const metrics: UsageMetric[] = [];

  const storageFeature = plan.features.find((f) => f.key === FEATURE_KEYS.STORAGE);
  if (storageFeature?.included === true && typeof storageFeature.value === 'number') {
    metrics.push({
      featureKey: FEATURE_KEYS.STORAGE,
      label: 'Storage',
      current: 0,
      unit: 'GB',
    });
  }

  const projectsFeature = plan.features.find((f) => f.key === FEATURE_KEYS.PROJECTS);
  if (projectsFeature?.included === true && typeof projectsFeature.value === 'number') {
    metrics.push({
      featureKey: FEATURE_KEYS.PROJECTS,
      label: 'Projects',
      current: 0,
      unit: 'projects',
    });
  }

  const fileSizeFeature = plan.features.find((f) => f.key === FEATURE_KEYS.MEDIA_MAX_FILE_SIZE_MB);
  if (fileSizeFeature?.included === true && typeof fileSizeFeature.value === 'number') {
    metrics.push({
      featureKey: FEATURE_KEYS.MEDIA_MAX_FILE_SIZE_MB,
      label: 'Max File Size',
      current: 0,
      unit: 'MB',
    });
  }

  return metrics;
}

// ============================================================================
// Component
// ============================================================================

/**
 * UsageSummary displays multiple UsageBar components for all metered plan
 * limits. It resolves the maximum allowed value from the plan features
 * and renders a progress bar for each metric.
 *
 * @example
 * ```tsx
 * <UsageSummary
 *   plan={subscription.plan}
 *   usage={[
 *     { featureKey: 'storage:limit', label: 'Storage', current: 8, unit: 'GB' },
 *     { featureKey: 'projects:limit', label: 'Projects', current: 7, unit: 'projects' },
 *   ]}
 * />
 * ```
 */
export const UsageSummary = forwardRef<HTMLDivElement, UsageSummaryProps>(
  ({ plan, usage, title = 'Usage', className, ...rest }, ref): ReactElement => {
    // Filter to metrics that have a resolvable numeric limit
    const resolvedMetrics = usage
      .map((metric) => {
        const limit = resolveLimit(plan, metric.featureKey);
        return { ...metric, limit };
      })
      .filter((m) => m.limit > 0);

    if (resolvedMetrics.length === 0) {
      return (
        <div ref={ref} className={cn('usage-summary', 'usage-summary--empty', className)} {...rest}>
          <h3 className="usage-summary__title">{title}</h3>
          <p className="usage-summary__empty-text">No metered usage limits on your current plan.</p>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('usage-summary', className)} {...rest}>
        <h3 className="usage-summary__title">{title}</h3>
        <div className="usage-summary__bars flex flex-col gap-4">
          {resolvedMetrics.map((metric) => (
            <UsageBar
              key={metric.featureKey}
              label={metric.label}
              current={metric.current}
              max={metric.limit}
              {...(metric.unit === undefined ? {} : { unit: metric.unit })}
            />
          ))}
        </div>
      </div>
    );
  },
);

UsageSummary.displayName = 'UsageSummary';
