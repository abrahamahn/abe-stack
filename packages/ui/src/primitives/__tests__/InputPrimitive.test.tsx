// packages/ui/src/primitives/__tests__/InputPrimitive.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InputPrimitive } from '../InputPrimitive';

describe('InputPrimitive', () => {
  it('renders an input by default', () => {
    render(<InputPrimitive placeholder="Name" />);

    const input = screen.getByPlaceholderText('Name');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveClass('ui-input');
  });

  it('supports custom element', () => {
    render(<InputPrimitive as="textarea" placeholder="Notes" />);

    const textarea = screen.getByPlaceholderText('Notes');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('forwards className and ref', () => {
    const ref = { current: null };
    render(<InputPrimitive ref={ref} className="custom-input" aria-label="Email" />);

    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveClass('custom-input');
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
