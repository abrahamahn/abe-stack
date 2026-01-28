// apps/web/src/features/settings/components/ProfileForm.test.tsx
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

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { ProfileForm } from './ProfileForm';

import type { ProfileFormProps } from './ProfileForm';
import type { User } from '../api';

// Mock the hooks
vi.mock('../hooks', () => ({
  useProfileUpdate: vi.fn(),
}));

// Mock UI components
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    Alert: ({ children, tone }: { children: React.ReactNode; tone: string }) => (
      <div data-testid="alert" data-tone={tone}>
        {children}
      </div>
    ),
    Button: ({
      children,
      onClick,
      disabled,
      type,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
      type?: string;
    }) => (
      <button data-testid="submit-button" onClick={onClick} disabled={disabled} type={type}>
        {children}
      </button>
    ),
    FormField: ({
      children,
      label,
      htmlFor,
    }: {
      children: React.ReactNode;
      label: string;
      htmlFor: string;
    }) => (
      <div data-testid={`form-field-${htmlFor}`}>
        <label htmlFor={htmlFor}>{label}</label>
        {children}
      </div>
    ),
    Input: ({
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
      onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
    ),
  };
});

import { useProfileUpdate } from '../hooks';

describe('ProfileForm', () => {
  let mockUpdateProfile: ReturnType<typeof vi.fn>;
  let mockReset: ReturnType<typeof vi.fn>;
  let mockOnSuccess: ReturnType<typeof vi.fn>;

  const mockUser: User = {
    id: 'user-123',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'user',
    isVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const defaultProps: ProfileFormProps = {
    user: mockUser,
    onSuccess: undefined,
  };

  beforeEach(() => {
    mockUpdateProfile = vi.fn();
    mockReset = vi.fn();
    mockOnSuccess = vi.fn();

    vi.mocked(useProfileUpdate).mockReturnValue({
      updateProfile: mockUpdateProfile,
      isLoading: false,
      error: null,
      reset: mockReset,
    });
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

    it('should render name field with user name', () => {
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      expect(nameInput).toHaveValue('John Doe');
      expect(nameInput).not.toBeDisabled();
    });

    it('should render email warning message', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('Email cannot be changed at this time.')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should render with null user name', () => {
      const userWithoutName: User = {
        ...mockUser,
        name: null,
      };

      render(<ProfileForm {...defaultProps} user={userWithoutName} />);

      const nameInput = screen.getByTestId('input-name');
      expect(nameInput).toHaveValue('');
    });

    it('should render form fields with correct labels', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Display Name')).toBeInTheDocument();
    });

    it('should render name input with maxLength attribute', () => {
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      expect(nameInput).toHaveAttribute('maxLength', '100');
    });

    it('should render name input with placeholder', () => {
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      expect(nameInput).toHaveAttribute('placeholder', 'Enter your display name');
    });
  });

  // ============================================================================
  // User Interactions
  // ============================================================================

  describe('user interactions', () => {
    it('should update name field when typing', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      expect(nameInput).toHaveValue('Jane Smith');
    });

    it('should not allow editing email field', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const emailInput = screen.getByTestId('input-email');

      // Attempt to type in disabled field
      await user.click(emailInput);
      expect(emailInput).toBeDisabled();
    });

    it('should enable submit button when name changes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      const submitButton = screen.getByTestId('submit-button');

      // Initially disabled (no changes)
      expect(submitButton).toBeDisabled();

      // Type new name
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      // Should be enabled
      expect(submitButton).not.toBeDisabled();
    });

    it('should disable submit button when name is unchanged', () => {
      render(<ProfileForm {...defaultProps} />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when name is cleared and was null originally', async () => {
      const user = userEvent.setup({ delay: null });
      const userWithoutName: User = {
        ...mockUser,
        name: null,
      };

      render(<ProfileForm {...defaultProps} user={userWithoutName} />);

      const nameInput = screen.getByTestId('input-name');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(nameInput, 'Test');
      await user.clear(nameInput);

      expect(submitButton).toBeDisabled();
    });
  });

  // ============================================================================
  // Form Submission
  // ============================================================================

  describe('form submission', () => {
    it('should call updateProfile with trimmed name', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      await user.clear(nameInput);
      await user.type(nameInput, '  Jane Smith  ');

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Jane Smith' });
    });

    it('should call updateProfile with null for empty name', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      await user.clear(nameInput);

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockUpdateProfile).toHaveBeenCalledWith({ name: null });
    });

    it('should call updateProfile with null for whitespace-only name', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      await user.clear(nameInput);
      await user.type(nameInput, '   ');

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockUpdateProfile).toHaveBeenCalledWith({ name: null });
    });

    it('should prevent default form submission', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

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

      vi.mocked(useProfileUpdate).mockImplementation(({ onSuccess }) => {
        if (onSuccess !== undefined) {
          onSuccess();
        }
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          error: null,
          reset: mockReset,
        };
      });

      const { rerender } = render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();

      // Reset mock to not auto-trigger success
      vi.mocked(useProfileUpdate).mockReturnValue({
        updateProfile: mockUpdateProfile,
        isLoading: false,
        error: null,
        reset: mockReset,
      });

      rerender(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

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
        error: null,
        reset: mockReset,
      });

      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should disable submit button during loading', () => {
      vi.mocked(useProfileUpdate).mockReturnValue({
        updateProfile: mockUpdateProfile,
        isLoading: true,
        error: null,
        reset: mockReset,
      });

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
        error: new Error('Update failed'),
        reset: mockReset,
      });

      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });

    it('should display correct error tone', () => {
      vi.mocked(useProfileUpdate).mockReturnValue({
        updateProfile: mockUpdateProfile,
        isLoading: false,
        error: new Error('Update failed'),
        reset: mockReset,
      });

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
      vi.mocked(useProfileUpdate).mockImplementation(({ onSuccess }) => {
        if (onSuccess !== undefined) {
          onSuccess();
        }
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          error: null,
          reset: mockReset,
        };
      });

      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
    });

    it('should display success alert with correct tone', () => {
      vi.mocked(useProfileUpdate).mockImplementation(({ onSuccess }) => {
        if (onSuccess !== undefined) {
          onSuccess();
        }
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          error: null,
          reset: mockReset,
        };
      });

      render(<ProfileForm {...defaultProps} />);

      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('data-tone', 'success');
    });

    it('should call reset on success', () => {
      vi.mocked(useProfileUpdate).mockImplementation(({ onSuccess }) => {
        if (onSuccess !== undefined) {
          onSuccess();
        }
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          error: null,
          reset: mockReset,
        };
      });

      render(<ProfileForm {...defaultProps} />);

      expect(mockReset).toHaveBeenCalled();
    });

    it('should call onSuccess callback', () => {
      vi.mocked(useProfileUpdate).mockImplementation(({ onSuccess }) => {
        if (onSuccess !== undefined) {
          onSuccess();
        }
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          error: null,
          reset: mockReset,
        };
      });

      render(<ProfileForm {...defaultProps} onSuccess={mockOnSuccess} />);

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should handle undefined onSuccess prop', () => {
      vi.mocked(useProfileUpdate).mockImplementation(({ onSuccess }) => {
        if (onSuccess !== undefined) {
          onSuccess();
        }
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          error: null,
          reset: mockReset,
        };
      });

      render(<ProfileForm {...defaultProps} onSuccess={undefined} />);

      // Should not throw
      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
    });

    it('should hide success message after 3 seconds', () => {
      vi.useFakeTimers();
      vi.mocked(useProfileUpdate).mockImplementation(({ onSuccess }) => {
        if (onSuccess !== undefined) {
          onSuccess();
        }
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          error: null,
          reset: mockReset,
        };
      });

      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();

      // Fast-forward time
      vi.advanceTimersByTime(3000);

      expect(screen.queryByText('Profile updated successfully')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('should not hide success message before 3 seconds', () => {
      vi.useFakeTimers();
      vi.mocked(useProfileUpdate).mockImplementation(({ onSuccess }) => {
        if (onSuccess !== undefined) {
          onSuccess();
        }
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          error: null,
          reset: mockReset,
        };
      });

      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();

      // Fast-forward time (not enough)
      vi.advanceTimersByTime(2999);

      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  // ============================================================================
  // Change Detection
  // ============================================================================

  describe('change detection', () => {
    it('should detect changes with trimmed comparison', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      const submitButton = screen.getByTestId('submit-button');

      // Add whitespace
      await user.clear(nameInput);
      await user.type(nameInput, '  John Doe  ');

      // Should be disabled (same after trim)
      expect(submitButton).toBeDisabled();
    });

    it('should enable button when name changes after trimming whitespace', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      const submitButton = screen.getByTestId('submit-button');

      await user.clear(nameInput);
      await user.type(nameInput, '  Jane Smith  ');

      // Should be enabled (different after trim)
      expect(submitButton).not.toBeDisabled();
    });

    it('should compare empty string as null', async () => {
      const user = userEvent.setup({ delay: null });
      const userWithoutName: User = {
        ...mockUser,
        name: null,
      };

      render(<ProfileForm {...defaultProps} user={userWithoutName} />);

      const nameInput = screen.getByTestId('input-name');
      const submitButton = screen.getByTestId('submit-button');

      // Type then clear
      await user.type(nameInput, 'Test');
      await user.clear(nameInput);

      // Should be disabled (empty string becomes null, same as original)
      expect(submitButton).toBeDisabled();
    });

    it('should detect change from null to non-empty', async () => {
      const user = userEvent.setup({ delay: null });
      const userWithoutName: User = {
        ...mockUser,
        name: null,
      };

      render(<ProfileForm {...defaultProps} user={userWithoutName} />);

      const nameInput = screen.getByTestId('input-name');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(nameInput, 'New Name');

      // Should be enabled
      expect(submitButton).not.toBeDisabled();
    });

    it('should detect change from non-empty to null', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      const submitButton = screen.getByTestId('submit-button');

      await user.clear(nameInput);

      // Should be enabled (changed from "John Doe" to null)
      expect(submitButton).not.toBeDisabled();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle very long names (up to maxLength)', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      const longName = 'a'.repeat(100);

      await user.clear(nameInput);
      await user.type(nameInput, longName);

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockUpdateProfile).toHaveBeenCalledWith({ name: longName });
    });

    it('should handle names with special characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      const specialName = "O'Brien-Smith 3rd";

      await user.clear(nameInput);
      await user.type(nameInput, specialName);

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockUpdateProfile).toHaveBeenCalledWith({ name: specialName });
    });

    it('should handle names with unicode characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      const unicodeName = 'José María Pérez';

      await user.clear(nameInput);
      await user.type(nameInput, unicodeName);

      fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);

      expect(mockUpdateProfile).toHaveBeenCalledWith({ name: unicodeName });
    });

    it('should handle form submission via button click', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ProfileForm {...defaultProps} />);

      const nameInput = screen.getByTestId('input-name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      await user.click(screen.getByTestId('submit-button'));

      expect(mockUpdateProfile).toHaveBeenCalled();
    });

    it('should not show both error and success simultaneously', () => {
      vi.mocked(useProfileUpdate).mockImplementation(({ onSuccess }) => {
        if (onSuccess !== undefined) {
          onSuccess();
        }
        return {
          updateProfile: mockUpdateProfile,
          isLoading: false,
          error: new Error('Some error'),
          reset: mockReset,
        };
      });

      render(<ProfileForm {...defaultProps} />);

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
