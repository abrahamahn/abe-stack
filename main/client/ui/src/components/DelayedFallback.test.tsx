// main/client/ui/src/components/DelayedFallback.test.tsx
/**
 * Tests for DelayedFallback component.
 *
 * Tests delayed rendering of loading states to prevent flashes.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DelayedFallback } from './DelayedFallback';

import type { ReactElement } from 'react';

describe('DelayedFallback', () => {
  describe('delay behavior', () => {
    it('should not render immediately', () => {
      render(<DelayedFallback />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should render after default delay', async () => {
      render(<DelayedFallback delay={150} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.getByRole('status')).toBeInTheDocument();
        },
        { timeout: 200 },
      );
    });

    it('should render after custom delay', async () => {
      render(<DelayedFallback delay={50} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.getByRole('status')).toBeInTheDocument();
        },
        { timeout: 100 },
      );
    });

    it('should not render if delay is very long', async () => {
      const { unmount } = render(<DelayedFallback delay={10000} />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      unmount();
    });
  });

  describe('default fallback', () => {
    it('should render LoadingContainer by default', async () => {
      render(<DelayedFallback delay={10} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('should render with custom text', async () => {
      render(<DelayedFallback delay={10} text="Loading data..." />);

      await waitFor(() => {
        expect(screen.getByText('Loading data...')).toBeInTheDocument();
      });
    });

    it('should render with custom size', async () => {
      render(<DelayedFallback delay={10} size="lg" />);

      await waitFor(() => {
        const spinner = screen.getByRole('status');
        expect(spinner).toHaveClass('spinner');
        expect(spinner).toHaveStyle({ '--ui-spinner-size': '2rem' });
      });
    });

    it('should render with small size', async () => {
      render(<DelayedFallback delay={10} size="sm" />);

      await waitFor(() => {
        const spinner = screen.getByRole('status');
        expect(spinner).toHaveClass('spinner');
        expect(spinner).toHaveStyle({ '--ui-spinner-size': '1rem' });
      });
    });
  });

  describe('custom fallback', () => {
    it('should render custom children instead of default', async () => {
      render(
        <DelayedFallback delay={10}>
          <div>Custom loading...</div>
        </DelayedFallback>,
      );

      await waitFor(() => {
        expect(screen.getByText('Custom loading...')).toBeInTheDocument();
      });
    });

    it('should render complex custom content', async () => {
      render(
        <DelayedFallback delay={10}>
          <div>
            <h2>Loading</h2>
            <p>Please wait...</p>
          </div>
        </DelayedFallback>,
      );

      await waitFor(() => {
        expect(screen.getByText('Loading')).toBeInTheDocument();
        expect(screen.getByText('Please wait...')).toBeInTheDocument();
      });
    });

    it('should render custom skeleton', async () => {
      render(
        <DelayedFallback delay={10}>
          <div className="skeleton-box" data-testid="skeleton" />
        </DelayedFallback>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('skeleton')).toBeInTheDocument();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle delay of 0', async () => {
      render(<DelayedFallback delay={0} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('should handle empty string text', async () => {
      render(<DelayedFallback delay={10} text="" />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('should not crash with null children', async () => {
      render(<DelayedFallback delay={10}>{null}</DelayedFallback>);

      // Should render default fallback
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('should not crash with undefined children', async () => {
      render(<DelayedFallback delay={10}>{undefined}</DelayedFallback>);

      // Should render default fallback
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });
  });

  describe('cleanup', () => {
    it('should cleanup timer on unmount before delay', () => {
      vi.useFakeTimers();

      const { unmount } = render(<DelayedFallback delay={1000} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      unmount();

      vi.advanceTimersByTime(1000);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('should cleanup timer on unmount after delay', async () => {
      const { unmount } = render(<DelayedFallback delay={10} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      unmount();

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('Suspense integration', () => {
    it('should work as Suspense fallback', () => {
      const LazyComponent = (): ReactElement => <div>Loaded!</div>;

      render(
        <Suspense fallback={<DelayedFallback delay={10} />}>
          <LazyComponent />
        </Suspense>,
      );

      // Component loads immediately in test, so we should see it
      expect(screen.getByText('Loaded!')).toBeInTheDocument();
    });
  });
});
