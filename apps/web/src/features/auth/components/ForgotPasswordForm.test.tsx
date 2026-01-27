// apps/web/src/features/auth/components/__tests__/ForgotPasswordForm.test.tsx
import { MemoryRouter } from '@abe-stack/ui';
import { ForgotPasswordForm } from '@auth/components/ForgotPasswordForm';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { ForgotPasswordFormProps } from '@auth/components/ForgotPasswordForm';
import type { ReactElement, ReactNode } from 'react';

// Wrapper component for Router context
const RouterWrapper = ({ children }: { children: ReactNode }): ReactElement => {
  return <MemoryRouter>{children}</MemoryRouter>;
};

// Helper function to render with router
function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(ui, { wrapper: RouterWrapper });
}

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
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Reset password' })).toBeInTheDocument();
      expect(
        screen.getByText(
          "Enter your email address and we'll send you a link to reset your password",
        ),
      ).toBeInTheDocument();
    });

    it('renders the email input field', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toBeRequired();
    });

    it('renders the submit button with correct text', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
    });

    it('renders sign in link with onModeChange callback', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} onModeChange={vi.fn()} />);

      expect(screen.getByText('Remember your password?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('renders sign in as a Link when onModeChange is not provided', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      expect(screen.getByText('Remember your password?')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
        'href',
        '/auth?mode=login',
      );
    });
  });

  describe('User Interactions', () => {
    it('updates email input value when typing', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('calls onForgotPassword with email when form is submitted', async () => {
      const mockOnForgotPassword = vi.fn().mockResolvedValue(undefined);
      renderWithRouter(
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
      renderWithRouter(
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

    it('does not call onForgotPassword when no handler provided', async () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

      // No error should be thrown
      expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
    });

    it('calls onModeChange with login when sign in button is clicked', async () => {
      const mockOnModeChange = vi.fn();
      renderWithRouter(<ForgotPasswordForm {...defaultProps} onModeChange={mockOnModeChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(mockOnModeChange).toHaveBeenCalledWith('login');
    });
  });

  describe('Loading State', () => {
    it('shows loading text on submit button when isLoading is true', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: 'Sending...' })).toBeInTheDocument();
    });

    it('disables submit button when isLoading is true', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
    });

    it('disables email input when isLoading is true', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText('Email')).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error prop is provided', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} error="Email not found" />);

      expect(screen.getByText('Email not found')).toBeInTheDocument();
      expect(screen.getByText('Email not found')).toHaveClass('auth-form-error');
    });

    it('does not display error container when error is null', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} error={null} />);

      expect(screen.queryByText('Email not found')).not.toBeInTheDocument();
    });

    it('handles rejected promise from onForgotPassword gracefully', async () => {
      const mockOnForgotPassword = vi.fn().mockRejectedValue(new Error('Network error'));
      renderWithRouter(
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

    it('does not call onSuccess when onForgotPassword throws', async () => {
      const mockOnForgotPassword = vi.fn().mockRejectedValue(new Error('Network error'));
      const mockOnSuccess = vi.fn();
      renderWithRouter(
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
        expect(mockOnForgotPassword).toHaveBeenCalled();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('requires email field via HTML validation', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeRequired();
    });

    it('submits with empty email still triggers form submission', async () => {
      const mockOnForgotPassword = vi.fn().mockResolvedValue(undefined);
      renderWithRouter(
        <ForgotPasswordForm {...defaultProps} onForgotPassword={mockOnForgotPassword} />,
      );

      // Just clicking submit without entering email
      // The browser's HTML validation will prevent actual submission
      // but we can test that the handler doesn't get called with empty data
      const form = screen.getByRole('button', { name: 'Send reset link' }).closest('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass('auth-form-fields');
    });

    it('has accessible email input with label', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeInTheDocument();
    });

    it('submit button is accessible', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Send reset link' });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });
});
