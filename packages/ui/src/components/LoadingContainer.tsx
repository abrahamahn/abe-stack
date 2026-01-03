import { Spinner } from '../elements/Spinner';
import { Text } from '../elements/Text';

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
  sm: '16px',
  md: '24px',
  lg: '32px',
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
    <div className={`ui-loading-container ${className}`.trim()} {...rest}>
      <Spinner size={spinnerSizes[size]} />
      {text ? <Text tone="muted">{text}</Text> : null}
    </div>
  );
}
