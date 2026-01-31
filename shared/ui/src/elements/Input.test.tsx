// shared/ui/src/elements/Input.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './Input';

describe('Input', () => {
  it('renders an input by default', () => {
    render(<Input placeholder="Name" />);

    const input = screen.getByPlaceholderText('Name');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveClass('input');
  });

  it('renders as different element with as prop', () => {
    render(<Input as="textarea" placeholder="Notes" />);

    const textarea = screen.getByPlaceholderText('Notes');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveClass('input');
  });

  it('merges className and forwards ref', () => {
    const ref = { current: null };
    render(<Input ref={ref} className="custom" aria-label="Email" />);

    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveClass('input');
    expect(input).toHaveClass('custom');
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

describe('Input.Field', () => {
  it('wires label and description to the input', () => {
    render(<Input.Field label="Name" description="Helper" />);

    const input = screen.getByLabelText('Name');
    const description = screen.getByText('Helper');
    expect(input).toHaveAttribute('aria-describedby', description.id);
  });

  it('uses error messaging when provided', () => {
    render(<Input.Field label="Email" error="Required" />);

    const input = screen.getByLabelText('Email');
    const error = screen.getByText('Required');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('prefers error over description for aria-describedby', () => {
    render(<Input.Field id="email" label="Email" description="Helper" error="Required" />);

    const input = screen.getByLabelText('Email');
    const description = screen.getByText('Helper');
    const error = screen.getByText('Required');

    expect(description).toHaveAttribute('id', 'email-desc');
    expect(error).toHaveAttribute('id', 'email-err');
    expect(input).toHaveAttribute('aria-describedby', 'email-err');
  });

  it('renders without a label', () => {
    render(<Input.Field placeholder="No label" />);

    const input = screen.getByPlaceholderText('No label');
    expect(input).toBeInTheDocument();
    expect(screen.queryByLabelText('No label')).not.toBeInTheDocument();
  });

  it('supports custom element types', () => {
    render(<Input.Field as="textarea" label="Notes" />);

    const input = screen.getByLabelText('Notes');
    expect(input.tagName.toLowerCase()).toBe('textarea');
  });
});
