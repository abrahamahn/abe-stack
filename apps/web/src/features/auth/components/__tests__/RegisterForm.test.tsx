// apps/web/src/features/auth/components/__tests__/RegisterForm.test.tsx
import { RegisterForm } from '@auth/components/RegisterForm';
import { useResendCooldown } from '@auth/hooks';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { RegisterResponse } from '@abe-stack/core';
import type { RegisterFormProps } from '@auth/components/RegisterForm';
import type { ReactElement, ReactNode } from 'react';

// Mock the useResendCooldown hook (vi.mock is hoisted automatically)
vi.mock('@auth/hooks', () => ({
  useResendCooldown: vi.fn(() => ({
    cooldown: 0,
    isOnCooldown: false,
    startCooldown: vi.fn(),
    resetCooldown: vi.fn(),
  })),
}));

// Wrapper component for Router context
function RouterWrapper({ children }: { children: ReactNode }): ReactElement {
  return <MemoryRouter>{children}</MemoryRouter>;
}

// Helper function to render with router
function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(ui, { wrapper: RouterWrapper });
}

describe('RegisterForm', () => {
  const mockRegisterResponse: RegisterResponse = {
    status: 'pending_verification',
    message: 'Please check your email to verify your account.',
    email: 'test@example.com',
  };

  const defaultProps: RegisterFormProps = {
    onRegister: vi.fn(),
    onResendVerification: vi.fn(),
    onSuccess: vi.fn(),
    onModeChange: vi.fn(),
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to default state
    vi.mocked(useResendCooldown).mockReturnValue({
      cooldown: 0,
      isOnCooldown: false,
      startCooldown: vi.fn(),
      resetCooldown: vi.fn(),
    });
  });

  describe('Initial Form Rendering', () => {
    it('renders the form title and subtitle correctly', () => {
      renderWithRouter(<RegisterForm {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
      expect(screen.getByText('Sign up for a new account')).toBeInTheDocument();
    });

    it('renders the email input field', () => {
      renderWithRouter(<RegisterForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toBeRequired();
    });

    it('renders the name input field as optional', () => {
      renderWithRouter(<RegisterForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Name (optional)');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute('type', 'text');
      expect(nameInput).not.toBeRequired();
    });

    it('renders the password input field', () => {
      renderWithRouter(<RegisterForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toBeRequired();
    });

    it('renders the submit button with correct text', () => {
      renderWithRouter(<RegisterForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    });

    it('renders sign in link with onModeChange callback', () => {
      renderWithRouter(<RegisterForm {...defaultProps} onModeChange={vi.fn()} />);

      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('renders sign in as a Link when onModeChange is not provided', () => {
      renderWithRouter(<RegisterForm {...defaultProps} onModeChange={undefined} />);

      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
        'href',
        '/auth?mode=login',
      );
    });
  });

  describe('User Interactions - Registration Form', () => {
    it('updates email input value when typing', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RegisterForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('updates name input value when typing', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RegisterForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Name (optional)');
      await user.type(nameInput, 'Test User');

      expect(nameInput).toHaveValue('Test User');
    });

    it('updates password input value when typing', async () => {
      const user = userEvent.setup();
      renderWithRouter(<RegisterForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'secretpassword');

      expect(passwordInput).toHaveValue('secretpassword');
    });

    it('calls onRegister with email, password, and name when form is submitted', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      renderWithRouter(<RegisterForm {...defaultProps} onRegister={mockOnRegister} />);

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

    it('sends undefined for name when not provided', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      renderWithRouter(<RegisterForm {...defaultProps} onRegister={mockOnRegister} />);

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
          name: undefined,
          password: 'password123',
        });
      });
    });

    it('does not call onRegister when no handler provided', async () => {
      renderWithRouter(<RegisterForm {...defaultProps} onRegister={undefined} />);

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      // No error should be thrown
      expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
    });

    it('calls onModeChange with login when sign in button is clicked', () => {
      const mockOnModeChange = vi.fn();
      renderWithRouter(<RegisterForm {...defaultProps} onModeChange={mockOnModeChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(mockOnModeChange).toHaveBeenCalledWith('login');
    });
  });

  describe('Success State - Verification Email Sent', () => {
    it('shows success view after successful registration', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      renderWithRouter(<RegisterForm {...defaultProps} onRegister={mockOnRegister} />);

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
      });
    });

    it('displays registration message in success view', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      renderWithRouter(<RegisterForm {...defaultProps} onRegister={mockOnRegister} />);

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(
          screen.getByText('Please check your email to verify your account.'),
        ).toBeInTheDocument();
      });
    });

    it('displays the email address in success view', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      renderWithRouter(<RegisterForm {...defaultProps} onRegister={mockOnRegister} />);

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('shows resend button when onResendVerification is provided', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      const mockOnResendVerification = vi.fn();
      renderWithRouter(
        <RegisterForm
          {...defaultProps}
          onRegister={mockOnRegister}
          onResendVerification={mockOnResendVerification}
        />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: "Didn't receive it? Resend email" }),
        ).toBeInTheDocument();
      });
    });

    it('does not show resend button when onResendVerification is not provided', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      renderWithRouter(
        <RegisterForm
          {...defaultProps}
          onRegister={mockOnRegister}
          onResendVerification={undefined}
        />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
      });

      expect(
        screen.queryByRole('button', { name: "Didn't receive it? Resend email" }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Resend Verification', () => {
    it('calls onResendVerification when resend button is clicked', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      const mockOnResendVerification = vi.fn().mockResolvedValue(undefined);
      renderWithRouter(
        <RegisterForm
          {...defaultProps}
          onRegister={mockOnRegister}
          onResendVerification={mockOnResendVerification}
        />,
      );

      // First, submit the registration form
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
      });

      // Then click resend
      fireEvent.click(screen.getByRole('button', { name: "Didn't receive it? Resend email" }));

      await waitFor(() => {
        expect(mockOnResendVerification).toHaveBeenCalledWith({
          email: 'test@example.com',
        });
      });
    });

    it('shows success message after resending', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      const mockOnResendVerification = vi.fn().mockResolvedValue(undefined);
      renderWithRouter(
        <RegisterForm
          {...defaultProps}
          onRegister={mockOnRegister}
          onResendVerification={mockOnResendVerification}
        />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: "Didn't receive it? Resend email" }));

      await waitFor(() => {
        expect(
          screen.getByText('Verification email resent! Check your inbox.'),
        ).toBeInTheDocument();
      });
    });

    it('shows error message when resend fails', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      const mockOnResendVerification = vi.fn().mockRejectedValue(new Error('Network error'));
      renderWithRouter(
        <RegisterForm
          {...defaultProps}
          onRegister={mockOnRegister}
          onResendVerification={mockOnResendVerification}
        />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: "Didn't receive it? Resend email" }));

      await waitFor(() => {
        expect(screen.getByText('Failed to resend. Please try again later.')).toBeInTheDocument();
      });
    });

    it('shows cooldown timer when on cooldown', async () => {
      vi.mocked(useResendCooldown).mockReturnValue({
        cooldown: 30,
        isOnCooldown: true,
        startCooldown: vi.fn(),
        resetCooldown: vi.fn(),
      });

      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      const mockOnResendVerification = vi.fn();
      renderWithRouter(
        <RegisterForm
          {...defaultProps}
          onRegister={mockOnRegister}
          onResendVerification={mockOnResendVerification}
        />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Resend in 30s' })).toBeInTheDocument();
      });
    });

    it('disables resend button when on cooldown', async () => {
      vi.mocked(useResendCooldown).mockReturnValue({
        cooldown: 30,
        isOnCooldown: true,
        startCooldown: vi.fn(),
        resetCooldown: vi.fn(),
      });

      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      const mockOnResendVerification = vi.fn();
      renderWithRouter(
        <RegisterForm
          {...defaultProps}
          onRegister={mockOnRegister}
          onResendVerification={mockOnResendVerification}
        />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Resend in 30s' })).toBeDisabled();
      });
    });

    it('calls startCooldown after successful resend', async () => {
      const mockStartCooldown = vi.fn();
      vi.mocked(useResendCooldown).mockReturnValue({
        cooldown: 0,
        isOnCooldown: false,
        startCooldown: mockStartCooldown,
        resetCooldown: vi.fn(),
      });

      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      const mockOnResendVerification = vi.fn().mockResolvedValue(undefined);
      renderWithRouter(
        <RegisterForm
          {...defaultProps}
          onRegister={mockOnRegister}
          onResendVerification={mockOnResendVerification}
        />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: "Didn't receive it? Resend email" }));

      await waitFor(() => {
        expect(mockStartCooldown).toHaveBeenCalled();
      });
    });
  });

  describe('Success View Navigation', () => {
    it('shows sign in button with onModeChange in success view', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      const mockOnModeChange = vi.fn();
      renderWithRouter(
        <RegisterForm
          {...defaultProps}
          onRegister={mockOnRegister}
          onModeChange={mockOnModeChange}
        />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(screen.getByText('Already verified?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
      });
    });

    it('navigates to login when sign in is clicked in success view', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      const mockOnModeChange = vi.fn();
      renderWithRouter(
        <RegisterForm
          {...defaultProps}
          onRegister={mockOnRegister}
          onModeChange={mockOnModeChange}
        />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(mockOnModeChange).toHaveBeenCalledWith('login');
    });
  });

  describe('Loading State', () => {
    it('shows loading text on submit button when isLoading is true', () => {
      renderWithRouter(<RegisterForm {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: 'Creating account...' })).toBeInTheDocument();
    });

    it('disables submit button when isLoading is true', () => {
      renderWithRouter(<RegisterForm {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: 'Creating account...' })).toBeDisabled();
    });

    it('disables email input when isLoading is true', () => {
      renderWithRouter(<RegisterForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText('Email')).toBeDisabled();
    });

    it('disables name input when isLoading is true', () => {
      renderWithRouter(<RegisterForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText('Name (optional)')).toBeDisabled();
    });

    it('disables password input when isLoading is true', () => {
      renderWithRouter(<RegisterForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText('Password')).toBeDisabled();
    });

    it('shows loading text on resend button when resending', async () => {
      const mockOnRegister = vi.fn().mockResolvedValue(mockRegisterResponse);
      // Create a promise that we can control
      let resolveResend: () => void;
      const resendPromise = new Promise<void>((resolve) => {
        resolveResend = resolve;
      });
      const mockOnResendVerification = vi.fn(() => resendPromise);

      renderWithRouter(
        <RegisterForm
          {...defaultProps}
          onRegister={mockOnRegister}
          onResendVerification={mockOnResendVerification}
        />,
      );

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: "Didn't receive it? Resend email" }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Resending...' })).toBeInTheDocument();
      });

      // Resolve the promise to clean up
      resolveResend!();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error prop is provided', () => {
      renderWithRouter(<RegisterForm {...defaultProps} error="Email already exists" />);

      expect(screen.getByText('Email already exists')).toBeInTheDocument();
      expect(screen.getByText('Email already exists')).toHaveClass('auth-form-error');
    });

    it('does not display error container when error is null', () => {
      renderWithRouter(<RegisterForm {...defaultProps} error={null} />);

      expect(screen.queryByText('Email already exists')).not.toBeInTheDocument();
    });

    it('handles rejected promise from onRegister gracefully', async () => {
      const mockOnRegister = vi.fn().mockRejectedValue(new Error('Network error'));
      renderWithRouter(<RegisterForm {...defaultProps} onRegister={mockOnRegister} />);

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalled();
      });

      // Should not throw, error is caught, and form should still be visible
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      renderWithRouter(<RegisterForm {...defaultProps} />);

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass('auth-form-fields');
    });

    it('has accessible email input with label', () => {
      renderWithRouter(<RegisterForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeInTheDocument();
    });

    it('has accessible name input with label', () => {
      renderWithRouter(<RegisterForm {...defaultProps} />);

      const nameInput = screen.getByLabelText('Name (optional)');
      expect(nameInput).toBeInTheDocument();
    });

    it('has accessible password input with label', () => {
      renderWithRouter(<RegisterForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeInTheDocument();
    });

    it('submit button is accessible', () => {
      renderWithRouter(<RegisterForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Create account' });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });
});
