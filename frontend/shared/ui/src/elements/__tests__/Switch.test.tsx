// packages/ui/src/elements/__tests__/Switch.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from '../Switch';

describe('Switch', () => {
  it('renders with default state and toggles on click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch onChange={onChange} />);

    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('aria-checked', 'false');
    expect(switchElement).toHaveAttribute('type', 'button');

    await user.click(switchElement);

    expect(onChange).toHaveBeenCalledWith(true);
    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  it('works in controlled mode', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<Switch checked={false} onChange={onChange} />);

    const switchElement = screen.getByRole('switch');
    await user.click(switchElement);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(<Switch checked={true} onChange={onChange} />);
    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  it('respects defaultChecked and disabled states', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<Switch defaultChecked />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');

    rerender(<Switch disabled onChange={onChange} />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeDisabled();
    await user.click(switchElement);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('forwards ref and merges className', () => {
    const ref = { current: null };
    render(<Switch ref={ref} className="custom" />);

    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveClass('switch');
    expect(switchElement).toHaveClass('custom');
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
