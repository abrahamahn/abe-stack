// main/client/ui/src/components/FormField.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { FormField } from './FormField';

describe('FormField', () => {
  it('renders label and children', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" type="email" />
      </FormField>,
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(
      <FormField label="Password" htmlFor="password" required>
        <input id="password" type="password" />
      </FormField>,
    );
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveClass('form-field-required');
  });

  it('does not show required indicator when not required', () => {
    render(
      <FormField label="Optional" htmlFor="optional">
        <input id="optional" />
      </FormField>,
    );
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('displays error message with role alert', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Email is required">
        <input id="email" />
      </FormField>,
    );
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Email is required');
    expect(error).toHaveClass('form-field-error');
  });

  it('displays helper text when no error', () => {
    render(
      <FormField label="Email" htmlFor="email" description="We'll never share your email">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText("We'll never share your email")).toBeInTheDocument();
    expect(screen.getByText("We'll never share your email")).toHaveClass('form-field-helper');
  });

  it('hides helper text when error is present', () => {
    render(
      <FormField
        label="Email"
        htmlFor="email"
        error="Invalid email"
        description="We'll never share your email"
      >
        <input id="email" />
      </FormField>,
    );
    expect(screen.queryByText("We'll never share your email")).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
  });

  it('forwards className and ref', () => {
    const ref = { current: null };
    render(
      <FormField ref={ref} label="Name" htmlFor="name" className="custom-field">
        <input id="name" />
      </FormField>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass('form-field');
    expect(ref.current).toHaveClass('custom-field');
  });

  it('associates label with input via htmlFor', () => {
    render(
      <FormField label="Username" htmlFor="username">
        <input id="username" />
      </FormField>,
    );
    const label = screen.getByText('Username');
    expect(label).toHaveAttribute('for', 'username');
  });

  it('passes through additional props', () => {
    render(
      <FormField label="Test" htmlFor="test" data-testid="form-field" style={{ marginTop: 16 }}>
        <input id="test" />
      </FormField>,
    );
    const field = screen.getByTestId('form-field');
    expect(field).toHaveStyle({ marginTop: '16px' });
  });
});
