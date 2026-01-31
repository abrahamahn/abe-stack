// client/ui/src/hooks/useMediaQuery.test.ts
/** @vitest-environment jsdom */
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from './useMediaQuery';

type MatchMediaListener = () => void;
function createMatchMedia(initialMatches: boolean): {
  matchMedia: (query: string) => MediaQueryList;
  setMatches: (next: boolean) => void;
  fireChange: () => void;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
} {
  let matches = initialMatches;
  let listener: MatchMediaListener | null = null;
  const addEventListener = vi.fn((_event: string, cb: MatchMediaListener) => {
    listener = cb;
  });
  const removeEventListener = vi.fn(() => {
    listener = null;
  });
  const mql = {
    get matches() {
      return matches;
    },
    media: '',
    onchange: null,
    addEventListener,
    removeEventListener,
    dispatchEvent: () => {
      listener?.();
      return true;
    },
    addListener: () => {},
    removeListener: () => {},
  } as unknown as MediaQueryList;
  return {
    matchMedia: () => mql,
    setMatches: (next: boolean): void => {
      matches = next;
    },
    fireChange: (): void => {
      listener?.();
    },
    addEventListener,
    removeEventListener,
  };
}
const MediaQueryHarness = (props: { query: string }): React.ReactElement => {
  const matches = useMediaQuery(props.query);
  return React.createElement('span', { 'data-testid': 'matches' }, String(matches));
};
describe('useMediaQuery', () => {
  it('reflects matchMedia results and updates on change', () => {
    const originalMatchMedia = window.matchMedia;
    const media = createMatchMedia(false);
    window.matchMedia = media.matchMedia;
    const { rerender } = render(
      React.createElement(MediaQueryHarness, { query: '(min-width: 600px)' }),
    );
    expect(screen.getByTestId('matches')).toHaveTextContent('false');
    media.setMatches(true);
    act(() => {
      media.fireChange();
    });
    rerender(React.createElement(MediaQueryHarness, { query: '(min-width: 600px)' }));
    expect(screen.getByTestId('matches')).toHaveTextContent('true');
    window.matchMedia = originalMatchMedia;
  });
  it('cleans up event listeners on unmount and query change', () => {
    const originalMatchMedia = window.matchMedia;
    const media = createMatchMedia(true);
    window.matchMedia = media.matchMedia;
    const { rerender, unmount } = render(
      React.createElement(MediaQueryHarness, { query: '(min-width: 600px)' }),
    );
    expect(media.addEventListener).toHaveBeenCalledTimes(1);
    rerender(React.createElement(MediaQueryHarness, { query: '(max-width: 800px)' }));
    expect(media.removeEventListener).toHaveBeenCalledTimes(1);
    unmount();
    expect(media.removeEventListener).toHaveBeenCalledTimes(2);
    window.matchMedia = originalMatchMedia;
  });
});
