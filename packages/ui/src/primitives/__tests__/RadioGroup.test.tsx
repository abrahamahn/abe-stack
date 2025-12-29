// packages/ui/src/primitives/__tests__/RadioGroup.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { Radio } from '../Radio';
import { RadioGroup } from '../RadioGroup';

function RadioGroupHarness(): ReactElement {
  const [value, setValue] = useState<'a' | 'b'>('a');
  return (
    <RadioGroup name="group" aria-label="Options">
      <Radio
        name="group"
        label="First"
        checked={value === 'a'}
        onChange={() => {
          setValue('a');
        }}
      />
      <Radio
        name="group"
        label="Second"
        checked={value === 'b'}
        onChange={() => {
          setValue('b');
        }}
      />
    </RadioGroup>
  );
}

describe('RadioGroup', () => {
  it('moves selection with arrow keys', () => {
    render(<RadioGroupHarness />);

    const group = screen.getByRole('radiogroup');
    const first = screen.getByLabelText('First');
    const second = screen.getByLabelText('Second');

    first.focus();
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(second).toBeChecked();

    second.focus();
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(first).toBeChecked();
  });
});
