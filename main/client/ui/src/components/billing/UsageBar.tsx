// main/client/ui/src/components/billing/UsageBar.tsx
import { forwardRef, type ComponentPropsWithoutRef, type ReactElement } from 'react';

import { cn } from '../../utils/cn';

// ============================================================================
// Types
// ============================================================================

export interface UsageBarProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Label for the usage metric (e.g., "Storage", "Team Members") */
  label: string;
  /** Current usage value */
  current: number;
  /** Maximum allowed value */
  max: number;
  /** Unit label (e.g., "MB", "GB", "seats") */
  unit?: string;
  /** Custom formatter for current/max display */
  formatValue?: (value: number, unit?: string) => string;
}

// ============================================================================
// Helpers
// ============================================================================

function defaultFormatValue(value: number, unit?: string): string {
  if (unit != null && unit !== '') {
    return `${String(value)} ${unit}`;
  }
  return String(value);
}

/**
 * Get the color variant based on usage percentage.
 * - Green: < 60%
 * - Yellow: 60-80%
 * - Red: > 80%
 */
function getUsageVariant(percentage: number): 'success' | 'warning' | 'danger' {
  if (percentage > 80) return 'danger';
  if (percentage >= 60) return 'warning';
  return 'success';
}

// ============================================================================
// Component
// ============================================================================

/**
 * UsageBar displays a labeled progress bar showing resource usage
 * against a plan limit with color-coded thresholds.
 *
 * @example
 * ```tsx
 * <UsageBar label="Storage" current={80} max={100} unit="MB" />
 * <UsageBar label="Team Members" current={3} max={5} unit="seats" />
 * ```
 */
export const UsageBar = forwardRef<HTMLDivElement, UsageBarProps>(
  (
    { label, current, max, unit, formatValue = defaultFormatValue, className, ...rest },
    ref,
  ): ReactElement => {
    const safeMax = max <= 0 ? 1 : max;
    const percentage = Math.min(100, Math.round((current / safeMax) * 100));
    const variant = getUsageVariant(percentage);

    return (
      <div ref={ref} className={cn('usage-bar', `usage-bar--${variant}`, className)} {...rest}>
        <div className="usage-bar__header">
          <span className="usage-bar__label">{label}</span>
          <span className="usage-bar__values">
            {formatValue(current, unit)} / {formatValue(max, unit)}
          </span>
        </div>

        <div className="usage-bar__track">
          <div
            className={cn('usage-bar__fill', `usage-bar__fill--${variant}`)}
            style={{ width: `${String(percentage)}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label}: ${String(percentage)}% used`}
          />
        </div>

        <div className="usage-bar__footer">
          <span className={cn('usage-bar__percentage', `usage-bar__percentage--${variant}`)}>
            {percentage}% used
          </span>
        </div>
      </div>
    );
  },
);

UsageBar.displayName = 'UsageBar';
