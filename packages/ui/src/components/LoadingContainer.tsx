// packages/ui/src/components/LoadingContainer.tsx
import { Spinner } from '@elements/Spinner';
import { Text } from '@elements/Text';

import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import '../styles/components.css';

type LoadingContainerProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * Loading text to display
   * @default 'Loading...'
   */
  text?: string;
  /**
   * Spinner size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
};

const spinnerSizes = {
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
};

/**
 * Centered loading container with spinner and optional text
 *
 * @example
 * ```tsx
 * <LoadingContainer />
 * <LoadingContainer text="Fetching data..." />
 * <LoadingContainer size="lg" text="Please wait..." />
 * ```
 */
export function LoadingContainer({
  text = 'Loading...',
  size = 'md',
  className = '',
  ...rest
}: LoadingContainerProps): ReactElement {
  return (
    <div className={`loading-container ${className}`.trim()} {...rest}>
      <Spinner size={spinnerSizes[size]} />
      {text ? <Text tone="muted">{text}</Text> : null}
    </div>
  );
}
