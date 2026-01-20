// apps/web/src/features/auth/pages/__tests__/ResetPasswordPage.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResetPasswordPage } from '../ResetPasswordPage';

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

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
}));

// Mock navigate and alert
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock window.alert
const mockAlert = vi.fn();
global.alert = mockAlert;

describe('ResetPasswordPage', () => {
  const createQueryClient = (): QueryClient =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

  const renderResetPasswordPage = (
    initialEntries: string[] = ['/reset-password?token=valid-token'],
  ): ReturnType<typeof render> => {
    const queryClient = createQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <ResetPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach((): void => {
    vi.clearAllMocks();
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
      renderResetPasswordPage(['/reset-password']);

      expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
      expect(
        screen.getByText(/this password reset link is invalid or has expired/i),
      ).toBeInTheDocument();
    });

    it('should show request new link button when token is missing', () => {
      renderResetPasswordPage(['/reset-password']);

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
      renderResetPasswordPage(['/reset-password?token=my-token']);

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

    it('should show alert and navigate to login on success', async () => {
      mockResetPassword.mockResolvedValueOnce(undefined);
      renderResetPasswordPage();

      const passwordInput = screen.getByLabelText(/new password/i);
      const updateButton = screen.getByRole('button', { name: /update password/i });

      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Password reset successfully! You can now sign in with your new password.',
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Navigation', () => {
    it('should navigate to login page when back to sign in is clicked', () => {
      renderResetPasswordPage();

      const backToSignIn = screen.getByRole('button', { name: /back to sign in/i });
      fireEvent.click(backToSignIn);

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should navigate to forgot password when request new link is clicked', () => {
      renderResetPasswordPage(['/reset-password']);

      const requestNewLink = screen.getByRole('button', { name: /request a new reset link/i });
      fireEvent.click(requestNewLink);

      expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=forgot-password');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when reset fails', async () => {
      mockResetPassword.mockRejectedValueOnce(new Error('Token expired'));
      renderResetPasswordPage();

      const passwordInput = screen.getByLabelText(/new password/i);
      const updateButton = screen.getByRole('button', { name: /update password/i });

      await act(async () => {
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

      await act(async () => {
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
      renderResetPasswordPage(['/reset-password?token=']);

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
