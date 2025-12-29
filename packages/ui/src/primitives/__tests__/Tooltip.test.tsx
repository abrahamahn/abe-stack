// packages/ui/src/primitives/__tests__/Tooltip.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Tooltip } from '../Tooltip';

describe('Tooltip', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows on hover and hides after a delay', () => {
    vi.useFakeTimers();
    render(
      <Tooltip content="Helpful info">
        <button type="button">Hover me</button>
      </Tooltip>,
    );

    const trigger = screen.getByText('Hover me');
    const wrapper = trigger.parentElement;
    if (!wrapper) {
      throw new Error('Tooltip wrapper not found');
    }

    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText('Helpful info')).toBeInTheDocument();

    fireEvent.mouseLeave(wrapper);
    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(screen.queryByText('Helpful info')).not.toBeInTheDocument();
  });
});
