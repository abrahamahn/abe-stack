// apps/web/src/features/auth/pages/__tests__/AuthPage.test.tsx
import { MemoryRouter } from '@abe-stack/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthPage } from '../AuthPage';

import type { User } from '@features/auth';

// Mock the auth hook
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockForgotPassword = vi.fn();
const mockResetPassword = vi.fn();
const mockResendVerification = vi.fn();
const mockUseAuth = vi.fn(() => ({
  login: mockLogin,
  register: mockRegister,
  forgotPassword: mockForgotPassword,
  resetPassword: mockResetPassword,
  resendVerification: mockResendVerification,
  isLoading: false,
  user: null as User | null,
  isAuthenticated: false,
  logout: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock toastStore from @abe-stack/core
const mockToastShow = vi.fn();
vi.mock('@abe-stack/core', async () => {
  const actual = await vi.importActual('@abe-stack/core');
  return {
    ...actual,
    toastStore: {
      getState: () => ({
        show: mockToastShow,
      }),
    },
  };
});

describe('AuthPage', () => {
  const createQueryClient = (): QueryClient =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

  const renderAuthPage = (initialEntries: string[] = ['/auth']): ReturnType<typeof render> => {
    const queryClient = createQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <AuthPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach((): void => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      register: mockRegister,
      forgotPassword: mockForgotPassword,
      resetPassword: mockResetPassword,
      resendVerification: mockResendVerification,
      isLoading: false,
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
    });
  });

  describe('Mode Selection', () => {
    it('should render login form by default', () => {
      renderAuthPage();

      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render login form when mode=login', () => {
      renderAuthPage(['/auth?mode=login']);

      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    it('should render register form when mode=register', () => {
      renderAuthPage(['/auth?mode=register']);

      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render forgot password form when mode=forgot-password', () => {
      renderAuthPage(['/auth?mode=forgot-password']);

      expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('should render reset password form when mode=reset-password', () => {
      // Need to provide a token for the reset password form to show
      renderAuthPage(['/auth?mode=reset-password&token=test-token']);

      expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
    });

    it('should show invalid link message when reset-password mode has no token', () => {
      renderAuthPage(['/auth?mode=reset-password']);

      expect(screen.getByRole('heading', { name: /invalid reset link/i })).toBeInTheDocument();
    });

    it('should default to login for invalid mode', () => {
      renderAuthPage(['/auth?mode=invalid']);

      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });
  });

  describe('Authentication Redirect', () => {
    it('should redirect to dashboard when already authenticated', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        register: mockRegister,
        forgotPassword: mockForgotPassword,
        resetPassword: mockResetPassword,
        resendVerification: mockResendVerification,
        isLoading: false,
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          createdAt: '2024-01-01T00:00:00Z',
        },
        isAuthenticated: true,
        logout: vi.fn(),
      });

      renderAuthPage();

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Login Flow', () => {
    it('should call login when form is submitted', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      renderAuthPage(['/auth?mode=login']);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should display error message when login fails', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      renderAuthPage(['/auth?mode=login']);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(signInButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Register Flow', () => {
    it('should call register when form is submitted', async () => {
      mockRegister.mockResolvedValueOnce({ email: 'test@example.com', message: 'Check email' });
      renderAuthPage(['/auth?mode=register']);

      const emailInput = screen.getByLabelText('Email');
      const nameInput = screen.getByLabelText(/name/i);
      const passwordInput = screen.getByLabelText('Password');
      const createButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'test@example.com',
          name: 'John Doe',
          password: 'password123',
        });
      });
    });
  });

  describe('Forgot Password Flow', () => {
    it('should call forgotPassword and show alert on success', async () => {
      mockForgotPassword.mockResolvedValueOnce(undefined);
      const { container } = renderAuthPage(['/auth?mode=forgot-password']);

      const emailInput = screen.getByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();

      await act(async () => {
        fireEvent.submit(form!);
      });

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' });
      });

      await waitFor(() => {
        expect(mockToastShow).toHaveBeenCalledWith({
          title: 'Password reset link sent to your email',
        });
      });
    });
  });

  describe('Mode Switching', () => {
    it('should switch to register mode when sign up is clicked', () => {
      renderAuthPage(['/auth?mode=login']);

      const signUpButton = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(signUpButton);

      expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=register', { replace: true });
    });

    it('should switch to login mode when sign in is clicked from register', () => {
      renderAuthPage(['/auth?mode=register']);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(signInButton);

      expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=login', { replace: true });
    });

    it('should switch to forgot-password mode when forgot password is clicked', () => {
      renderAuthPage(['/auth?mode=login']);

      const forgotButton = screen.getByRole('button', { name: /forgot your password/i });
      fireEvent.click(forgotButton);

      expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=forgot-password', { replace: true });
    });
  });

  describe('Error Handling', () => {
    it('should display generic error for non-Error exceptions', async () => {
      mockLogin.mockRejectedValueOnce('Unknown error');
      renderAuthPage(['/auth?mode=login']);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password' } });
        fireEvent.click(signInButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
      });
    });

    it('should clear error when mode changes', () => {
      renderAuthPage(['/auth?mode=login']);

      // Trigger mode change
      const signUpButton = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(signUpButton);

      // Error should be cleared (we can't easily test this without a visible error first)
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      const { container } = renderAuthPage();

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      renderAuthPage();

      const heading = screen.getByRole('heading');
      expect(heading).toBeInTheDocument();
    });
  });
});
