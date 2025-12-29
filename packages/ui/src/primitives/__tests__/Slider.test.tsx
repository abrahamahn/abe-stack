// packages/ui/src/primitives/__tests__/Slider.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Slider } from '../Slider';

describe('Slider', () => {
  it('emits numeric values on change', () => {
    const onChange = vi.fn();
    render(<Slider defaultValue={10} onChange={onChange} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '42' } });

    expect(onChange).toHaveBeenCalledWith(42);
    expect(slider).toHaveValue('42');
  });
});
