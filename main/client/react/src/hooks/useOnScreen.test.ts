// main/client/react/src/hooks/useOnScreen.test.ts
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import react, { useRef } from 'react';
import { describe, expect, it } from 'vitest';

import { useOnScreen } from './useOnScreen';

type ObserverCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
class FakeIntersectionObserver {
  private readonly callback: ObserverCallback;
  constructor(callback: ObserverCallback) {
    this.callback = callback;
  }
  observe(): void {
    this.callback([{ isIntersecting: true }]);
  }
  disconnect(): void {}
}

const OnScreenHarness = (): react.ReactElement => {
  const ref = useRef<HTMLDivElement | null>(null);
  const isVisible = useOnScreen(ref);
  return react.createElement(
    'div',
    null,
    react.createElement('div', { ref: ref, 'data-testid': 'target' }),
    react.createElement('span', { 'data-testid': 'visible' }, String(isVisible)),
  );
};

describe('useOnScreen', () => {
  it('sets visible when intersection observer reports visibility', () => {
    const originalObserver = window['IntersectionObserver'];
    (window as unknown as Record<string, unknown>)['IntersectionObserver'] =
      FakeIntersectionObserver;
    render(react.createElement(OnScreenHarness, null));
    expect(screen.getByTestId('visible')).toHaveTextContent('true');
    window['IntersectionObserver'] = originalObserver;
  });

  it('sets visible to false when not intersecting', () => {
    const originalObserver = window['IntersectionObserver'];
    class HiddenIntersectionObserver {
      private readonly callback: ObserverCallback;
      constructor(callback: ObserverCallback) {
        this.callback = callback;
      }
      observe(): void {
        this.callback([{ isIntersecting: false }]);
      }
      disconnect(): void {}
    }
    (window as unknown as Record<string, unknown>)['IntersectionObserver'] =
      HiddenIntersectionObserver;
    render(react.createElement(OnScreenHarness, null));
    expect(screen.getByTestId('visible')).toHaveTextContent('false');
    window['IntersectionObserver'] = originalObserver;
  });

  it('remains false when IntersectionObserver is unavailable', () => {
    const originalObserver = window['IntersectionObserver'];
    (window as unknown as Record<string, unknown>)['IntersectionObserver'] = undefined;
    render(react.createElement(OnScreenHarness, null));
    expect(screen.getByTestId('visible')).toHaveTextContent('false');
    window['IntersectionObserver'] = originalObserver;
  });
});
