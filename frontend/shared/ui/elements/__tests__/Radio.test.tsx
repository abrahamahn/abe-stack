// packages/ui/src/elements/__tests__/Radio.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Radio } from '../Radio';

function RadioHarness(): ReactElement {
  const [value, setValue] = useState<'a' | 'b'>('a');
  return (
    <div>
      <Radio name="group" label="Option A" checked={value === 'a'} onChange={() => { setValue('a'); }} />
      <Radio name="group" label="Option B" checked={value === 'b'} onChange={() => { setValue('b'); }} />
    </div>
  );
}

describe('Radio', () => {
  it('renders with label and handles click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<Radio name="test" label="Test Option" onChange={onChange} />);

    const radio = screen.getByLabelText('Test Option');
    expect(radio).toBeInTheDocument();
    expect(radio).not.toBeChecked();

    await user.click(radio);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('respects checked and disabled states', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<Radio name="test" label="Test" checked />);
    expect(screen.getByLabelText('Test')).toBeChecked();

    rerender(<Radio name="test" label="Test" checked={false} disabled onChange={onChange} />);
    await user.click(screen.getByLabelText('Test'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows visual indicator when checked', () => {
    const { container, rerender } = render(<Radio name="test" label="Visual" checked />);
    expect(container.querySelector('.ui-radio-dot')).toBeInTheDocument();

    rerender(<Radio name="test" label="Visual" checked={false} />);
    expect(container.querySelector('.ui-radio-dot')).not.toBeInTheDocument();
  });

  it('switches selection in a group', async () => {
    const user = userEvent.setup();

    render(<RadioHarness />);

    const optionA = screen.getByLabelText(/option a/i);
    const optionB = screen.getByLabelText(/option b/i);

    expect(optionA).toBeChecked();
    expect(optionB).not.toBeChecked();

    await user.click(optionB);
    expect(optionB).toBeChecked();
    expect(optionA).not.toBeChecked();
  });

  it('forwards ref and merges className', () => {
    const ref = { current: null };
    render(<Radio ref={ref} name="test" label="Styled" className="custom" />);

    const label = screen.getByText('Styled').closest('label');
    expect(label).toHaveClass('ui-radio');
    expect(label).toHaveClass('custom');
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
