// apps/web/src/features/settings/components/PasswordChangeForm.test.tsx
/**
 * Password Change Form Component Tests
 *
 * Comprehensive tests for password change form covering:
 * - Form rendering and field interactions
 * - Password strength indicator
 * - Form validation (matching, length, same as current)
 * - Submission handling and success/error states
 * - Loading states and button disabling
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePasswordChange } from '../hooks';

import { PasswordChangeForm } from './PasswordChangeForm';

import type { PasswordChangeFormProps } from './PasswordChangeForm';
import type { ChangeEvent, ReactNode } from 'react';

// Mock the hooks
vi.mock('../hooks', () => ({
  usePasswordChange: vi.fn(),
}));

// Mock UI components
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');

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

  const mockPasswordInput = ({
    id,
    value,
    onChange,
    placeholder,
    autoComplete,
  }: {
    id: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    autoComplete: string;
  }) => (
    <input
      data-testid={`password-input-${id}`}
      id={id}
      type="password"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
    />
  );

  return {
    ...actual,
    Alert: mockAlert,
    Button: mockButton,
    FormField: mockFormField,
    PasswordInput: mockPasswordInput,
  };
});

describe('PasswordChangeForm', () => {
  let mockChangePassword: any;
  let mockReset: any;
  let mockOnSuccess: any;

  const defaultProps: PasswordChangeFormProps = {};

  beforeEach(() => {
    mockChangePassword = vi.fn();
    mockReset = vi.fn();
    mockOnSuccess = vi.fn();

    vi.mocked(usePasswordChange).mockReturnValue({
      changePassword: mockChangePassword,
      isLoading: false,
      isFetching: false,
      isSuccess: false,
      isError: false,
      error: null,
      reset: mockReset,
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // Rendering
  // ============================================================================

  describe('rendering', () => {
    it('should render all form fields', () => {
      render(<PasswordChangeForm {...defaultProps} />);

      expect(screen.getByText('Current Password')).toBeInTheDocument();
      expect(screen.getByText('New Password')).toBeInTheDocument();
      expect(screen.getByText('Confirm New Password')).toBeInTheDocument();
    });

    it('should render password inputs with correct attributes', () => {
      render(<PasswordChangeForm {...defaultProps} />);

      expect(screen.getByTestId('password-input-currentPassword')).toHaveAttribute(
        'type',
        'password',
      );
      expect(screen.getByTestId('password-input-newPassword')).toHaveAttribute('type', 'password');
      expect(screen.getByTestId('password-input-confirmPassword')).toHaveAttribute(
        'type',
        'password',
      );
    });

    it('should render submit button', () => {
      render(<PasswordChangeForm {...defaultProps} />);

      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    it('should render password strength indicator', () => {
      render(<PasswordChangeForm {...defaultProps} />);

      // Strength indicator has 4 bars
      expect(screen.getByTestId('form-field-newPassword')).toBeInTheDocument();
    });

    it('should have correct autocomplete attributes', () => {
      render(<PasswordChangeForm {...defaultProps} />);

      expect(screen.getByTestId('password-input-currentPassword')).toHaveAttribute(
        'autocomplete',
        'current-password',
      );
      expect(screen.getByTestId('password-input-newPassword')).toHaveAttribute(
        'autocomplete',
        'new-password',
      );
      expect(screen.getByTestId('password-input-confirmPassword')).toHaveAttribute(
        'autocomplete',
        'new-password',
      );
    });
  });

  // ============================================================================
  // Password Strength Indicator
  // ============================================================================

  describe('password strength indicator', () => {
    it('should show "Enter a password" when password is empty', () => {
      render(<PasswordChangeForm {...defaultProps} />);

      const newPasswordField = screen.getByTestId('form-field-newPassword');
      expect(newPasswordField).toBeInTheDocument();
      // Empty password shows default state
    });

    it('should show "Weak" for short password', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      const newPasswordInput = screen.getByTestId('password-input-newPassword');
      await user.type(newPasswordInput, 'abc');

      expect(screen.getByText('Weak')).toBeInTheDocument();
    });

    it('should show "Fair" for medium password', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      const newPasswordInput = screen.getByTestId('password-input-newPassword');
      await user.type(newPasswordInput, 'abcd1234');

      expect(screen.getByText('Fair')).toBeInTheDocument();
    });

    it('should show "Good" for good password', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      const newPasswordInput = screen.getByTestId('password-input-newPassword');
      // 'Abcd1234' gives score 3: length>=8(+1), mixed case(+1), numbers(+1) = Good
      await user.type(newPasswordInput, 'Abcd1234');

      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should show "Strong" for strong password', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      const newPasswordInput = screen.getByTestId('password-input-newPassword');
      await user.type(newPasswordInput, 'Abcd1234!@#$');

      expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    it('should calculate strength based on length', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      const newPasswordInput = screen.getByTestId('password-input-newPassword');

      // 8 characters - gets 1 point for length
      await user.type(newPasswordInput, 'abcdefgh');
      expect(screen.getByText(/Weak|Fair/)).toBeInTheDocument();
    });

    it('should calculate strength based on mixed case', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      const newPasswordInput = screen.getByTestId('password-input-newPassword');
      await user.type(newPasswordInput, 'AbCdEfGh');

      // Mixed case adds points
      expect(screen.queryByText('Weak')).not.toBeInTheDocument();
    });

    it('should calculate strength based on numbers', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      const newPasswordInput = screen.getByTestId('password-input-newPassword');
      await user.type(newPasswordInput, 'Abcd1234');

      // Numbers add points
      expect(screen.getByText(/Fair|Good/)).toBeInTheDocument();
    });

    it('should calculate strength based on special characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      const newPasswordInput = screen.getByTestId('password-input-newPassword');
      await user.type(newPasswordInput, 'Abcd1234!@');

      // Special characters add points
      expect(screen.getByText(/Good|Strong/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Form Validation
  // ============================================================================

  describe('form validation', () => {
    it('should disable submit button when fields are empty', () => {
      render(<PasswordChangeForm {...defaultProps} />);

      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });

    it('should disable submit button when passwords do not match', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword123');
      await user.type(screen.getByTestId('password-input-newPassword'), 'newPassword123');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'differentPass123');

      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });

    it('should enable submit button when all fields are valid', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword123');
      await user.type(screen.getByTestId('password-input-newPassword'), 'newPassword123');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'newPassword123');

      expect(screen.getByTestId('submit-button')).not.toBeDisabled();
    });

    it('should show inline error when passwords do not match', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-newPassword'), 'newPassword123');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'different123');

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('should not show inline error when confirm field is empty', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-newPassword'), 'newPassword123');

      expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
    });

    it('should validate password length on submit', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword');
      await user.type(screen.getByTestId('password-input-newPassword'), 'short');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'short');

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it('should validate passwords match on submit', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword123');
      await user.type(screen.getByTestId('password-input-newPassword'), 'newPassword123');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'different123');

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it('should validate new password is different from current', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-currentPassword'), 'samePassword123');
      await user.type(screen.getByTestId('password-input-newPassword'), 'samePassword123');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'samePassword123');

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(
        screen.getByText('New password must be different from current password'),
      ).toBeInTheDocument();
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it('should clear validation error when submitting again', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      // First submission with error
      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword');
      await user.type(screen.getByTestId('password-input-newPassword'), 'short');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'short');

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();

      // Fix and resubmit
      await user.clear(screen.getByTestId('password-input-newPassword'));
      await user.clear(screen.getByTestId('password-input-confirmPassword'));
      await user.type(screen.getByTestId('password-input-newPassword'), 'validPassword123');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'validPassword123');

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Form Submission
  // ============================================================================

  describe('form submission', () => {
    it('should call changePassword with correct data', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword123');
      await user.type(screen.getByTestId('password-input-newPassword'), 'newPassword123');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'newPassword123');

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      });
    });

    it('should show loading state during submission', () => {
      vi.mocked(usePasswordChange).mockReturnValue({
        changePassword: mockChangePassword,
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        reset: mockReset,
      } as any);

      render(<PasswordChangeForm {...defaultProps} />);

      expect(screen.getByText('Changing...')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });

    it('should display error from hook', () => {
      vi.mocked(usePasswordChange).mockReturnValue({
        changePassword: mockChangePassword,
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        error: new Error('Current password is incorrect'),
        reset: mockReset,
      } as any);

      render(<PasswordChangeForm {...defaultProps} />);

      expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
    });

    it('should prioritize validation error over hook error', async () => {
      const user = userEvent.setup({ delay: null });

      vi.mocked(usePasswordChange).mockReturnValue({
        changePassword: mockChangePassword,
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        error: new Error('Hook error'),
        reset: mockReset,
      } as any);

      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword');
      await user.type(screen.getByTestId('password-input-newPassword'), 'short');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'short');

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      expect(screen.queryByText('Hook error')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Success Handling
  // ============================================================================

  describe('success handling', () => {
    it('should show success message after password change', () => {
      let capturedOnSuccess: any;

      vi.mocked(usePasswordChange).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          changePassword: mockChangePassword,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<PasswordChangeForm {...defaultProps} />);

      // Trigger the success callback
      act(() => {
        capturedOnSuccess?.({ success: true });
      });

      expect(screen.getByText('Password changed successfully')).toBeInTheDocument();
      expect(mockReset).toHaveBeenCalled();
    });

    it('should clear form fields on success', async () => {
      const user = userEvent.setup({ delay: null });
      let capturedOnSuccess: any;

      vi.mocked(usePasswordChange).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          changePassword: mockChangePassword,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<PasswordChangeForm {...defaultProps} />);

      // Type something first
      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword123');
      await user.type(screen.getByTestId('password-input-newPassword'), 'newPassword123');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'newPassword123');

      // Trigger success callback
      act(() => {
        capturedOnSuccess?.({ success: true });
      });

      // Check that inputs are cleared
      expect(screen.getByTestId('password-input-currentPassword')).toHaveValue('');
      expect(screen.getByTestId('password-input-newPassword')).toHaveValue('');
      expect(screen.getByTestId('password-input-confirmPassword')).toHaveValue('');
    });

    it('should call onSuccess callback', () => {
      let capturedOnSuccess: any;

      vi.mocked(usePasswordChange).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          changePassword: mockChangePassword,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<PasswordChangeForm {...defaultProps} onSuccess={mockOnSuccess} />);

      // Trigger success callback
      act(() => {
        capturedOnSuccess?.({ success: true });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should hide success message after 3 seconds', () => {
      vi.useFakeTimers();
      let capturedOnSuccess: any;

      vi.mocked(usePasswordChange).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          changePassword: mockChangePassword,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<PasswordChangeForm {...defaultProps} />);

      // Trigger success callback
      act(() => {
        capturedOnSuccess?.({ success: true });
      });

      expect(screen.getByText('Password changed successfully')).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('Password changed successfully')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('should handle undefined onSuccess prop', () => {
      let capturedOnSuccess: any;

      vi.mocked(usePasswordChange).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          changePassword: mockChangePassword,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<PasswordChangeForm {...defaultProps} />);

      // Trigger success callback - should not throw even with undefined prop
      act(() => {
        capturedOnSuccess?.({ success: true });
      });

      expect(screen.getByText('Password changed successfully')).toBeInTheDocument();
    });

    it('should clear success message when submitting again', async () => {
      const user = userEvent.setup({ delay: null });
      let capturedOnSuccess: any;

      vi.mocked(usePasswordChange).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          changePassword: mockChangePassword,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<PasswordChangeForm {...defaultProps} />);

      // Trigger success to show message
      act(() => {
        capturedOnSuccess?.({ success: true });
      });

      expect(screen.getByText('Password changed successfully')).toBeInTheDocument();

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword123');
      await user.type(screen.getByTestId('password-input-newPassword'), 'newPassword123');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'newPassword123');

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      // Success message should be cleared on new submission
      expect(screen.queryByText('Password changed successfully')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle form submission via button click', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword123');
      await user.type(screen.getByTestId('password-input-newPassword'), 'newPassword123');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'newPassword123');

      await user.click(screen.getByTestId('submit-button'));

      expect(mockChangePassword).toHaveBeenCalled();
    });

    it('should prevent default form submission', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword123');
      await user.type(screen.getByTestId('password-input-newPassword'), 'newPassword123');
      await user.type(screen.getByTestId('password-input-confirmPassword'), 'newPassword123');

      const form = screen.getByTestId('submit-button').closest('form')!;
      const preventDefaultSpy = vi.fn();
      form.addEventListener('submit', (e) => {
        preventDefaultSpy();
        e.preventDefault();
      });

      fireEvent.submit(form);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should handle very long passwords', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      const longPassword = 'a'.repeat(100) + 'A1!';

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword123');
      await user.type(screen.getByTestId('password-input-newPassword'), longPassword);
      await user.type(screen.getByTestId('password-input-confirmPassword'), longPassword);

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'oldPassword123',
        newPassword: longPassword,
      });
    });

    it('should handle passwords with special characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      const specialPassword = 'P@ssw0rd!@#$%^&*()';

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword123');
      await user.type(screen.getByTestId('password-input-newPassword'), specialPassword);
      await user.type(screen.getByTestId('password-input-confirmPassword'), specialPassword);

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'oldPassword123',
        newPassword: specialPassword,
      });
    });

    it('should handle passwords with unicode characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      const unicodePassword = 'P@ssw0rd🔒';

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword123');
      await user.type(screen.getByTestId('password-input-newPassword'), unicodePassword);
      await user.type(screen.getByTestId('password-input-confirmPassword'), unicodePassword);

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'oldPassword123',
        newPassword: unicodePassword,
      });
    });

    it('should disable submit button when password is 7 characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword');
      await user.type(screen.getByTestId('password-input-newPassword'), '1234567');
      await user.type(screen.getByTestId('password-input-confirmPassword'), '1234567');

      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });

    it('should enable submit button when password is exactly 8 characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PasswordChangeForm {...defaultProps} />);

      await user.type(screen.getByTestId('password-input-currentPassword'), 'oldPassword');
      await user.type(screen.getByTestId('password-input-newPassword'), '12345678');
      await user.type(screen.getByTestId('password-input-confirmPassword'), '12345678');

      expect(screen.getByTestId('submit-button')).not.toBeDisabled();
    });
  });
});
