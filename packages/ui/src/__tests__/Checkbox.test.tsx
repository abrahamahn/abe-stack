/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from '../primitives/Checkbox';

describe('Checkbox', () => {
  it('toggles on click and space key', () => {
    const onChange = vi.fn();
    render(<Checkbox checked={false} onCheckedChange={onChange} label="Check me" />);

    const label = screen.getByText(/check me/i);
    fireEvent.click(label);
    expect(onChange).toHaveBeenCalledWith(true);

    const input = screen.getByRole('checkbox');
    input.focus();
    fireEvent.keyDown(input, { key: ' ' });
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
