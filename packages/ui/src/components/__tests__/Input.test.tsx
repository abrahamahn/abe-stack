// packages/ui/src/components/__tests__/Input.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from '../Input';

describe('Input', () => {
  it('wires label and description to the input', () => {
    render(<Input label="Name" description="Helper" />);

    const input = screen.getByLabelText('Name');
    const description = screen.getByText('Helper');
    expect(input).toHaveAttribute('aria-describedby', description.id);
  });

  it('uses error messaging when provided', () => {
    render(<Input label="Email" error="Required" />);

    const input = screen.getByLabelText('Email');
    const error = screen.getByText('Required');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });
});
