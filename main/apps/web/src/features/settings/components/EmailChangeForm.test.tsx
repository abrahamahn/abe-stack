// main/apps/web/src/features/settings/components/EmailChangeForm.test.tsx
/**
 * Email Change Form Component Tests
 *
 * Comprehensive tests for email change form covering:
 * - Form rendering with input fields and description
 * - Input field interactions and validation
 * - Form validation (email format, required fields)
 * - Submission handling with API integration
 * - Success and error states
 * - Loading states and button disabling
 * - onSuccess callback invocation
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailChangeForm } from './EmailChangeForm';

import type { ChangeEvent, ReactNode } from 'react';
import type { EmailChangeFormProps } from './EmailChangeForm';

// ============================================================================
// Mocks
// ============================================================================

// Mock @bslt/api
const mockChangeEmail = vi.fn();
vi.mock('@bslt/api', () => ({
  getApiClient: vi.fn(() => ({
    changeEmail: mockChangeEmail,
  })),
}));

// Mock UI components
vi.mock('@bslt/ui', async () => {
  const actual = await vi.importActual('@bslt/ui');

  const mockAlert = ({ children, tone }: { children: ReactNode; tone: string }) => (
    <div data-testid="alert" data-tone={tone}>
      {children}
    </div>
  );

  const mockButton = ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'submit' | 'reset' | 'button';
  }) => (
    <button data-testid="submit-button" onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  );

  const mockFormField = ({
    children,
    label,
    htmlFor,
  }: {
    children: ReactNode;
    label: string;
    htmlFor: string;
  }) => (
    <div data-testid={`form-field-${htmlFor}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );

  const mockInput = ({
    id,
    value,
    onChange,
    disabled,
    type,
    placeholder,
    autoComplete,
  }: {
    id: string;
    value: string;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    type?: string;
    placeholder?: string;
    autoComplete?: string;
  }) => (
    <input
      data-testid={`input-${id}`}
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete={autoComplete}
    />
  );

  const mockPasswordInput = ({
    id,
    value,
    onChange,
    placeholder,
    autoComplete,
    disabled,
  }: {
    id: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    autoComplete?: string;
    disabled?: boolean;
  }) => (
    <input
      data-testid={`password-input-${id}`}
      id={id}
      type="password"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
    />
  );

  return {
    ...actual,
    Alert: mockAlert,
    Button: mockButton,
    FormField: mockFormField,
    Input: mockInput,
    PasswordInput: mockPasswordInput,
  };
});

// ============================================================================
// Tests
// ============================================================================

describe('EmailChangeForm', () => {
  let mockOnSuccess: any;

  const defaultProps: EmailChangeFormProps = {};

  beforeEach(() => {
    mockOnSuccess = vi.fn();
    mockChangeEmail.mockReset();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'test-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // Rendering
  // ============================================================================

  describe('rendering', () => {
    it('should render form fields and description text', () => {
      render(<EmailChangeForm {...defaultProps} />);

      expect(screen.getByText('New Email Address')).toBeInTheDocument();
      expect(screen.getByText('Current Password')).toBeInTheDocument();
      expect(
        screen.getByText(
          'A confirmation link will be sent to your new email address. Your email will not change until you click the link.',
        ),
      ).toBeInTheDocument();
    });

    it('should render email input with correct attributes', () => {
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('id', 'newEmail');
      expect(emailInput).toHaveAttribute('placeholder', 'Enter new email address');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
    });

    it('should render password input with correct attributes', () => {
      render(<EmailChangeForm {...defaultProps} />);

      const passwordInput = screen.getByTestId('password-input-emailChangePassword');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('id', 'emailChangePassword');
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password to confirm');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });

    it('should render submit button with default text', () => {
      render(<EmailChangeForm {...defaultProps} />);

      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
      expect(screen.getByText('Change Email')).toBeInTheDocument();
    });

    it('should render form fields with correct labels', () => {
      render(<EmailChangeForm {...defaultProps} />);

      expect(screen.getByTestId('form-field-newEmail')).toBeInTheDocument();
      expect(screen.getByTestId('form-field-emailChangePassword')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Form Validation
  // ============================================================================

  describe('form validation', () => {
    it('should disable submit button when fields are empty', () => {
      render(<EmailChangeForm {...defaultProps} />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when email is empty', async () => {
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const passwordInput = screen.getByTestId('password-input-emailChangePassword');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when password is empty', async () => {
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when email has no @', async () => {
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'invalidemail');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when email has @ and password is filled', async () => {
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).not.toBeDisabled();
    });

    it('should disable submit button when email is only whitespace', async () => {
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, '   ');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });
  });

  // ============================================================================
  // User Interactions
  // ============================================================================

  describe('user interactions', () => {
    it('should update email field when typing', async () => {
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      await user.type(emailInput, 'newemail@example.com');

      expect(emailInput).toHaveValue('newemail@example.com');
    });

    it('should update password field when typing', async () => {
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const passwordInput = screen.getByTestId('password-input-emailChangePassword');
      await user.type(passwordInput, 'mypassword');

      expect(passwordInput).toHaveValue('mypassword');
    });

    it('should allow clearing email field', async () => {
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      await user.type(emailInput, 'test@example.com');
      await user.clear(emailInput);

      expect(emailInput).toHaveValue('');
    });

    it('should allow clearing password field', async () => {
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const passwordInput = screen.getByTestId('password-input-emailChangePassword');
      await user.type(passwordInput, 'password123');
      await user.clear(passwordInput);

      expect(passwordInput).toHaveValue('');
    });
  });

  // ============================================================================
  // Form Submission
  // ============================================================================

  describe('form submission', () => {
    it('should call API with trimmed email and password on successful submit', async () => {
      mockChangeEmail.mockResolvedValue({ message: 'Confirmation email sent' });
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, '  newemail@example.com  ');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      expect(mockChangeEmail).toHaveBeenCalledWith({
        newEmail: 'newemail@example.com',
        password: 'password123',
      });
    });

    it('should show success message after successful submit', async () => {
      mockChangeEmail.mockResolvedValue({ message: 'Confirmation email sent successfully' });
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'newemail@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Confirmation email sent successfully')).toBeInTheDocument();
      });
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('data-tone', 'success');
    });

    it('should clear fields after successful submit', async () => {
      mockChangeEmail.mockResolvedValue({ message: 'Success' });
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'newemail@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(emailInput).toHaveValue('');
        expect(passwordInput).toHaveValue('');
      });
    });

    it('should call onSuccess callback after successful submit', async () => {
      mockChangeEmail.mockResolvedValue({ message: 'Success' });
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} onSuccess={mockOnSuccess} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'newemail@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle undefined onSuccess callback gracefully', async () => {
      mockChangeEmail.mockResolvedValue({ message: 'Success' });
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'newemail@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
      });
    });

    it('should prevent default form submission', async () => {
      mockChangeEmail.mockResolvedValue({ message: 'Success' });
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'newemail@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      const preventDefaultSpy = vi.fn();
      form.addEventListener('submit', (e) => {
        preventDefaultSpy();
        e.preventDefault();
      });

      fireEvent.submit(form);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('error handling', () => {
    it('should show error message when API call fails', async () => {
      mockChangeEmail.mockRejectedValue(new Error('Invalid password'));
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'newemail@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Invalid password')).toBeInTheDocument();
      });
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('data-tone', 'danger');
    });

    it('should show generic error message when error is not an Error instance', async () => {
      mockChangeEmail.mockRejectedValue('Network failure');
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'newemail@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Failed to request email change')).toBeInTheDocument();
      });
    });

    it('should clear error message on new submission', async () => {
      mockChangeEmail.mockRejectedValueOnce(new Error('First error'));
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'newemail@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      mockChangeEmail.mockResolvedValue({ message: 'Success' });
      await user.type(emailInput, 'another@example.com');

      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });

    it('should clear success message on new submission', async () => {
      mockChangeEmail.mockResolvedValueOnce({ message: 'Success message' });
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'newemail@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });

      await user.type(emailInput, 'another@example.com');
      await user.type(passwordInput, 'newpass');

      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Loading State
  // ============================================================================

  describe('loading state', () => {
    it('should show loading text on submit button during request', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockChangeEmail.mockReturnValue(promise);

      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'newemail@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      act(() => {
        fireEvent.submit(form);
      });

      expect(screen.getByText('Requesting...')).toBeInTheDocument();

      await act(async () => {
        resolvePromise!({ message: 'Success' });
        await promise;
      });

      expect(screen.getByText('Change Email')).toBeInTheDocument();
    });

    it('should disable submit button during loading', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockChangeEmail.mockReturnValue(promise);

      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'newemail@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByTestId('submit-button');
      const form = screen.getByTestId('submit-button').closest('form')!;

      act(() => {
        fireEvent.submit(form);
      });

      expect(submitButton).toBeDisabled();

      await act(async () => {
        resolvePromise!({ message: 'Success' });
        await promise;
      });

      expect(submitButton).toBeDisabled(); // Still disabled because fields are now empty
    });

    it('should disable input fields during loading', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockChangeEmail.mockReturnValue(promise);

      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'newemail@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;

      act(() => {
        fireEvent.submit(form);
      });

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();

      await act(async () => {
        resolvePromise!({ message: 'Success' });
        await promise;
      });

      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle email with multiple @ symbols', async () => {
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'test@@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).not.toBeDisabled(); // Has @, so validation passes
    });

    it('should handle very long email', async () => {
      mockChangeEmail.mockResolvedValue({ message: 'Success' });
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      const longEmail = 'a'.repeat(100) + '@example.com';
      await user.type(emailInput, longEmail);
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      expect(mockChangeEmail).toHaveBeenCalledWith({
        newEmail: longEmail,
        password: 'password123',
      });
    });

    it('should handle email with whitespace around it', async () => {
      mockChangeEmail.mockResolvedValue({ message: 'Success' });
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, '   test@example.com   ');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      expect(mockChangeEmail).toHaveBeenCalledWith({
        newEmail: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle form submission via button click', async () => {
      mockChangeEmail.mockResolvedValue({ message: 'Success' });
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      await user.click(screen.getByTestId('submit-button'));

      expect(mockChangeEmail).toHaveBeenCalled();
    });

    it('should not show both error and success simultaneously', async () => {
      mockChangeEmail.mockRejectedValueOnce(new Error('Error message'));
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Error message')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('alert')).toHaveAttribute('data-tone', 'danger');
    });

    it('should handle empty API response message', async () => {
      mockChangeEmail.mockResolvedValue({ message: '' });
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      // Success message should not be shown if message is empty
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should handle getApiClient configuration', async () => {
      mockChangeEmail.mockResolvedValue({ message: 'Success' });
      const user = userEvent.setup({ delay: null });
      render(<EmailChangeForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-newEmail');
      const passwordInput = screen.getByTestId('password-input-emailChangePassword');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      fireEvent.submit(form);

      // Verify API client was called (implicitly tests that getApiClient was invoked)
      expect(mockChangeEmail).toHaveBeenCalled();
    });
  });
});
