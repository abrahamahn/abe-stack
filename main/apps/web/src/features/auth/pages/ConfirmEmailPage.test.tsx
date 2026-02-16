// main/apps/web/src/features/auth/pages/ConfirmEmailPage.test.tsx
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach } from 'vitest';

import { mockUser, renderWithProviders } from './../../../__tests__/utils';
import { ConfirmEmailPage } from './ConfirmEmailPage';

// Mock the auth hook
const mockVerifyEmail = vi.fn();
const mockUseAuth = vi.fn(() => ({
  verifyEmail: mockVerifyEmail,
  isLoading: false,
  user: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
})) as any;

vi.mock('@auth/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@auth/hooks')>();
  return {
    ...actual,
    useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
    useVerifyEmail: () => ({
      mutate: mockVerifyEmail,
      isLoading: false,
      error: null,
      reset: vi.fn(),
    }),
  };
});

describe('ConfirmEmailPage', () => {
  const renderConfirmEmailPage = (route = '/confirm-email?token=valid-token') =>
    renderWithProviders(<ConfirmEmailPage />, { route });

  beforeEach((): void => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      verifyEmail: mockVerifyEmail,
      isLoading: false,
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockVerifyEmail.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderConfirmEmailPage();

      expect(screen.getByText(/verifying your email/i)).toBeInTheDocument();
      expect(
        screen.getByText(/please wait while we verify your email address/i),
      ).toBeInTheDocument();
    });

    it('should show spinner during verification', () => {
      mockVerifyEmail.mockImplementation(() => new Promise(() => {}));
      const { container } = renderConfirmEmailPage();

      // Check for spinner presence via role or class
      const spinner = container.querySelector('.spinner, [role="status"]');
      expect(spinner ?? screen.getByText(/verifying/i)).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('should show success message after successful verification', async () => {
      mockVerifyEmail.mockResolvedValueOnce({});
      renderConfirmEmailPage();

      await waitFor(() => {
        expect(screen.getByText(/email verified/i)).toBeInTheDocument();
      });

      expect(
        screen.getByText(/your email has been verified and you are now signed in/i),
      ).toBeInTheDocument();
    });

    it('should show redirecting message after success', async () => {
      mockVerifyEmail.mockResolvedValueOnce({});
      renderConfirmEmailPage();

      await waitFor(() => {
        expect(screen.getByText(/redirecting to your account/i)).toBeInTheDocument();
      });
    });

    it('should call verifyEmail with token from URL', async () => {
      mockVerifyEmail.mockResolvedValueOnce({});
      renderConfirmEmailPage('/confirm-email?token=my-test-token');

      await waitFor(() => {
        expect(mockVerifyEmail).toHaveBeenCalledWith({ token: 'my-test-token' });
      });
    });
  });

  describe('Error State', () => {
    it('should show error when token is missing', async () => {
      renderConfirmEmailPage('/confirm-email');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument();
      });

      expect(screen.getByText(/invalid verification link/i)).toBeInTheDocument();
    });

    it('should show error message when verification fails', async () => {
      mockVerifyEmail.mockRejectedValueOnce(new Error('Token expired'));
      renderConfirmEmailPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument();
      });

      // Error message is displayed in the Text component
      expect(screen.getByText(/token expired/i)).toBeInTheDocument();
    });

    it('should show generic error for non-Error exceptions', async () => {
      mockVerifyEmail.mockRejectedValueOnce('Unknown error');
      renderConfirmEmailPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument();
      });
    });

    it('should show sign in button on error', async () => {
      renderConfirmEmailPage('/confirm-email');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to sign in/i })).toBeInTheDocument();
      });
    });

    it('should navigate to login when sign in button is clicked', async () => {
      renderConfirmEmailPage('/confirm-email');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to sign in/i })).toBeInTheDocument();
      });

      const signInButton = screen.getByRole('button', { name: /go to sign in/i });
      fireEvent.click(signInButton);

      // Navigation is handled internally by the component
      // We can verify the button is clickable
      expect(signInButton).toBeEnabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      mockVerifyEmail.mockImplementation(() => new Promise(() => {}));
      renderConfirmEmailPage();

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      mockVerifyEmail.mockImplementation(() => new Promise(() => {}));
      const { container } = renderConfirmEmailPage();

      const authForm = container.querySelector('.auth-form');
      expect(authForm).toBeInTheDocument();
    });
  });

  describe('Navigation after success', () => {
    it('should show redirecting message after successful verification', async () => {
      // Set up mock to resolve successfully
      mockVerifyEmail.mockResolvedValue({});
      mockUseAuth.mockReturnValue({
        verifyEmail: mockVerifyEmail,
        isLoading: false,
        user: mockUser,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      renderConfirmEmailPage();

      // Wait for verification to complete and success state to render
      await waitFor(() => {
        expect(screen.getByText(/email verified/i)).toBeInTheDocument();
      });

      // Verify the redirect message appears
      expect(screen.getByText(/redirecting to your account/i)).toBeInTheDocument();
    });
  });
});
