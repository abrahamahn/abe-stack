// main/client/react/src/hooks/useOnScreen.test.ts
/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useOnScreen } from './useOnScreen';

type ObserverCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;

describe('useOnScreen', () => {
  it('sets visible when intersection observer reports visibility', () => {
    const originalObserver = window['IntersectionObserver'];
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
    (window as unknown as Record<string, unknown>)['IntersectionObserver'] =
      FakeIntersectionObserver;

    const target = document.createElement('div');
    document.body.appendChild(target);

    const { result } = renderHook(() => {
      const ref = { current: target };
      return useOnScreen(ref);
    });

    expect(result.current).toBe(true);

    document.body.removeChild(target);
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

    const target = document.createElement('div');
    document.body.appendChild(target);

    const { result } = renderHook(() => {
      const ref = { current: target };
      return useOnScreen(ref);
    });

    expect(result.current).toBe(false);

    document.body.removeChild(target);
    window['IntersectionObserver'] = originalObserver;
  });

  it('remains false when IntersectionObserver is unavailable', () => {
    const originalObserver = window['IntersectionObserver'];
    (window as unknown as Record<string, unknown>)['IntersectionObserver'] = undefined;

    const target = document.createElement('div');
    document.body.appendChild(target);

    const { result } = renderHook(() => {
      const ref = { current: target };
      return useOnScreen(ref);
    });

    act(() => {});
    expect(result.current).toBe(false);

    document.body.removeChild(target);
    window['IntersectionObserver'] = originalObserver;
  });
});
