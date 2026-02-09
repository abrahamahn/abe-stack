// src/client/ui/src/components/DelayedFallback.tsx
import { useDelayedFlag } from '@abe-stack/react/hooks';

import { LoadingContainer } from './LoadingContainer';

import type { ReactElement, ReactNode } from 'react';

export interface DelayedFallbackProps {
  /**
   * Delay in ms before showing the fallback
   * @default 150
   */
  delay?: number;
  /**
   * Custom fallback content (defaults to LoadingContainer)
   */
  children?: ReactNode;
  /**
   * Text to show in the default LoadingContainer
   * @default '' (no text, just spinner)
   */
  text?: string;
  /**
   * Size of the spinner in the default LoadingContainer
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * A loading fallback that delays rendering to prevent flash of loading state.
 *
 * Use this as a Suspense fallback to avoid brief flickers when lazy-loaded
 * components resolve quickly.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<DelayedFallback />}>
 *   <LazyComponent />
 * </Suspense>
 *
 * // With custom delay
 * <Suspense fallback={<DelayedFallback delay={200} />}>
 *   <LazyComponent />
 * </Suspense>
 *
 * // With custom fallback content
 * <Suspense fallback={<DelayedFallback><MySkeleton /></DelayedFallback>}>
 *   <LazyComponent />
 * </Suspense>
 * ```
 */
export const DelayedFallback = ({
  delay = 150,
  children,
  text = '',
  size = 'md',
}: DelayedFallbackProps): ReactElement | null => {
  // Always pass true - we're always "loading" when this component renders
  const showFallback = useDelayedFlag(true, delay);

  if (!showFallback) {
    return null;
  }

  if (children != null) {
    return <>{children}</>;
  }

  return (
    <div className="flex-center h-screen">
      <LoadingContainer text={text} size={size} />
    </div>
  );
};
