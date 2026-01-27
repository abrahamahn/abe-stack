// packages/ui/src/elements/__tests__/Checkbox.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders with label and toggles on click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<Checkbox label="Accept terms" onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Accept terms')).toBeInTheDocument();

    await user.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(true);
    expect(checkbox).toBeChecked();
  });

  it('works in controlled mode', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<Checkbox checked={false} onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(<Checkbox checked={true} onChange={onChange} />);
    expect(checkbox).toBeChecked();
  });

  it('respects defaultChecked and disabled states', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<Checkbox defaultChecked />);
    expect(screen.getByRole('checkbox')).toBeChecked();

    rerender(<Checkbox disabled onChange={onChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('forwards ref and merges className', () => {
    const ref = { current: null };
    render(<Checkbox ref={ref} className="custom" />);

    const label = document.querySelector('.checkbox');
    expect(label).toHaveClass('checkbox');
    expect(label).toHaveClass('custom');
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('shows checkmark indicator when checked', async () => {
    const user = userEvent.setup();
    render(<Checkbox />);

    const indicator = document.querySelector('.checkbox-box');
    expect(indicator).toHaveAttribute('data-checked', 'false');

    await user.click(screen.getByRole('checkbox'));

    expect(indicator).toHaveAttribute('data-checked', 'true');
    expect(indicator).toHaveTextContent('✓');
  });

  it('toggles on Space key press', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Checkbox onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox');
    checkbox.focus();
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles on Enter key press', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Checkbox onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox');
    checkbox.focus();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders without label when not provided', () => {
    render(<Checkbox />);

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(document.querySelector('.checkbox-label')).not.toBeInTheDocument();
  });
});
