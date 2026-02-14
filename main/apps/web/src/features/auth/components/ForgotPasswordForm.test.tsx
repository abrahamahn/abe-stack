// main/apps/web/src/features/auth/components/ForgotPasswordForm.test.tsx
/**
 * Unit tests for ForgotPasswordForm component.
 *
 * Tests cover:
 * - Form rendering and structure
 * - User interactions and form submission
 * - Loading and error states
 * - Accessibility features
 *
 * @complexity O(1) - All tests are unit tests with mocked dependencies
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { renderWithProviders } from '../../../__tests__/utils';

import { ForgotPasswordForm } from './ForgotPasswordForm';

import type { ForgotPasswordFormProps } from './ForgotPasswordForm';

describe('ForgotPasswordForm', () => {
  const defaultProps: ForgotPasswordFormProps = {
    onForgotPassword: vi.fn(),
    onSuccess: vi.fn(),
    onModeChange: vi.fn(),
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the form title and subtitle correctly', () => {
      renderWithProviders(<ForgotPasswordForm {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Reset password' })).toBeInTheDocument();
      expect(
        screen.getByText(
          "Enter your email address and we'll send you a link to reset your password",
        ),
      ).toBeInTheDocument();
    });

    it('renders the email input field', () => {
      renderWithProviders(<ForgotPasswordForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toBeRequired();
    });

    it('renders the submit button with correct text', () => {
      renderWithProviders(<ForgotPasswordForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
    });

    it('renders sign in link with onModeChange callback', () => {
      renderWithProviders(<ForgotPasswordForm {...defaultProps} onModeChange={vi.fn()} />);

      expect(screen.getByText('Remember your password?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('updates email input value when typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ForgotPasswordForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('calls onForgotPassword with email when form is submitted', async () => {
      const mockOnForgotPassword = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(
        <ForgotPasswordForm {...defaultProps} onForgotPassword={mockOnForgotPassword} />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

      await waitFor(() => {
        expect(mockOnForgotPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
        });
      });
    });

    it('calls onSuccess after successful submission', async () => {
      const mockOnForgotPassword = vi.fn().mockResolvedValue(undefined);
      const mockOnSuccess = vi.fn();
      renderWithProviders(
        <ForgotPasswordForm
          {...defaultProps}
          onForgotPassword={mockOnForgotPassword}
          onSuccess={mockOnSuccess}
        />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('calls onModeChange with login when sign in button is clicked', () => {
      const mockOnModeChange = vi.fn();
      renderWithProviders(<ForgotPasswordForm {...defaultProps} onModeChange={mockOnModeChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(mockOnModeChange).toHaveBeenCalledWith('login');
    });
  });

  describe('Loading State', () => {
    it('shows loading text on submit button when isLoading is true', () => {
      renderWithProviders(<ForgotPasswordForm {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: 'Sending...' })).toBeInTheDocument();
    });

    it('disables submit button when isLoading is true', () => {
      renderWithProviders(<ForgotPasswordForm {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
    });

    it('disables email input when isLoading is true', () => {
      renderWithProviders(<ForgotPasswordForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText('Email')).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error prop is provided', () => {
      renderWithProviders(<ForgotPasswordForm {...defaultProps} error="Email not found" />);

      expect(screen.getByText('Email not found')).toBeInTheDocument();
      expect(screen.getByText('Email not found')).toHaveClass('auth-form-error');
    });

    it('does not display error container when error is null', () => {
      renderWithProviders(<ForgotPasswordForm {...defaultProps} error={null} />);

      expect(screen.queryByText('Email not found')).not.toBeInTheDocument();
    });

    it('handles rejected promise from onForgotPassword gracefully', async () => {
      const mockOnForgotPassword = vi.fn().mockRejectedValue(new Error('Network error'));
      renderWithProviders(
        <ForgotPasswordForm {...defaultProps} onForgotPassword={mockOnForgotPassword} />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

      await waitFor(() => {
        expect(mockOnForgotPassword).toHaveBeenCalled();
      });

      // Should not throw, error is caught
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      renderWithProviders(<ForgotPasswordForm {...defaultProps} />);

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass('auth-form-fields');
    });

    it('has accessible email input with label', () => {
      renderWithProviders(<ForgotPasswordForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeInTheDocument();
    });

    it('submit button is accessible', () => {
      renderWithProviders(<ForgotPasswordForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Send reset link' });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });
});
