// packages/ui/src/hooks/__tests__/useWindowSize.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useWindowSize } from '../useWindowSize';

import type { ReactElement } from 'react';

function WindowSizeHarness(): ReactElement {
  const { width, height } = useWindowSize();
  return (
    <span data-testid="size">
      {width}x{height}
    </span>
  );
}

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
});
