// main/client/ui/src/components/SectionErrorBoundary.tsx
import { Button } from '@elements/Button';
import { Text } from '@elements/Text';

import { ErrorBoundary } from './ErrorBoundary';

import type { ReactElement, ReactNode } from 'react';

export interface SectionErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Lightweight error boundary for individual page sections.
 *
 * Displays a compact fallback instead of crashing the entire page,
 * with a retry button to re-render the failed section.
 */
export function SectionErrorBoundary({ children }: SectionErrorBoundaryProps): ReactElement {
  return (
    <ErrorBoundary
      fallback={(error: Error, reset: () => void): ReactElement => (
        <div
          className="flex-col items-center p-4 text-center"
          style={{
            gap: 'var(--ui-gap-sm)',
            border: '1px solid var(--ui-color-border)',
            borderRadius: 'var(--ui-radius-md)',
            background: 'var(--ui-color-surface)',
          }}
          role="alert"
        >
          <Text tone="danger" size="sm">
            This section encountered an error
          </Text>
          <Text tone="muted" size="sm">
            {error.message}
          </Text>
          <Button variant="secondary" size="small" onClick={reset}>
            Try Again
          </Button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
