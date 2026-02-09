// src/apps/web/src/features/auth/pages/ResetPasswordPage.test.tsx
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './../../../__tests__/utils';
import { ResetPasswordPage } from './ResetPasswordPage';

// Mock the auth hook
const mockResetPassword = vi.fn();
const mockUseAuth = vi.fn(() => ({
  resetPassword: mockResetPassword,
  isLoading: false,
  user: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}));

vi.mock('@auth/hooks', () => ({
  useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
}));

// Mock toastStore from @abe-stack/react
const mockToastShow = vi.fn();
vi.mock('@abe-stack/react', async () => {
  const actual = await vi.importActual('@abe-stack/react');
  return {
    ...actual,
    toastStore: {
      getState: () => ({
        show: mockToastShow,
      }),
    },
  };
});

describe('ResetPasswordPage', () => {
  const renderResetPasswordPage = (route = '/reset-password?token=valid-token') =>
    renderWithProviders(<ResetPasswordPage />, { route });

  beforeEach((): void => {
    vi.clearAllMocks();
    mockToastShow.mockClear();
    mockUseAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: false,
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render the set new password heading', () => {
      renderResetPasswordPage();

      expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
    });

    it('should render password input field', () => {
      renderResetPasswordPage();

      const passwordInput = screen.getByLabelText(/new password/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should render update password button', () => {
      renderResetPasswordPage();

      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    });

    it('should render description text', () => {
      renderResetPasswordPage();

      expect(screen.getByText(/enter your new password/i)).toBeInTheDocument();
    });
  });

  describe('Invalid Token State', () => {
    it('should show invalid link message when token is missing', () => {
      renderResetPasswordPage('/reset-password');

      expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
      expect(
        screen.getByText(/this password reset link is invalid or has expired/i),
      ).toBeInTheDocument();
    });

    it('should show request new link button when token is missing', () => {
      renderResetPasswordPage('/reset-password');

      expect(screen.getByRole('button', { name: /request a new reset link/i })).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should update password field on input', () => {
      renderResetPasswordPage();

      const passwordInput = screen.getByLabelText(/new password/i);
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

      expect(passwordInput).toHaveValue('newpassword123');
    });

    it('should call resetPassword function on form submit', async () => {
      mockResetPassword.mockResolvedValueOnce(undefined);
      renderResetPasswordPage('/reset-password?token=my-token');

      const passwordInput = screen.getByLabelText(/new password/i);
      const updateButton = screen.getByRole('button', { name: /update password/i });

      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith({
          token: 'my-token',
          password: 'newpassword123',
        });
      });
    });

    it('should show toast on success', async () => {
      mockResetPassword.mockResolvedValueOnce(undefined);
      renderResetPasswordPage();

      const passwordInput = screen.getByLabelText(/new password/i);
      const updateButton = screen.getByRole('button', { name: /update password/i });

      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockToastShow).toHaveBeenCalledWith({
          title: 'Password reset successfully',
          description: 'You can now sign in with your new password.',
        });
      });
    });
  });

  describe('Navigation', () => {
    it('should have back to sign in button', () => {
      renderResetPasswordPage();

      const backToSignIn = screen.getByRole('button', { name: /back to sign in/i });
      expect(backToSignIn).toBeInTheDocument();
    });

    it('should have request new link button when token is missing', () => {
      renderResetPasswordPage('/reset-password');

      const requestNewLink = screen.getByRole('button', { name: /request a new reset link/i });
      expect(requestNewLink).toBeInTheDocument();
      expect(requestNewLink).toBeEnabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when reset fails', async () => {
      mockResetPassword.mockRejectedValueOnce(new Error('Token expired'));
      renderResetPasswordPage();

      const passwordInput = screen.getByLabelText(/new password/i);
      const updateButton = screen.getByRole('button', { name: /update password/i });

      act(() => {
        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/token expired/i)).toBeInTheDocument();
      });
    });

    it('should display generic error message for non-Error exceptions', async () => {
      mockResetPassword.mockRejectedValueOnce('Unknown error');
      renderResetPasswordPage();

      const passwordInput = screen.getByLabelText(/new password/i);
      const updateButton = screen.getByRole('button', { name: /update password/i });

      act(() => {
        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have required attribute on password input', () => {
      renderResetPasswordPage();

      const passwordInput = screen.getByLabelText(/new password/i);
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should have proper form structure', () => {
      const { container } = renderResetPasswordPage();

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty token in URL', () => {
      renderResetPasswordPage('/reset-password?token=');

      expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
    });

    it('should handle rapid form submissions', async () => {
      mockResetPassword.mockResolvedValue(undefined);
      renderResetPasswordPage();

      const passwordInput = screen.getByLabelText(/new password/i);
      const updateButton = screen.getByRole('button', { name: /update password/i });

      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        fireEvent.click(updateButton);
      }

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalled();
      });
    });

    it('should handle unicode characters in password', () => {
      renderResetPasswordPage();

      const passwordInput = screen.getByLabelText(/new password/i);
      const unicodePassword = '密码パスワード';

      fireEvent.change(passwordInput, { target: { value: unicodePassword } });

      expect(passwordInput).toHaveValue(unicodePassword);
    });
  });
});
