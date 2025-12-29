/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Popover } from '../Popover';

describe('Popover', () => {
  it('opens on trigger click and closes on Escape, returning focus', () => {
    render(<Popover trigger={<span>Show</span>}>Popover content</Popover>);

    expect(screen.queryByText(/popover content/i)).not.toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Show' });
    fireEvent.click(trigger);
    expect(screen.getByText(/popover content/i)).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByText(/popover content/i)).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('toggles via keyboard and updates aria-expanded', () => {
    render(<Popover trigger={<span>Show</span>}>Popover content</Popover>);

    const trigger = screen.getByRole('button', { name: 'Show' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByText(/popover content/i)).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(trigger, { key: ' ' });
    expect(screen.queryByText(/popover content/i)).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
