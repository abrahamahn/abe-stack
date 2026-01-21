// packages/ui/src/elements/__tests__/PasswordInput.test.tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PasswordInput } from '../PasswordInput';

describe('PasswordInput', () => {
  it('renders a password input by default', () => {
    render(<PasswordInput placeholder="Enter password" />);

    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveClass('input');
    expect(input).toHaveClass('password-input');
  });

  it('renders with label', () => {
    render(<PasswordInput label="Password" />);

    const input = screen.getByLabelText('Password');
    expect(input).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<PasswordInput label="Password" description="Minimum 8 characters" />);

    expect(screen.getByText('Minimum 8 characters')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<PasswordInput label="Password" error="Password is required" />);

    const error = screen.getByText('Password is required');
    expect(error).toBeInTheDocument();

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows error and uses error for aria-describedby when both provided', () => {
    render(
      <PasswordInput id="pwd" label="Password" description="Helper text" error="Error text" />,
    );

    const input = screen.getByLabelText('Password');
    // Both error and description are visible in the DOM
    expect(screen.getByText('Error text')).toBeInTheDocument();
    expect(screen.getByText('Helper text')).toBeInTheDocument();
    // Input aria-describedby points to error when error is present
    expect(input).toHaveAttribute('aria-describedby', 'pwd-err');
  });

  describe('visibility toggle', () => {
    it('shows toggle button by default', () => {
      render(<PasswordInput label="Password" />);

      const toggleButton = screen.getByRole('button', { name: 'Show password' });
      expect(toggleButton).toBeInTheDocument();
    });

    it('hides toggle button when showToggle is false', () => {
      render(<PasswordInput label="Password" showToggle={false} />);

      expect(screen.queryByRole('button', { name: 'Show password' })).not.toBeInTheDocument();
    });

    it('toggles password visibility on button click', () => {
      render(<PasswordInput label="Password" />);

      const input = screen.getByLabelText('Password');
      const toggleButton = screen.getByRole('button', { name: 'Show password' });

      expect(input).toHaveAttribute('type', 'password');

      fireEvent.click(toggleButton);

      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));

      expect(input).toHaveAttribute('type', 'password');
    });
  });

  describe('controlled and uncontrolled modes', () => {
    it('works as uncontrolled input', () => {
      render(<PasswordInput label="Password" />);

      const input = screen.getByLabelText('Password');
      fireEvent.change(input, { target: { value: 'mypassword' } });

      expect(input).toHaveValue('mypassword');
    });

    it('works as controlled input', () => {
      const onChange = vi.fn();
      render(<PasswordInput label="Password" value="controlled" onChange={onChange} />);

      const input = screen.getByLabelText('Password');
      expect(input).toHaveValue('controlled');

      fireEvent.change(input, { target: { value: 'newvalue' } });
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('password strength', () => {
    it('does not show strength indicator by default', () => {
      render(<PasswordInput label="Password" value="password123" />);

      expect(screen.queryByText(/very weak|weak|fair|good|strong/i)).not.toBeInTheDocument();
    });

    it('shows strength indicator when showStrength is true and has value', () => {
      render(<PasswordInput label="Password" value="Password123!" showStrength />);

      // The strength indicator should be visible
      const strengthContainer = document.querySelector('.password-strength');
      expect(strengthContainer).toBeInTheDocument();
    });

    it('does not show strength indicator for empty password', () => {
      render(<PasswordInput label="Password" value="" showStrength />);

      const strengthContainer = document.querySelector('.password-strength');
      expect(strengthContainer).not.toBeInTheDocument();
    });

    it('updates strength when password changes', () => {
      const { rerender } = render(<PasswordInput label="Password" value="a" showStrength />);

      const strengthContainer = document.querySelector('.password-strength');
      expect(strengthContainer).toBeInTheDocument();

      rerender(<PasswordInput label="Password" value="Password123!@#$%" showStrength />);

      expect(document.querySelector('.password-strength')).toBeInTheDocument();
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<PasswordInput ref={ref} label="Password" />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.type).toBe('password');
    });
  });

  describe('custom props', () => {
    it('passes through additional input props', () => {
      render(
        <PasswordInput
          label="Password"
          name="password"
          required
          autoComplete="current-password"
          disabled
        />,
      );

      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('name', 'password');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('autocomplete', 'current-password');
      expect(input).toBeDisabled();
    });

    it('accepts custom className', () => {
      render(<PasswordInput label="Password" className="custom-class" />);

      const input = screen.getByLabelText('Password');
      expect(input).toHaveClass('custom-class');
      expect(input).toHaveClass('input');
      expect(input).toHaveClass('password-input');
    });

    it('accepts custom id', () => {
      render(<PasswordInput id="my-password" label="Password" />);

      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('id', 'my-password');
    });
  });

  describe('accessibility', () => {
    it('associates label with input', () => {
      render(<PasswordInput label="Password" />);

      const input = screen.getByLabelText('Password');
      expect(input).toBeInTheDocument();
    });

    it('sets aria-describedby for description', () => {
      render(<PasswordInput id="pwd" label="Password" description="Use a strong password" />);

      const input = screen.getByLabelText('Password');
      const description = screen.getByText('Use a strong password');

      expect(input).toHaveAttribute('aria-describedby', 'pwd-desc');
      expect(description).toHaveAttribute('id', 'pwd-desc');
    });

    it('sets aria-describedby for error', () => {
      render(<PasswordInput id="pwd" label="Password" error="Invalid password" />);

      const input = screen.getByLabelText('Password');
      const error = screen.getByText('Invalid password');

      expect(input).toHaveAttribute('aria-describedby', 'pwd-err');
      expect(error).toHaveAttribute('id', 'pwd-err');
    });

    it('sets aria-invalid when error is present', () => {
      render(<PasswordInput label="Password" error="Error" />);

      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('toggle button has accessible label', () => {
      render(<PasswordInput label="Password" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Show password');
    });
  });
});
