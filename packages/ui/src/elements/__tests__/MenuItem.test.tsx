// packages/ui/src/elements/__tests__/MenuItem.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MenuItem } from '../MenuItem';

describe('MenuItem', () => {
  it('renders a button with default type="button"', () => {
    render(<MenuItem>Item</MenuItem>);

    const button = screen.getByRole('button', { name: 'Item' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('ui-menu-item');
  });

  it('respects custom type and merges className', () => {
    render(
      <MenuItem type="submit" className="custom-item">
        Submit
      </MenuItem>,
    );

    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveClass('ui-menu-item');
    expect(button).toHaveClass('custom-item');
  });

  it('handles click events and forwards ref', () => {
    const onClick = vi.fn();
    const ref = { current: null };
    render(
      <MenuItem ref={ref} onClick={onClick}>
        Action
      </MenuItem>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Action' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
