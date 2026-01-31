// apps/web/src/features/auth/components/AuthForms.test.tsx
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthForm, ForgotPasswordForm, LoginForm, RegisterForm, ResetPasswordForm } from './';

import { renderWithProviders } from './../../../__tests__/utils';

import type { ReactElement } from 'react';

// Helper function to render with providers
function renderWithRouter(ui: ReactElement) {
  return renderWithProviders(ui);
}

describe('AuthForms', () => {
  describe('LoginForm', () => {
    it('renders login form correctly', () => {
      // Pass onForgotPassword to show the forgot password link
      renderWithRouter(<LoginForm onForgotPassword={vi.fn()} />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
      expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
    });

    it('calls onLogin when form is submitted', async () => {
      const mockOnLogin = vi.fn();
      renderWithRouter(<LoginForm onLogin={mockOnLogin} />);

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

    it('shows error message', () => {
      renderWithRouter(<LoginForm error="Invalid credentials" />);

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('calls onForgotPassword when forgot password is clicked', () => {
      const mockOnForgotPassword = vi.fn();
      renderWithRouter(<LoginForm onForgotPassword={mockOnForgotPassword} />);

      fireEvent.click(screen.getByText('Forgot your password?'));

      expect(mockOnForgotPassword).toHaveBeenCalledWith({ email: '' });
    });
  });

  describe('RegisterForm', () => {
    it('renders register form correctly', () => {
      renderWithRouter(<RegisterForm />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Name (optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    });

    it('calls onRegister when form is submitted', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue({
        email: 'test@example.com',
        message: 'Check your email',
      });
      renderWithRouter(<RegisterForm onRegister={mockOnRegister} />);

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Name (optional)'), {
        target: { value: 'Test User' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalledWith({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123',
        });
      });
    });

    it('submits without name when optional', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue({
        email: 'test@example.com',
        message: 'Check your email',
      });
      renderWithRouter(<RegisterForm onRegister={mockOnRegister} />);

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('ForgotPasswordForm', () => {
    it('renders forgot password form correctly', () => {
      renderWithRouter(<ForgotPasswordForm />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
      expect(
        screen.getByText(
          "Enter your email address and we'll send you a link to reset your password",
        ),
      ).toBeInTheDocument();
    });

    it('calls onForgotPassword when form is submitted', async () => {
      const mockOnForgotPassword = vi.fn();
      renderWithRouter(<ForgotPasswordForm onForgotPassword={mockOnForgotPassword} />);

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
  });

  describe('ResetPasswordForm', () => {
    it('renders reset password form correctly with valid token', () => {
      renderWithRouter(<ResetPasswordForm initialData={{ token: 'valid-token' }} />);

      expect(screen.getByLabelText('New password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Update password' })).toBeInTheDocument();
      expect(screen.getByText('Enter your new password')).toBeInTheDocument();
    });

    it('calls onResetPassword when form is submitted', async () => {
      const mockOnResetPassword = vi.fn();
      renderWithRouter(
        <ResetPasswordForm
          onResetPassword={mockOnResetPassword}
          initialData={{ token: 'valid-token' }}
        />,
      );

      fireEvent.change(screen.getByLabelText('New password'), {
        target: { value: 'newpassword123' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

      await waitFor(() => {
        expect(mockOnResetPassword).toHaveBeenCalledWith({
          token: 'valid-token',
          password: 'newpassword123',
        });
      });
    });

    it('shows invalid link message when token is missing', () => {
      renderWithRouter(<ResetPasswordForm />);

      expect(screen.getByText('Invalid reset link')).toBeInTheDocument();
      expect(
        screen.getByText('This password reset link is invalid or has expired.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Request a new reset link' })).toBeInTheDocument();
    });
  });

  describe('AuthForm', () => {
    it('renders LoginForm by default', () => {
      renderWithRouter(<AuthForm mode="login" />);

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('renders RegisterForm when mode is register', () => {
      renderWithRouter(<AuthForm mode="register" />);

      expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    });

    it('renders ForgotPasswordForm when mode is forgot-password', () => {
      renderWithRouter(<AuthForm mode="forgot-password" />);

      expect(screen.getByText('Reset password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
    });

    it('renders ResetPasswordForm when mode is reset-password', () => {
      renderWithRouter(<AuthForm mode="reset-password" initialData={{ token: 'test-token' }} />);

      expect(screen.getByText('Set new password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Update password' })).toBeInTheDocument();
    });
  });
});
