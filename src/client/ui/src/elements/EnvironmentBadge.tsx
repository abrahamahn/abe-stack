// client/ui/src/elements/EnvironmentBadge.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import '../styles/elements.css';

type Environment = 'development' | 'production' | 'staging' | 'test';

type EnvironmentBadgeProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  /**
   * Environment to display
   */
  environment: Environment;
  /**
   * Whether to show short labels (DEV, PROD, etc.)
   * @default true
   */
  short?: boolean;
};

const envLabels: Record<Environment, { short: string; full: string }> = {
  development: { short: 'DEV', full: 'Development' },
  production: { short: 'PROD', full: 'Production' },
  staging: { short: 'STG', full: 'Staging' },
  test: { short: 'TEST', full: 'Test' },
};

/**
 * Badge component for displaying environment status
 *
 * @example
 * ```tsx
 * <EnvironmentBadge environment="development" />
 * <EnvironmentBadge environment="production" short={false} />
 * ```
 */
export const EnvironmentBadge = forwardRef<HTMLSpanElement, EnvironmentBadgeProps>((props, ref) => {
  const { environment, short = true, className = '', ...rest } = props;

  const label = short ? envLabels[environment].short : envLabels[environment].full;

  return (
    <span
      ref={ref}
      className={`environment-badge ${className}`.trim()}
      data-environment={environment}
      {...rest}
    >
      {label}
    </span>
  );
});

EnvironmentBadge.displayName = 'EnvironmentBadge';
