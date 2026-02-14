// main/client/ui/src/components/ErrorBoundary.test.tsx
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

import type { ReactElement } from 'react';

/** Component that throws an error when rendered */
const ThrowingComponent = ({ message }: { message: string }): ReactElement => {
  throw new Error(message);
};

/** Component that renders normally */
const GoodComponent = (): ReactElement => <div>All good</div>;

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error from React's error boundary logging during tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders default fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Test error" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('renders default fallback with role="alert"', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Accessible error" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders static fallback node when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent message="Error" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('renders fallback render function with error and reset', () => {
    render(
      <ErrorBoundary
        fallback={(error, reset) => (
          <div>
            <span>Render error: {error.message}</span>
            <button type="button" onClick={reset}>
              Reset
            </button>
          </div>
        )}
      >
        <ThrowingComponent message="Render fn error" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Render error: Render fn error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('calls onError callback when an error is caught', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent message="Callback error" />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Callback error' }),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('resets error state when retry button is clicked', () => {
    let shouldThrow = true;

    const ConditionalThrower = (): ReactElement => {
      if (shouldThrow) {
        throw new Error('Conditional error');
      }
      return <div>Recovered</div>;
    };

    render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the error condition before retrying
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('resets via render function reset callback', () => {
    let shouldThrow = true;

    const ConditionalThrower = (): ReactElement => {
      if (shouldThrow) {
        throw new Error('Reset test');
      }
      return <div>Fixed</div>;
    };

    render(
      <ErrorBoundary
        fallback={(_error, reset) => (
          <button type="button" onClick={reset}>
            Custom Reset
          </button>
        )}
      >
        <ConditionalThrower />
      </ErrorBoundary>,
    );

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Custom Reset' }));

    expect(screen.getByText('Fixed')).toBeInTheDocument();
  });
});
