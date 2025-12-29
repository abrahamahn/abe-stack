/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Select } from '../Select';

describe('Select', () => {
  it('changes value on selection', () => {
    const handleChange = vi.fn();
    render(
      <Select aria-label="Simple Select" onChange={handleChange} defaultValue="one">
        <option value="one">One</option>
        <option value="two">Two</option>
      </Select>,
    );

    const trigger = screen.getByRole('button', { name: /simple select/i });
    fireEvent.click(trigger);

    const option = screen.getByRole('option', { name: 'Two' });
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith('two');
    expect(trigger).toHaveTextContent('Two');
  });

  it('supports keyboard selection when open', () => {
    const handleChange = vi.fn();
    render(
      <Select aria-label="Keyboard Select" onChange={handleChange} defaultValue="one">
        <option value="one">One</option>
        <option value="two">Two</option>
      </Select>,
    );

    const trigger = screen.getByRole('button', { name: /keyboard select/i });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith('one');
  });
});
