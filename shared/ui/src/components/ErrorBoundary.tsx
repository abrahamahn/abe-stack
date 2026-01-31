// shared/ui/src/components/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

import '../styles/components.css';

/**
 * Render prop signature for custom error fallback UI.
 *
 * @param error - The error that was caught
 * @param reset - Function to reset the error boundary and retry rendering
 * @returns React node to render as fallback
 */
type ErrorFallbackRender = (error: Error, reset: () => void) => ReactNode;

/**
 * Props for the ErrorBoundary component.
 *
 * @param children - Child components to render when no error is present
 * @param fallback - Static fallback node or render function for custom error UI
 * @param onError - Callback invoked when an error is caught (for logging/reporting)
 */
export type ErrorBoundaryProps = {
  /** Child components to render */
  children: ReactNode;
  /** Static fallback or render function receiving (error, reset) */
  fallback?: ReactNode | ErrorFallbackRender;
  /** Callback invoked when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * React error boundary that catches render errors in its subtree.
 *
 * Displays a fallback UI when a descendant component throws during rendering.
 * Provides a reset mechanism to retry rendering the children.
 *
 * Uses a class component because React error boundaries require
 * `getDerivedStateFromError` and `componentDidCatch` lifecycle methods,
 * which are not available in function components.
 *
 * @example
 * ```tsx
 * // With default fallback
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With custom render fallback
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <div>
 *       <p>Error: {error.message}</p>
 *       <button onClick={reset}>Retry</button>
 *     </div>
 *   )}
 *   onError={(error) => logErrorToService(error)}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With static fallback node
 * <ErrorBoundary fallback={<p>Something went wrong.</p>}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error !== null) {
      if (typeof fallback === 'function') {
        return fallback(error, this.reset);
      }

      if (fallback !== undefined) {
        return fallback;
      }

      return (
        <div className="error-fallback" role="alert">
          <div className="error-fallback-icon" aria-hidden="true">
            !
          </div>
          <h2 className="error-fallback-title">Something went wrong</h2>
          <p className="error-fallback-message">{error.message}</p>
          <button type="button" className="error-fallback-retry" onClick={this.reset}>
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}
