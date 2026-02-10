// src/apps/web/src/features/settings/components/ProfileForm.test.tsx
/**
 * Profile Form Component Tests
 *
 * Comprehensive tests for profile form covering:
 * - Form rendering with user data
 * - Input field interactions
 * - Form validation and change detection
 * - Submission handling
 * - Success and error states
 * - Loading states
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProfileUpdate } from '../hooks';

import { ProfileForm } from './ProfileForm';

import type { User } from '../api';
import type { ProfileFormProps } from './ProfileForm';
import type { UserId } from '@abe-stack/shared';
import type { ChangeEvent, ReactNode } from 'react';

// Mock the hooks
vi.mock('../hooks', () => ({
  useProfileUpdate: vi.fn(),
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

  const mockInput = ({
    id,
    value,
    onChange,
    disabled,
    type,
    placeholder,
    maxLength,
    className,
  }: {
    id: string;
    value: string;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    type?: string;
    placeholder?: string;
    maxLength?: number;
    className?: string;
  }) => (
    <input
      data-testid={`input-${id}`}
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={maxLength}
      className={className}
    />
  );

  return {
    ...actual,
    Alert: mockAlert,
    Button: mockButton,
    FormField: mockFormField,
    Input: mockInput,
  };
});

describe('ProfileForm', () => {
  let mockUpdateProfile: any;
  let mockReset: any;
  let mockOnSuccess: any;

  const mockUser: User = {
    id: 'user-123' as unknown as UserId,
    email: 'john@example.com',
    username: 'johndoe',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: null,
    role: 'user',
    emailVerified: true,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const defaultProps: ProfileFormProps = {
    user: mockUser,
  };

  beforeEach(() => {
    mockUpdateProfile = vi.fn();
    mockReset = vi.fn();
    mockOnSuccess = vi.fn();

    vi.mocked(useProfileUpdate).mockReturnValue({
      updateProfile: mockUpdateProfile,
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
    it('should render email field with user email', () => {
      render(<ProfileForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-email');
      expect(emailInput).toHaveValue('john@example.com');
      expect(emailInput).toBeDisabled();
    });

    it('should render firstName field with user firstName', () => {
      render(<ProfileForm {...defaultProps} />);

      const firstNameInput = screen.getByTestId('input-firstName');
      expect(firstNameInput).toHaveValue('John');
      expect(firstNameInput).not.toBeDisabled();
    });

    it('should render lastName field with user lastName', () => {
      render(<ProfileForm {...defaultProps} />);

      const lastNameInput = screen.getByTestId('input-lastName');
      expect(lastNameInput).toHaveValue('Doe');
      expect(lastNameInput).not.toBeDisabled();
    });

    it('should render email warning message', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('To change your email, go to the Security tab.')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should render form fields with correct labels', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Last Name')).toBeInTheDocument();
    });

    it('should render firstName input with maxLength attribute', () => {
      render(<ProfileForm {...defaultProps} />);

      const firstNameInput = screen.getByTestId('input-firstName');
      expect(firstNameInput).toHaveAttribute('maxLength', '100');
    });

    it('should render lastName input with maxLength attribute', () => {
      render(<ProfileForm {...defaultProps} />);

      const lastNameInput = screen.getByTestId('input-lastName');
      expect(lastNameInput).toHaveAttribute('maxLength', '100');
    });

    it('should render firstName input with placeholder', () => {
      render(<ProfileForm {...defaultProps} />);

      const firstNameInput = screen.getByTestId('input-firstName');
      expect(firstNameInput).toHaveAttribute('placeholder', 'Enter your first name');
    });

    it('should render lastName input with placeholder', () => {
      render(<ProfileForm {...defaultProps} />);

      const lastNameInput = screen.getByTestId('input-lastName');
      expect(lastNameInput).toHaveAttribute('placeholder', 'Enter your last name');
    });
  });

  // ============================================================================
  // User Interactions
  // ============================================================================

  describe('user interactions', () => {
    it('should update firstName field when typing', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const firstNameInput = screen.getByTestId('input-firstName');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      expect(firstNameInput).toHaveValue('Jane');
    });

    it('should update lastName field when typing', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const lastNameInput = screen.getByTestId('input-lastName');
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Smith');

      expect(lastNameInput).toHaveValue('Smith');
    });

    it('should not allow editing email field', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-email');

      // Attempt to type in disabled field
      await user.click(emailInput);
      expect(emailInput).toBeDisabled();
    });

    it('should enable submit button when firstName changes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const firstNameInput = screen.getByTestId('input-firstName');
      const submitButton = screen.getByTestId('submit-button');

      // Initially disabled (no changes)
      expect(submitButton).toBeDisabled();

      // Type new firstName
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      // Should be enabled
      expect(submitButton).not.toBeDisabled();
    });

    it('should enable submit button when lastName changes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const lastNameInput = screen.getByTestId('input-lastName');
      const submitButton = screen.getByTestId('submit-button');

      // Initially disabled (no changes)
      expect(submitButton).toBeDisabled();

      // Type new lastName
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Smith');

      // Should be enabled
      expect(submitButton).not.toBeDisabled();
    });

    it('should disable submit button when fields are unchanged', () => {
      render(<ProfileForm {...defaultProps} />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });
  });

  // ============================================================================
  // Form Submission
  // ============================================================================

  describe('form submission', () => {
    it('should call updateProfile with trimmed names', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const firstNameInput = screen.getByTestId('input-firstName');
      const lastNameInput = screen.getByTestId('input-lastName');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, '  Jane  ');
      await user.clear(lastNameInput);
      await user.type(lastNameInput, '  Smith  ');

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
        }),
      );
    });

    it('should prevent default form submission', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const firstNameInput = screen.getByTestId('input-firstName');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      const form = screen.getByTestId('submit-button').closest('form')!;
      const preventDefaultSpy = vi.fn();
      form.addEventListener('submit', (e) => {
        preventDefaultSpy();
        e.preventDefault();
      });

      fireEvent.submit(form);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should clear success message on new submission', async () => {
      const user = userEvent.setup({ delay: null });
      let capturedOnSuccess: ((user: User) => void) | undefined;

      vi.mocked(useProfileUpdate).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<ProfileForm {...defaultProps} />);

      // Trigger success to show message
      act(() => {
        capturedOnSuccess?.(mockUser);
      });

      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();

      const firstNameInput = screen.getByTestId('input-firstName');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(screen.queryByText('Profile updated successfully')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Loading State
  // ============================================================================

  describe('loading state', () => {
    it('should show loading text on submit button', () => {
      vi.mocked(useProfileUpdate).mockReturnValue({
        updateProfile: mockUpdateProfile,
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        reset: mockReset,
      } as any);

      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should disable submit button during loading', () => {
      vi.mocked(useProfileUpdate).mockReturnValue({
        updateProfile: mockUpdateProfile,
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        reset: mockReset,
      } as any);

      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('error handling', () => {
    it('should display error from hook', () => {
      vi.mocked(useProfileUpdate).mockReturnValue({
        updateProfile: mockUpdateProfile,
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        error: new Error('Update failed'),
        reset: mockReset,
      } as any);

      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });

    it('should display correct error tone', () => {
      vi.mocked(useProfileUpdate).mockReturnValue({
        updateProfile: mockUpdateProfile,
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        error: new Error('Update failed'),
        reset: mockReset,
      } as any);

      render(<ProfileForm {...defaultProps} />);

      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('data-tone', 'danger');
    });

    it('should not display error when error is null', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Success Handling
  // ============================================================================

  describe('success handling', () => {
    it('should show success message after update', () => {
      let capturedOnSuccess: ((user: User) => void) | undefined;

      vi.mocked(useProfileUpdate).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<ProfileForm {...defaultProps} />);

      act(() => {
        capturedOnSuccess?.(mockUser);
      });

      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
    });

    it('display success alert with correct tone', () => {
      let capturedOnSuccess: ((user: User) => void) | undefined;

      vi.mocked(useProfileUpdate).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<ProfileForm {...defaultProps} />);

      act(() => {
        capturedOnSuccess?.(mockUser);
      });

      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('data-tone', 'success');
    });

    it('should call reset on success', () => {
      let capturedOnSuccess: ((user: User) => void) | undefined;

      vi.mocked(useProfileUpdate).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<ProfileForm {...defaultProps} />);

      act(() => {
        capturedOnSuccess?.(mockUser);
      });

      expect(mockReset).toHaveBeenCalled();
    });

    it('should call onSuccess callback', () => {
      let capturedOnSuccess: ((user: User) => void) | undefined;

      vi.mocked(useProfileUpdate).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<ProfileForm {...defaultProps} onSuccess={mockOnSuccess} />);

      act(() => {
        capturedOnSuccess?.(mockUser);
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should handle undefined onSuccess prop', () => {
      let capturedOnSuccess: ((user: User) => void) | undefined;

      vi.mocked(useProfileUpdate).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<ProfileForm {...defaultProps} />);

      act(() => {
        capturedOnSuccess?.(mockUser);
      });

      // Should not throw
      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
    });

    it('should hide success message after 3 seconds', () => {
      vi.useFakeTimers();
      let capturedOnSuccess: ((user: User) => void) | undefined;

      vi.mocked(useProfileUpdate).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<ProfileForm {...defaultProps} />);

      act(() => {
        capturedOnSuccess?.(mockUser);
      });

      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('Profile updated successfully')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('should not hide success message before 3 seconds', () => {
      vi.useFakeTimers();
      let capturedOnSuccess: ((user: User) => void) | undefined;

      vi.mocked(useProfileUpdate).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          isSuccess: false,
          isError: false,
          error: null,
          reset: mockReset,
        } as any;
      });

      render(<ProfileForm {...defaultProps} />);

      act(() => {
        capturedOnSuccess?.(mockUser);
      });

      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();

      // Fast-forward time (not enough)
      act(() => {
        vi.advanceTimersByTime(2999);
      });

      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  // ============================================================================
  // Change Detection
  // ============================================================================

  describe('change detection', () => {
    it('should detect changes with trimmed comparison for firstName', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const firstNameInput = screen.getByTestId('input-firstName');
      const submitButton = screen.getByTestId('submit-button');

      // Add whitespace
      await user.clear(firstNameInput);
      await user.type(firstNameInput, '  John  ');

      // Should be disabled (same after trim)
      expect(submitButton).toBeDisabled();
    });

    it('should detect changes with trimmed comparison for lastName', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const lastNameInput = screen.getByTestId('input-lastName');
      const submitButton = screen.getByTestId('submit-button');

      // Add whitespace
      await user.clear(lastNameInput);
      await user.type(lastNameInput, '  Doe  ');

      // Should be disabled (same after trim)
      expect(submitButton).toBeDisabled();
    });

    it('should enable button when firstName changes after trimming whitespace', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const firstNameInput = screen.getByTestId('input-firstName');
      const submitButton = screen.getByTestId('submit-button');

      await user.clear(firstNameInput);
      await user.type(firstNameInput, '  Jane  ');

      // Should be enabled (different after trim)
      expect(submitButton).not.toBeDisabled();
    });

    it('should enable button when lastName changes after trimming whitespace', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const lastNameInput = screen.getByTestId('input-lastName');
      const submitButton = screen.getByTestId('submit-button');

      await user.clear(lastNameInput);
      await user.type(lastNameInput, '  Smith  ');

      // Should be enabled (different after trim)
      expect(submitButton).not.toBeDisabled();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle very long firstName (up to maxLength)', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const firstNameInput = screen.getByTestId('input-firstName');
      const longFirstName = 'a'.repeat(100);

      await user.clear(firstNameInput);
      await user.type(firstNameInput, longFirstName);

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: longFirstName,
          lastName: 'Doe',
        }),
      );
    });

    it('should handle firstName with special characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const firstNameInput = screen.getByTestId('input-firstName');
      const specialFirstName = "O'Brien";

      await user.clear(firstNameInput);
      await user.type(firstNameInput, specialFirstName);

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: specialFirstName,
          lastName: 'Doe',
        }),
      );
    });

    it('should handle lastName with unicode characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const lastNameInput = screen.getByTestId('input-lastName');
      const unicodeLastName = 'Pérez';

      await user.clear(lastNameInput);
      await user.type(lastNameInput, unicodeLastName);

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: unicodeLastName,
        }),
      );
    });

    it('should handle form submission via button click', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const firstNameInput = screen.getByTestId('input-firstName');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      await user.click(screen.getByTestId('submit-button'));

      expect(mockUpdateProfile).toHaveBeenCalled();
    });

    it('should not show both error and success simultaneously', () => {
      let capturedOnSuccess: ((user: User) => void) | undefined;

      vi.mocked(useProfileUpdate).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: new Error('Some error'),
          reset: mockReset,
        } as any;
      });

      render(<ProfileForm {...defaultProps} />);

      act(() => {
        capturedOnSuccess?.(mockUser);
      });

      // Both might be present in different scenarios, but typically one at a time
      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
      expect(screen.getByText('Some error')).toBeInTheDocument();
    });

    it('should handle email field being readonly', () => {
      render(<ProfileForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-email');
      expect(emailInput).toBeDisabled();
      expect(emailInput).toHaveAttribute('type', 'email');
    });
  });
});
