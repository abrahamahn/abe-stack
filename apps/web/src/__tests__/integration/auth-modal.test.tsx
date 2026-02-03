// apps/web/src/__tests__/integration/auth-modal.test.tsx
/**
 * Integration tests for the AuthModal component.
 *
 * Tests:
 * - Modal open/close behavior
 * - Mode switching within modal
 * - Form submissions in modal context
 * - Auto-close on success
 */

import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthModal } from '../../features/auth';

import { renderWithProviders } from '../utils';

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

describe('AuthModal Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue(undefined);
    mockRegister.mockResolvedValue({ message: 'Check email', email: 'test@example.com' });
    mockForgotPassword.mockResolvedValue({ message: 'Email sent' });
    mockResetPassword.mockResolvedValue({ message: 'Password reset' });
    mockResendVerification.mockResolvedValue({ message: 'Sent' });
  });

  // ============================================================================
  // Modal Open/Close Tests
  // ============================================================================

  describe('Modal Open/Close', () => {
    it('should render modal when open is true', () => {
      const onOpenChange = vi.fn();
      renderWithProviders(<AuthModal open={true} onOpenChange={onOpenChange} />);

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });

    it('should not render modal content when open is false', () => {
      const onOpenChange = vi.fn();
      renderWithProviders(<AuthModal open={false} onOpenChange={onOpenChange} />);

      expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Initial Mode Tests
  // ============================================================================

  describe('Initial Mode', () => {
    it('should render login form by default', () => {
      renderWithProviders(<AuthModal open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render login form when initialMode is login', () => {
      renderWithProviders(<AuthModal open={true} onOpenChange={vi.fn()} initialMode="login" />);

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });

    it('should render forgot password form when initialMode is forgot-password', () => {
      renderWithProviders(
        <AuthModal open={true} onOpenChange={vi.fn()} initialMode="forgot-password" />,
      );

      expect(screen.getByText('Reset password')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Form Submission in Modal Tests
  // ============================================================================

  describe('Form Submission', () => {
    it('should call login on form submission', async () => {
      const { user } = renderWithProviders(
        <AuthModal open={true} onOpenChange={vi.fn()} initialMode="login" />,
      );

      await user.type(screen.getByLabelText('Email'), 'modal@example.com');
      await user.type(screen.getByLabelText('Password'), 'modalpass123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'modal@example.com',
          password: 'modalpass123',
        });
      });
    });

    it('should close modal on successful login', async () => {
      const onOpenChange = vi.fn();

      const { user } = renderWithProviders(
        <AuthModal open={true} onOpenChange={onOpenChange} initialMode="login" />,
      );

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should call onSuccess callback on successful login', async () => {
      const onSuccess = vi.fn();

      const { user } = renderWithProviders(
        <AuthModal open={true} onOpenChange={vi.fn()} initialMode="login" onSuccess={onSuccess} />,
      );

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // Loading State in Modal Tests
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

      const { user } = renderWithProviders(
        <AuthModal open={true} onOpenChange={vi.fn()} initialMode="login" />,
      );

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

      resolveLogin!();
    });

    it('should disable inputs during loading', async () => {
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockImplementation(async () => {
        await loginPromise;
      });

      const { user } = renderWithProviders(
        <AuthModal open={true} onOpenChange={vi.fn()} initialMode="login" />,
      );

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Email')).toBeDisabled();
        expect(screen.getByLabelText('Password')).toBeDisabled();
      });

      resolveLogin!();
    });
  });

  // ============================================================================
  // Error Display in Modal Tests
  // ============================================================================

  describe('Error Display', () => {
    it('should display error message in modal', async () => {
      mockLogin.mockRejectedValue(new Error('Modal login error'));

      const { user } = renderWithProviders(
        <AuthModal open={true} onOpenChange={vi.fn()} initialMode="login" />,
      );

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Modal login error')).toBeInTheDocument();
      });
    });

    it('should not close modal on error', async () => {
      mockLogin.mockRejectedValue(new Error('Login failed'));
      const onOpenChange = vi.fn();

      const { user } = renderWithProviders(
        <AuthModal open={true} onOpenChange={onOpenChange} initialMode="login" />,
      );

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });

      // Modal should not close on error
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have dialog role with aria-modal', () => {
      renderWithProviders(<AuthModal open={true} onOpenChange={vi.fn()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should trap focus within modal when open', async () => {
      const { user } = renderWithProviders(
        <AuthModal open={true} onOpenChange={vi.fn()} initialMode="login" />,
      );

      // Get the modal dialog
      const dialog = screen.getByRole('dialog');
      const emailInput = screen.getByLabelText('Email');

      // Focus the email input first
      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      // Tab through all focusable elements in the modal
      // The modal may contain: email input, password input, show/hide password toggle, submit button, mode switch buttons
      // We don't need to check exact order, just that focus stays within the modal

      // Tab several times to cycle through all elements
      for (let i = 0; i < 10; i++) {
        await user.tab();
        // Focus should always stay within the modal (focus trap)
        expect(dialog.contains(document.activeElement)).toBe(true);
      }

      // Also test shift+tab to go backwards
      for (let i = 0; i < 5; i++) {
        await user.tab({ shift: true });
        expect(dialog.contains(document.activeElement)).toBe(true);
      }
    });

    it('should close modal when Escape key is pressed', async () => {
      const onOpenChange = vi.fn();
      const { user } = renderWithProviders(
        <AuthModal open={true} onOpenChange={onOpenChange} initialMode="login" />,
      );

      // Press Escape key
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should have accessible form labels', () => {
      renderWithProviders(<AuthModal open={true} onOpenChange={vi.fn()} initialMode="login" />);

      // Verify inputs have associated labels
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      expect(emailInput).toHaveAccessibleName('Email');
      expect(passwordInput).toHaveAccessibleName('Password');
    });

    it('should have accessible submit button', () => {
      renderWithProviders(<AuthModal open={true} onOpenChange={vi.fn()} initialMode="login" />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveAccessibleName();
      expect(submitButton).toBeEnabled();
    });
  });
});
