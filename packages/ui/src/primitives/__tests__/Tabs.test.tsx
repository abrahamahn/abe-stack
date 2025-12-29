/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from '../Tabs';

const items = [
  { id: 'a', label: 'Tab A', content: 'Content A' },
  { id: 'b', label: 'Tab B', content: 'Content B' },
];

describe('Tabs', () => {
  it('renders default tab and switches on click', () => {
    render(<Tabs items={items} defaultValue="a" />);

    expect(screen.getByRole('tab', { name: /tab a/i })).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('Content A')).toBeInTheDocument();
    expect(screen.queryByText('Content B')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /tab b/i }));
    expect(screen.getByRole('tab', { name: /tab b/i })).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('Content B')).toBeInTheDocument();
    expect(screen.queryByText('Content A')).not.toBeInTheDocument();
  });

  it('moves focus/active with arrow keys', () => {
    render(<Tabs items={items} defaultValue="a" />);

    const tabA = screen.getByRole('tab', { name: /tab a/i });
    const tabB = screen.getByRole('tab', { name: /tab b/i });

    tabA.focus();
    fireEvent.keyDown(tabA, { key: 'ArrowRight' });
    expect(tabB).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('Content B')).toBeInTheDocument();

    fireEvent.keyDown(tabB, { key: 'ArrowLeft' });
    expect(tabA).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('Content A')).toBeInTheDocument();
  });

  it('calls onChange for keyboard navigation', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} defaultValue="a" onChange={onChange} />);

    const tabA = screen.getByRole('tab', { name: /tab a/i });
    fireEvent.keyDown(tabA, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('b');

    const tabB = screen.getByRole('tab', { name: /tab b/i });
    fireEvent.keyDown(tabB, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('a');
  });
});
