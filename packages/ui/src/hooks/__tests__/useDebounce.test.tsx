// packages/ui/src/hooks/__tests__/useDebounce.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDebounce } from '../useDebounce';

import type { ReactElement } from 'react';

function DebounceHarness(props: { value: string; delay?: number }): ReactElement {
  const debounced = useDebounce(props.value, props.delay);
  return <span data-testid="value">{debounced}</span>;
}

describe('useDebounce', () => {
  it('delays updates until the timeout elapses', () => {
    vi.useFakeTimers();
    const { rerender } = render(<DebounceHarness value="a" delay={200} />);

    rerender(<DebounceHarness value="b" delay={200} />);
    expect(screen.getByTestId('value')).toHaveTextContent('a');

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(screen.getByTestId('value')).toHaveTextContent('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByTestId('value')).toHaveTextContent('b');

    vi.useRealTimers();
  });
});
