/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Select } from '../primitives/Select';

describe('Select', () => {
  it('changes value on selection', () => {
    const handleChange = vi.fn();
    render(
      <Select aria-label="Simple Select" onChange={handleChange} defaultValue="one">
        <option value="one">One</option>
        <option value="two">Two</option>
      </Select>,
    );

    const select = screen.getByLabelText<HTMLSelectElement>(/simple select/i);
    fireEvent.change(select, { target: { value: 'two' } });
    expect(select.value).toBe('two');
    expect(handleChange).toHaveBeenCalled();
  });
});
