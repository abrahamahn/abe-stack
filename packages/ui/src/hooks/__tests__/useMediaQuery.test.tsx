// packages/ui/src/hooks/__tests__/useMediaQuery.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useMediaQuery } from '../useMediaQuery';

import type { ReactElement } from 'react';

type MatchMediaListener = () => void;

function createMatchMedia(initialMatches: boolean): {
  matchMedia: (query: string) => MediaQueryList;
  setMatches: (next: boolean) => void;
  fireChange: () => void;
} {
  let matches = initialMatches;
  let listener: MatchMediaListener | null = null;
  const mql = {
    get matches() {
      return matches;
    },
    media: '',
    onchange: null,
    addEventListener: (_event: string, cb: MatchMediaListener) => {
      listener = cb;
    },
    removeEventListener: () => {
      listener = null;
    },
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
  };
}

function MediaQueryHarness(props: { query: string }): ReactElement {
  const matches = useMediaQuery(props.query);
  return <span data-testid="matches">{String(matches)}</span>;
}

describe('useMediaQuery', () => {
  it('reflects matchMedia results and updates on change', () => {
    const originalMatchMedia = window.matchMedia;
    const media = createMatchMedia(false);
    window.matchMedia = media.matchMedia;

    const { rerender } = render(<MediaQueryHarness query="(min-width: 600px)" />);
    expect(screen.getByTestId('matches')).toHaveTextContent('false');

    media.setMatches(true);
    act(() => {
      media.fireChange();
    });
    rerender(<MediaQueryHarness query="(min-width: 600px)" />);
    expect(screen.getByTestId('matches')).toHaveTextContent('true');

    window.matchMedia = originalMatchMedia;
  });
});
