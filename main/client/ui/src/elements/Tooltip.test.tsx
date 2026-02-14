// main/client/ui/src/elements/Tooltip.test.tsx
/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children without tooltip content initially', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );

    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
  });

  it('shows tooltip on mouse enter and hides after delay on mouse leave', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );

    const wrapper = screen.getByText('Hover me').closest('.tooltip');
    expect(wrapper).toBeDefined();
    if (wrapper == null) return;

    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText('Tooltip text')).toBeInTheDocument();

    fireEvent.mouseLeave(wrapper);
    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
  });

  it('applies placement data attribute with default of top', () => {
    const { rerender } = render(
      <Tooltip content="Info">
        <span>Text</span>
      </Tooltip>,
    );

    expect(screen.getByText('Text').closest('.tooltip')).toHaveAttribute('data-placement', 'top');

    rerender(
      <Tooltip content="Info" placement="bottom">
        <span>Text</span>
      </Tooltip>,
    );

    expect(screen.getByText('Text').closest('.tooltip')).toHaveAttribute(
      'data-placement',
      'bottom',
    );
  });

  it('cancels hide timeout when re-entering before delay completes', () => {
    render(
      <Tooltip content="Cancel hide">
        <span>Trigger</span>
      </Tooltip>,
    );

    const wrapper = screen.getByText('Trigger').parentElement;
    expect(wrapper).toBeDefined();
    if (wrapper == null) return;

    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);
    act(() => {
      vi.advanceTimersByTime(40);
    });
    fireEvent.mouseEnter(wrapper);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText('Cancel hide')).toBeInTheDocument();
  });
});
