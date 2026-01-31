// shared/ui/src/components/LiveRegion.test.tsx
/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveRegion, useAnnounce } from './LiveRegion';

import type { ReactElement } from 'react';

/** Test harness that exposes the announce function */
const AnnounceButton = ({
  message,
  politeness,
}: {
  message: string;
  politeness?: 'polite' | 'assertive';
}): ReactElement => {
  const { announce } = useAnnounce();
  return (
    <button
      type="button"
      onClick={() => {
        announce(message, politeness);
      }}
    >
      Announce
    </button>
  );
};

describe('LiveRegion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders children', () => {
    render(
      <LiveRegion>
        <div>Child content</div>
      </LiveRegion>,
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders polite and assertive aria-live regions', () => {
    render(
      <LiveRegion>
        <div>Content</div>
      </LiveRegion>,
    );

    const politeRegion = screen.getByRole('status');
    expect(politeRegion).toHaveAttribute('aria-live', 'polite');

    const assertiveRegion = screen.getByRole('alert');
    expect(assertiveRegion).toHaveAttribute('aria-live', 'assertive');
  });

  it('announces polite message into the polite region', () => {
    render(
      <LiveRegion>
        <AnnounceButton message="Polite announcement" />
      </LiveRegion>,
    );

    act(() => {
      screen.getByText('Announce').click();
    });

    // Advance past the 50ms setTimeout for the text swap
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const politeRegion = screen.getByRole('status');
    expect(politeRegion).toHaveTextContent('Polite announcement');
  });

  it('announces assertive message into the assertive region', () => {
    render(
      <LiveRegion>
        <AnnounceButton message="Assertive announcement" politeness="assertive" />
      </LiveRegion>,
    );

    act(() => {
      screen.getByText('Announce').click();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    const assertiveRegion = screen.getByRole('alert');
    expect(assertiveRegion).toHaveTextContent('Assertive announcement');
  });

  it('clears announcement after 7 seconds', () => {
    render(
      <LiveRegion>
        <AnnounceButton message="Temporary message" />
      </LiveRegion>,
    );

    act(() => {
      screen.getByText('Announce').click();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    const politeRegion = screen.getByRole('status');
    expect(politeRegion).toHaveTextContent('Temporary message');

    act(() => {
      vi.advanceTimersByTime(7000);
    });

    expect(politeRegion).toHaveTextContent('');
  });
});

describe('useAnnounce', () => {
  it('throws when used outside LiveRegion', () => {
    const BadComponent = (): ReactElement => {
      useAnnounce();
      return <div />;
    };

    // Suppress console.error from React error boundary
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<BadComponent />);
    }).toThrow('useAnnounce must be used within a <LiveRegion> provider');

    console.error = originalError;
  });
});
