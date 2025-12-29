/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Radio } from '../Radio';

function RadioHarness(): ReactElement {
  const [value, setValue] = useState<'a' | 'b'>('a');
  return (
    <div>
      <Radio
        name="group"
        label="Option A"
        checked={value === 'a'}
        onChange={() => {
          setValue('a');
        }}
      />
      <Radio
        name="group"
        label="Option B"
        checked={value === 'b'}
        onChange={() => {
          setValue('b');
        }}
      />
    </div>
  );
}

describe('Radio', () => {
  it('selects on click and calls onChange', () => {
    const onSelectA = vi.fn();
    const onSelectB = vi.fn();
    render(
      <div>
        <Radio
          name="group"
          label="Option A"
          checked={true}
          onChange={() => {
            onSelectA();
          }}
        />
        <Radio
          name="group"
          label="Option B"
          checked={false}
          onChange={() => {
            onSelectB();
          }}
        />
      </div>,
    );

    const optionA = screen.getByLabelText(/option a/i);
    const optionB = screen.getByLabelText(/option b/i);

    fireEvent.click(optionA);
    expect(onSelectA).not.toHaveBeenCalled();

    fireEvent.click(optionB);
    expect(onSelectB).toHaveBeenCalled();
  });

  it('uses defaultChecked when uncontrolled', () => {
    render(<Radio name="default" label="Default" defaultChecked />);
    const input = screen.getByLabelText('Default');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected radio input element');
    }
    expect(input.checked).toBe(true);
  });

  it('switches selection when controlled by state', () => {
    render(<RadioHarness />);

    const optionA = screen.getByLabelText(/option a/i);
    const optionB = screen.getByLabelText(/option b/i);
    if (!(optionA instanceof HTMLInputElement) || !(optionB instanceof HTMLInputElement)) {
      throw new Error('Expected radio input elements');
    }

    expect(optionA).toBeChecked();
    expect(optionB).not.toBeChecked();

    fireEvent.click(optionB);
    expect(optionB).toBeChecked();
    expect(optionA).not.toBeChecked();
  });
});
