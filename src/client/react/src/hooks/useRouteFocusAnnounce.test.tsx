// src/client/react/src/hooks/useRouteFocusAnnounce.test.tsx
/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LiveRegion } from '../components/LiveRegion';
import { MemoryRouter, Route, Routes } from '../router';

import { useRouteFocusAnnounce } from './useRouteFocusAnnounce';

import type { ReactElement } from 'react';
/** Test component that calls useRouteFocusAnnounce */
const Announcer = (): ReactElement => {
  useRouteFocusAnnounce();
  return <div data-testid="announcer">Announcer active</div>;
};

describe('useRouteFocusAnnounce', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders without error when wrapped in LiveRegion and Router', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LiveRegion>
          <Routes>
            <Route path="/" element={<Announcer />} />
          </Routes>
        </LiveRegion>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('announcer')).toBeInTheDocument();
  });

  it('does not announce on initial mount', () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/']}>
        <LiveRegion>
          <Routes>
            <Route path="/" element={<Announcer />} />
          </Routes>
        </LiveRegion>
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    const politeRegion = screen.getByRole('status');
    expect(politeRegion).toHaveTextContent('');
  });
});
