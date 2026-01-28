// packages/ui/src/hooks/useWindowSize.test.tsx
/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useWindowSize } from './useWindowSize';

import type { ReactElement } from 'react';

const WindowSizeHarness = (): ReactElement => {
  const { width, height } = useWindowSize();
  return (
    <span data-testid="size">
      {width}x{height}
    </span>
  );
};

describe('useWindowSize', () => {
  it('updates after debounced resize events', () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });

    render(<WindowSizeHarness />);
    expect(screen.getByTestId('size')).toHaveTextContent('800x600');

    act(() => {
      window.innerWidth = 1024;
      window.innerHeight = 768;
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByTestId('size')).toHaveTextContent('1024x768');
    vi.useRealTimers();
  });

  it('uses the latest size after rapid resize bursts', () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 400, writable: true });

    render(<WindowSizeHarness />);
    expect(screen.getByTestId('size')).toHaveTextContent('500x400');

    act(() => {
      window.innerWidth = 640;
      window.innerHeight = 480;
      window.dispatchEvent(new Event('resize'));
      window.innerWidth = 800;
      window.innerHeight = 600;
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(149);
    });

    expect(screen.getByTestId('size')).toHaveTextContent('500x400');

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByTestId('size')).toHaveTextContent('800x600');
    vi.useRealTimers();
  });
});
