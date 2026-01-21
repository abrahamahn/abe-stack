// apps/web/src/features/auth/components/__tests__/ResetPasswordForm.test.tsx
import { ResetPasswordForm } from '@auth/components/ResetPasswordForm';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { ResetPasswordFormProps } from '@auth/components/ResetPasswordForm';
import type { ReactElement, ReactNode } from 'react';

// Wrapper component for Router context
function RouterWrapper({ children }: { children: ReactNode }): ReactElement {
  return <MemoryRouter>{children}</MemoryRouter>;
}

// Helper function to render with router
function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(ui, { wrapper: RouterWrapper });
}

describe('ResetPasswordForm', () => {
  const defaultProps: ResetPasswordFormProps = {
    onResetPassword: vi.fn(),
    onSuccess: vi.fn(),
    onModeChange: vi.fn(),
    initialData: { token: 'valid-reset-token' },
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Valid Token - Form Rendering', () => {
    it('renders the form title and subtitle correctly', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Set new password' })).toBeInTheDocument();
      expect(screen.getByText('Enter your new password')).toBeInTheDocument();
    });

    it('renders the password input field', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('New password');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toBeRequired();
    });

    it('renders the submit button with correct text', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Update password' })).toBeInTheDocument();
    });

    it('renders back to sign in link with onModeChange callback', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} onModeChange={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Back to sign in' })).toBeInTheDocument();
    });

    it('renders back to sign in as a Link when onModeChange is not provided', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} onModeChange={undefined} />);

      expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
        'href',
        '/auth?mode=login',
      );
    });
  });

  describe('Invalid/Missing Token - Error View', () => {
    it('shows invalid link message when token is missing', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} initialData={undefined} />);

      expect(screen.getByRole('heading', { name: 'Invalid reset link' })).toBeInTheDocument();
      expect(
        screen.getByText('This password reset link is invalid or has expired.'),
      ).toBeInTheDocument();
    });

    it('shows invalid link message when token is undefined in initialData', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} initialData={{}} />);

      expect(screen.getByRole('heading', { name: 'Invalid reset link' })).toBeInTheDocument();
    });

    it('shows request new link button with onModeChange', () => {
      const mockOnModeChange = vi.fn();
      renderWithRouter(
        <ResetPasswordForm
          {...defaultProps}
          initialData={undefined}
          onModeChange={mockOnModeChange}
        />,
      );

      expect(screen.getByRole('button', { name: 'Request a new reset link' })).toBeInTheDocument();
    });

    it('calls onModeChange with forgot-password when request new link is clicked', () => {
      const mockOnModeChange = vi.fn();
      renderWithRouter(
        <ResetPasswordForm
          {...defaultProps}
          initialData={undefined}
          onModeChange={mockOnModeChange}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Request a new reset link' }));

      expect(mockOnModeChange).toHaveBeenCalledWith('forgot-password');
    });

    it('shows request new link as a Link when onModeChange is not provided', () => {
      renderWithRouter(
        <ResetPasswordForm {...defaultProps} initialData={undefined} onModeChange={undefined} />,
      );

      expect(screen.getByRole('link', { name: 'Request a new reset link' })).toHaveAttribute(
        'href',
        '/auth?mode=forgot-password',
      );
    });

    it('does not render password form when token is missing', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} initialData={undefined} />);

      expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Update password' })).not.toBeInTheDocument();
    });
  });

  describe('User Interactions - Valid Token', () => {
    it('updates password input value when typing', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('New password');
      await user.type(passwordInput, 'newSecretPassword123');

      expect(passwordInput).toHaveValue('newSecretPassword123');
    });

    it('calls onResetPassword with token and password when form is submitted', async () => {
      const mockOnResetPassword = vi.fn().mockResolvedValue(undefined);
      renderWithRouter(
        <ResetPasswordForm {...defaultProps} onResetPassword={mockOnResetPassword} />,
      );

      fireEvent.change(screen.getByLabelText('New password'), {
        target: { value: 'newpassword123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

      await waitFor(() => {
        expect(mockOnResetPassword).toHaveBeenCalledWith({
          token: 'valid-reset-token',
          password: 'newpassword123',
        });
      });
    });

    it('calls onSuccess after successful password reset', async () => {
      const mockOnResetPassword = vi.fn().mockResolvedValue(undefined);
      const mockOnSuccess = vi.fn();
      renderWithRouter(
        <ResetPasswordForm
          {...defaultProps}
          onResetPassword={mockOnResetPassword}
          onSuccess={mockOnSuccess}
        />,
      );

      fireEvent.change(screen.getByLabelText('New password'), {
        target: { value: 'newpassword123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('does not call onResetPassword when no handler provided', async () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} onResetPassword={undefined} />);

      fireEvent.change(screen.getByLabelText('New password'), {
        target: { value: 'newpassword123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

      // No error should be thrown, form should still be visible
      expect(screen.getByLabelText('New password')).toHaveValue('newpassword123');
    });

    it('does not render form when token is missing', () => {
      // This shouldn't happen in practice since the form isn't rendered without token,
      // but we test that the form handles missing initialData gracefully
      renderWithRouter(<ResetPasswordForm {...defaultProps} initialData={undefined} />);

      // The form isn't rendered, so the password field shouldn't be present
      expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
    });

    it('calls onModeChange with login when back to sign in is clicked', () => {
      const mockOnModeChange = vi.fn();
      renderWithRouter(<ResetPasswordForm {...defaultProps} onModeChange={mockOnModeChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Back to sign in' }));

      expect(mockOnModeChange).toHaveBeenCalledWith('login');
    });
  });

  describe('Loading State', () => {
    it('shows loading text on submit button when isLoading is true', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: 'Updating...' })).toBeInTheDocument();
    });

    it('disables submit button when isLoading is true', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled();
    });

    it('disables password input when isLoading is true', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText('New password')).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error prop is provided', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} error="Token expired" />);

      expect(screen.getByText('Token expired')).toBeInTheDocument();
      expect(screen.getByText('Token expired')).toHaveClass('auth-form-error');
    });

    it('does not display error container when error is null', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} error={null} />);

      expect(screen.queryByText('Token expired')).not.toBeInTheDocument();
    });

    it('handles rejected promise from onResetPassword gracefully', async () => {
      const mockOnResetPassword = vi.fn().mockRejectedValue(new Error('Network error'));
      renderWithRouter(
        <ResetPasswordForm {...defaultProps} onResetPassword={mockOnResetPassword} />,
      );

      fireEvent.change(screen.getByLabelText('New password'), {
        target: { value: 'newpassword123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

      await waitFor(() => {
        expect(mockOnResetPassword).toHaveBeenCalled();
      });

      // Should not throw, error is caught
      expect(screen.getByLabelText('New password')).toBeInTheDocument();
    });

    it('does not call onSuccess when onResetPassword throws', async () => {
      const mockOnResetPassword = vi.fn().mockRejectedValue(new Error('Network error'));
      const mockOnSuccess = vi.fn();
      renderWithRouter(
        <ResetPasswordForm
          {...defaultProps}
          onResetPassword={mockOnResetPassword}
          onSuccess={mockOnSuccess}
        />,
      );

      fireEvent.change(screen.getByLabelText('New password'), {
        target: { value: 'newpassword123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

      await waitFor(() => {
        expect(mockOnResetPassword).toHaveBeenCalled();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('requires password field via HTML validation', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('New password');
      expect(passwordInput).toBeRequired();
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure when token is valid', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass('auth-form-fields');
    });

    it('has accessible password input with label', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('New password');
      expect(passwordInput).toBeInTheDocument();
    });

    it('submit button is accessible', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Update password' });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('invalid token view has proper heading', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} initialData={undefined} />);

      const heading = screen.getByRole('heading', { name: 'Invalid reset link' });
      expect(heading).toHaveClass('auth-form-title');
      expect(heading).toHaveClass('text-danger');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty token string as invalid', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} initialData={{ token: '' }} />);

      // Empty string is falsy, so should show invalid view
      expect(screen.getByRole('heading', { name: 'Invalid reset link' })).toBeInTheDocument();
    });

    it('uses provided token from initialData', async () => {
      const mockOnResetPassword = vi.fn().mockResolvedValue(undefined);
      renderWithRouter(
        <ResetPasswordForm
          {...defaultProps}
          onResetPassword={mockOnResetPassword}
          initialData={{ token: 'custom-token-123' }}
        />,
      );

      fireEvent.change(screen.getByLabelText('New password'), {
        target: { value: 'newpassword123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

      await waitFor(() => {
        expect(mockOnResetPassword).toHaveBeenCalledWith({
          token: 'custom-token-123',
          password: 'newpassword123',
        });
      });
    });
  });
});
