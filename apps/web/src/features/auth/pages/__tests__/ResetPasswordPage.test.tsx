// apps/web/src/features/auth/pages/__tests__/ResetPasswordPage.test.tsx
import { QueryCache, QueryCacheProvider } from '@abe-stack/sdk';
import { MemoryRouter } from '@abe-stack/ui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

// Mock navigate
const mockNavigate = vi.fn();

// Mock the hooks module - useAuth and useAuthModeNavigation
vi.mock('../../hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks')>();
  return {
    ...actual,
    useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
    useAuthModeNavigation: () => ({
      navigateToMode: (mode: string): void => {
        const routes: Record<string, string> = {
          login: '/login',
          register: '/register',
          'forgot-password': '/auth?mode=forgot-password',
          'reset-password': '/auth?mode=reset-password',
        };
        mockNavigate(routes[mode], { replace: false });
      },
      navigateToLogin: (): void => mockNavigate('/login', { replace: false }),
      navigateToRegister: (): void => mockNavigate('/register', { replace: false }),
      navigateToForgotPassword: (): void =>
        mockNavigate('/auth?mode=forgot-password', { replace: false }),
    }),
  };
});

// Mock toastStore from @abe-stack/stores
const mockToastShow = vi.fn();
vi.mock('@abe-stack/stores', async () => {
  const actual = await vi.importActual('@abe-stack/stores');
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
  const createQueryCache = (): QueryCache =>
    new QueryCache({
      defaultStaleTime: 0,
      defaultGcTime: 0,
    });

  const renderResetPasswordPage = (
    initialEntries: string[] = ['/reset-password?token=valid-token'],
  ): ReturnType<typeof render> => {
    const queryCache = createQueryCache();
    return render(
      <QueryCacheProvider cache={queryCache}>
        <MemoryRouter initialEntries={initialEntries}>
          <ResetPasswordPage />
        </MemoryRouter>
      </QueryCacheProvider>,
    );
  };

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

    it('should show toast and navigate to login on success', async () => {
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

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: false });
    });
  });

  describe('Navigation', () => {
    it('should navigate to login page when back to sign in is clicked', () => {
      renderResetPasswordPage();

      const backToSignIn = screen.getByRole('button', { name: /back to sign in/i });
      fireEvent.click(backToSignIn);

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: false });
    });

    it('should navigate to forgot password when request new link is clicked', () => {
      renderResetPasswordPage(['/reset-password']);

      const requestNewLink = screen.getByRole('button', { name: /request a new reset link/i });
      fireEvent.click(requestNewLink);

      expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=forgot-password', { replace: false });
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
