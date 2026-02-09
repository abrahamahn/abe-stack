// apps/web/src/test/integration/auth-page.test.tsx
/**
 * Integration tests for the AuthPage component.
 *
 * Tests:
 * - URL parameter handling for mode switching
 * - Mode switching between login/register/forgot-password
 * - Reset password flow with token
 */

import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthPage } from '../../features/auth';
import { renderWithProviders } from '../utils';

// Mock the toastStore - use importOriginal to keep other exports
vi.mock('@abe-stack/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...actual,
    toastStore: {
      getState: () => ({
        show: vi.fn(),
      }),
    },
  };
});

// Mock useAuth hook with verification capabilities
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockForgotPassword = vi.fn();
const mockResetPassword = vi.fn();
const mockResendVerification = vi.fn();
const mockNavigateToMode = vi.fn();
const mockNavigateToLogin = vi.fn();
const mockStartCooldown = vi.fn();

vi.mock('../../features/auth/hooks', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
    forgotPassword: mockForgotPassword,
    resetPassword: mockResetPassword,
    resendVerification: mockResendVerification,
    isAuthenticated: false,
    user: null,
    isLoading: false,
  }),
  useAuthModeNavigation: () => ({
    navigateToMode: mockNavigateToMode,
    navigateToLogin: mockNavigateToLogin,
  }),
}));

vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();
  return {
    ...actual,
    useResendCooldown: () => ({
      cooldown: 0,
      isOnCooldown: false,
      startCooldown: mockStartCooldown,
    }),
  };
});

describe('AuthPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue(undefined);
    mockRegister.mockResolvedValue({ message: 'Check email', email: 'test@example.com' });
    mockForgotPassword.mockResolvedValue({ message: 'Email sent' });
    mockResetPassword.mockResolvedValue({ message: 'Password reset' });
    mockResendVerification.mockResolvedValue({ message: 'Sent' });
    mockNavigateToMode.mockReturnValue(undefined);
    mockNavigateToLogin.mockReturnValue(undefined);
    mockStartCooldown.mockReturnValue(undefined);
  });

  // ============================================================================
  // Mode Parameter Tests
  // ============================================================================

  describe('Mode URL Parameter', () => {
    it('should render login form by default', () => {
      renderWithProviders(<AuthPage />, { route: '/auth' });

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render login form when mode=login', () => {
      renderWithProviders(<AuthPage />, { route: '/auth?mode=login' });

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });

    it('should render register form when mode=register', () => {
      renderWithProviders(<AuthPage />, { route: '/auth?mode=register' });

      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render forgot password form when mode=forgot-password', () => {
      renderWithProviders(<AuthPage />, { route: '/auth?mode=forgot-password' });

      expect(screen.getByText('Reset password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('should render reset password form when mode=reset-password with token', () => {
      renderWithProviders(<AuthPage />, { route: '/auth?mode=reset-password&token=test-token' });

      expect(screen.getByText('Set new password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    });

    it('should fallback to login for invalid mode', () => {
      renderWithProviders(<AuthPage />, { route: '/auth?mode=invalid' });

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Mode Switching Tests
  // ============================================================================

  describe('Mode Switching', () => {
    it('should switch from login to register mode', async () => {
      const { user } = renderWithProviders(<AuthPage />, { route: '/auth?mode=login' });

      expect(screen.getByText('Welcome back')).toBeInTheDocument();

      const signUpButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(signUpButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      });
    });

    it('should switch from register to login mode', async () => {
      const { user } = renderWithProviders(<AuthPage />, { route: '/auth?mode=register' });

      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Form Submission Tests
  // ============================================================================

  describe('Form Submissions', () => {
    it('should call login with credentials', async () => {
      const { user } = renderWithProviders(<AuthPage />, { route: '/auth?mode=login' });

      await user.type(screen.getByLabelText('Email or Username'), 'user@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          identifier: 'user@example.com',
          password: 'password123',
        });
      });
    });

    it('should call register with form data', async () => {
      const { user } = renderWithProviders(<AuthPage />, { route: '/auth?mode=register' });

      await user.type(screen.getByLabelText('Email'), 'new@example.com');
      await user.type(screen.getByLabelText('Username'), 'newuser');
      await user.type(screen.getByLabelText('First Name'), 'New');
      await user.type(screen.getByLabelText('Last Name'), 'User');
      await user.type(screen.getByLabelText('Password'), 'newpass123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'new@example.com',
          username: 'newuser',
          firstName: 'New',
          lastName: 'User',
          password: 'newpass123',
        });
      });
    });

    it('should call forgotPassword with email', async () => {
      const { user } = renderWithProviders(<AuthPage />, { route: '/auth?mode=forgot-password' });

      await user.type(screen.getByLabelText('Email'), 'forgot@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith({
          email: 'forgot@example.com',
        });
      });
    });
  });

  // ============================================================================
  // Reset Password Flow Tests
  // ============================================================================

  describe('Reset Password Flow', () => {
    it('should show invalid link message when token is missing', () => {
      renderWithProviders(<AuthPage />, { route: '/auth?mode=reset-password' });

      expect(screen.getByText('Invalid reset link')).toBeInTheDocument();
    });

    it('should show reset form when token is present', () => {
      renderWithProviders(<AuthPage />, { route: '/auth?mode=reset-password&token=valid-token' });

      expect(screen.getByLabelText('New password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    });

    it('should call resetPassword with token and new password', async () => {
      const { user } = renderWithProviders(<AuthPage />, {
        route: '/auth?mode=reset-password&token=reset-token-123',
      });

      await user.type(screen.getByLabelText('New password'), 'newSecurePass123');
      await user.click(screen.getByRole('button', { name: /update password/i }));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith({
          token: 'reset-token-123',
          password: 'newSecurePass123',
        });
      });
    });
  });

  // ============================================================================
  // Loading States Tests
  // ============================================================================

  describe('Loading States', () => {
    it('should show loading state during login', async () => {
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockImplementation(async () => {
        await loginPromise;
      });

      const { user } = renderWithProviders(<AuthPage />, { route: '/auth?mode=login' });

      await user.type(screen.getByLabelText('Email or Username'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

      resolveLogin!();
    });

    it('should disable form fields during submission', async () => {
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockImplementation(async () => {
        await loginPromise;
      });

      const { user } = renderWithProviders(<AuthPage />, { route: '/auth?mode=login' });

      await user.type(screen.getByLabelText('Email or Username'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Email or Username')).toBeDisabled();
        expect(screen.getByLabelText('Password')).toBeDisabled();
      });

      resolveLogin!();
    });
  });

  // ============================================================================
  // Error Display Tests
  // ============================================================================

  describe('Error Display', () => {
    it('should display login error message', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid email or password'));

      const { user } = renderWithProviders(<AuthPage />, { route: '/auth?mode=login' });

      await user.type(screen.getByLabelText('Email or Username'), 'wrong@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });

    it('should display registration error message', async () => {
      mockRegister.mockRejectedValue(new Error('Email already in use'));

      const { user } = renderWithProviders(<AuthPage />, { route: '/auth?mode=register' });

      await user.type(screen.getByLabelText('Email'), 'existing@example.com');
      await user.type(screen.getByLabelText('Username'), 'existinguser');
      await user.type(screen.getByLabelText('First Name'), 'Existing');
      await user.type(screen.getByLabelText('Last Name'), 'User');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Email already in use')).toBeInTheDocument();
      });
    });
  });
});
