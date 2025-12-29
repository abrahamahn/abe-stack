/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { Checkbox } from '../Checkbox';

function CheckboxHarness(): ReactElement {
  const [checked, setChecked] = useState(false);
  return <Checkbox checked={checked} onChange={setChecked} label="Check me" />;
}

describe('Checkbox', () => {
  it('toggles on click and space key', () => {
    render(<CheckboxHarness />);

    const input = screen.getByLabelText(/check me/i);
    fireEvent.click(input);
    expect(input).toBeChecked();

    input.focus();
    fireEvent.keyDown(input, { key: ' ' });
    expect(input).not.toBeChecked();
  });

  it('uses defaultChecked when uncontrolled', () => {
    render(<Checkbox defaultChecked label="Default" />);
    const input = screen.getByRole('checkbox');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected checkbox input element');
    }
    expect(input.checked).toBe(true);
  });
});
