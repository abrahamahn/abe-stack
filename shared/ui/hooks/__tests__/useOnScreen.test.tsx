// packages/ui/src/hooks/__tests__/useOnScreen.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { useRef, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { useOnScreen } from '../useOnScreen';

type ObserverCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;

class FakeIntersectionObserver {
  private callback: ObserverCallback;
  constructor(callback: ObserverCallback) {
    this.callback = callback;
  }
  observe(): void {
    this.callback([{ isIntersecting: true }]);
  }
  disconnect(): void {}
}

function OnScreenHarness(): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  const visible = useOnScreen(ref);
  return (
    <div>
      <div ref={ref} data-testid="target" />
      <span data-testid="visible">{String(visible)}</span>
    </div>
  );
}

describe('useOnScreen', () => {
  it('sets visible when intersection observer reports visibility', () => {
    const originalObserver = window.IntersectionObserver;
    // @ts-expect-error intersection observer is stubbed for unit tests
    window.IntersectionObserver = FakeIntersectionObserver;

    render(<OnScreenHarness />);
    expect(screen.getByTestId('visible')).toHaveTextContent('true');

    window.IntersectionObserver = originalObserver;
  });

  it('stays false when intersection observer reports not visible', () => {
    const originalObserver = window.IntersectionObserver;
    class HiddenIntersectionObserver {
      private callback: ObserverCallback;
      constructor(callback: ObserverCallback) {
        this.callback = callback;
      }
      observe(): void {
        this.callback([{ isIntersecting: false }]);
      }
      disconnect(): void {}
    }
    // @ts-expect-error intersection observer is stubbed for unit tests
    window.IntersectionObserver = HiddenIntersectionObserver;

    render(<OnScreenHarness />);
    expect(screen.getByTestId('visible')).toHaveTextContent('false');

    window.IntersectionObserver = originalObserver;
  });

  it('remains false when IntersectionObserver is unavailable', () => {
    const originalObserver = window.IntersectionObserver;
    // @ts-expect-error simulate missing observer
    window.IntersectionObserver = undefined;

    render(<OnScreenHarness />);
    expect(screen.getByTestId('visible')).toHaveTextContent('false');

    window.IntersectionObserver = originalObserver;
  });
});
