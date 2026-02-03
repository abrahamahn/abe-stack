// apps/web/src/features/auth/components/LoginForm.test.tsx
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock SDK hooks before imports
vi.mock('@abe-stack/engine', async () => {
  const actual = await vi.importActual('@abe-stack/engine');
  return {
    ...actual,
    useEnabledOAuthProviders: () => ({
      providers: [],
      isLoading: false,
      error: null,
    }),
    getOAuthLoginUrl: (baseUrl: string, provider: string) => `${baseUrl}/auth/${provider}`,
  };
});

import { LoginForm } from './LoginForm';

import { renderWithProviders } from './../../../__tests__/utils';

import type { ReactElement } from 'react';
import type { LoginFormProps } from './LoginForm';

// Helper function to render with providers
function renderWithRouter(ui: ReactElement) {
  return renderWithProviders(ui);
}

describe('LoginForm', () => {
  const defaultProps: LoginFormProps = {
    onLogin: vi.fn(),
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
      renderWithRouter(<LoginForm {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });

    it('renders the email input field', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toBeRequired();
    });

    it('renders the password input field', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toBeRequired();
    });

    it('renders the submit button with correct text', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('renders forgot password button when onForgotPassword is provided', () => {
      renderWithRouter(<LoginForm {...defaultProps} onForgotPassword={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Forgot your password?' })).toBeInTheDocument();
    });

    it('renders sign up link with onModeChange callback', () => {
      renderWithRouter(<LoginForm {...defaultProps} onModeChange={vi.fn()} />);

      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    });

    it('renders sign up as a Link when onModeChange is not provided', () => {
      renderWithRouter(<LoginForm {...defaultProps} onModeChange={undefined as any} />);

      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
        'href',
        '/auth?mode=register',
      );
    });
  });

  describe('User Interactions', () => {
    it('updates email input value when typing', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('updates password input value when typing', async () => {
      const user = userEvent.setup();
      renderWithRouter(<LoginForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'secretpassword');

      expect(passwordInput).toHaveValue('secretpassword');
    });

    it('calls onLogin with email and password when form is submitted', async () => {
      const mockOnLogin = vi.fn().mockResolvedValue(undefined);
      renderWithRouter(<LoginForm {...defaultProps} onLogin={mockOnLogin} />);

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('calls onSuccess after successful login', async () => {
      const mockOnLogin = vi.fn().mockResolvedValue(undefined);
      const mockOnSuccess = vi.fn();
      renderWithRouter(
        <LoginForm {...defaultProps} onLogin={mockOnLogin} onSuccess={mockOnSuccess} />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('does not call onLogin when no handler provided', async () => {
      renderWithRouter(<LoginForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      // No error should be thrown
      expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
    });

    it('calls onForgotPassword with current email when forgot password is clicked', () => {
      const mockOnForgotPassword = vi.fn();
      const mockOnModeChange = vi.fn();
      renderWithRouter(
        <LoginForm
          {...defaultProps}
          onForgotPassword={mockOnForgotPassword}
          onModeChange={mockOnModeChange}
        />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));

      expect(mockOnForgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('calls onModeChange with forgot-password when forgot password is clicked', () => {
      const mockOnForgotPassword = vi.fn();
      const mockOnModeChange = vi.fn();
      renderWithRouter(
        <LoginForm
          {...defaultProps}
          onForgotPassword={mockOnForgotPassword}
          onModeChange={mockOnModeChange}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));

      expect(mockOnModeChange).toHaveBeenCalledWith('forgot-password');
    });

    it('calls onModeChange with register when sign up button is clicked', () => {
      const mockOnModeChange = vi.fn();
      renderWithRouter(<LoginForm {...defaultProps} onModeChange={mockOnModeChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

      expect(mockOnModeChange).toHaveBeenCalledWith('register');
    });
  });

  describe('Loading State', () => {
    it('shows loading text on submit button when isLoading is true', () => {
      renderWithRouter(<LoginForm {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: 'Signing in...' })).toBeInTheDocument();
    });

    it('disables submit button when isLoading is true', () => {
      renderWithRouter(<LoginForm {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
    });

    it('disables email input when isLoading is true', () => {
      renderWithRouter(<LoginForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText('Email')).toBeDisabled();
    });

    it('disables password input when isLoading is true', () => {
      renderWithRouter(<LoginForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText('Password')).toBeDisabled();
    });

    it('disables forgot password button when isLoading is true', () => {
      renderWithRouter(<LoginForm {...defaultProps} isLoading={true} onForgotPassword={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Forgot your password?' })).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error prop is provided', () => {
      renderWithRouter(<LoginForm {...defaultProps} error="Invalid credentials" />);

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      expect(screen.getByText('Invalid credentials')).toHaveClass('auth-form-error');
    });

    it('does not display error container when error is null', () => {
      renderWithRouter(<LoginForm {...defaultProps} error={null} />);

      expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
    });

    it('handles rejected promise from onLogin gracefully', async () => {
      const mockOnLogin = vi.fn().mockRejectedValue(new Error('Network error'));
      renderWithRouter(<LoginForm {...defaultProps} onLogin={mockOnLogin} />);

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalled();
      });

      // Should not throw, error is caught
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('does not call onSuccess when onLogin throws', async () => {
      const mockOnLogin = vi.fn().mockRejectedValue(new Error('Network error'));
      const mockOnSuccess = vi.fn();
      renderWithRouter(
        <LoginForm {...defaultProps} onLogin={mockOnLogin} onSuccess={mockOnSuccess} />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalled();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('requires email field via HTML validation', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeRequired();
    });

    it('requires password field via HTML validation', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeRequired();
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass('auth-form-fields');
    });

    it('has accessible email input with label', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeInTheDocument();
    });

    it('has accessible password input with label', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeInTheDocument();
    });

    it('submit button is accessible', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Sign in' });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty email when forgot password is clicked', () => {
      const mockOnForgotPassword = vi.fn();
      renderWithRouter(<LoginForm {...defaultProps} onForgotPassword={mockOnForgotPassword} />);

      fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));

      expect(mockOnForgotPassword).toHaveBeenCalledWith({ email: '' });
    });

    it('does not call onModeChange for forgot password if not provided', () => {
      const mockOnForgotPassword = vi.fn();
      renderWithRouter(<LoginForm {...defaultProps} onForgotPassword={mockOnForgotPassword} />);

      fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));

      // onForgotPassword should still be called
      expect(mockOnForgotPassword).toHaveBeenCalledWith({ email: '' });
    });
  });
});
