// apps/web/src/features/auth/pages/__tests__/Login.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from '../Login';

// Mock the auth hook
const mockLogin = vi.fn();
const mockForgotPassword = vi.fn();
const mockUseAuth = vi.fn(() => ({
  login: mockLogin,
  forgotPassword: mockForgotPassword,
  isLoading: false,
  user: null,
  isAuthenticated: false,
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  const createQueryClient = (): QueryClient =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

  const renderLoginPage = (): ReturnType<typeof render> => {
    const queryClient = createQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach((): void => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      forgotPassword: mockForgotPassword,
      isLoading: false,
      user: null,
      isAuthenticated: false,
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render the welcome heading', () => {
      renderLoginPage();

      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    it('should render email input field', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should render password input field', () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should render sign in button', () => {
      renderLoginPage();

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render forgot password button', () => {
      renderLoginPage();

      expect(screen.getByRole('button', { name: /forgot your password/i })).toBeInTheDocument();
    });

    it('should render sign up option', () => {
      renderLoginPage();

      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should update email field on input', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password field on input', () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText('Password');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(passwordInput).toHaveValue('password123');
    });

    it('should call login function on form submit', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      renderLoginPage();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const signInButton = screen.getByRole('button', { name: /^sign in$/i });

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
  });

  describe('Navigation', () => {
    it('should navigate to register page when sign up is clicked', () => {
      renderLoginPage();

      const signUpButton = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(signUpButton);

      expect(mockNavigate).toHaveBeenCalledWith('/register');
    });

    it('should navigate to forgot password page when forgot password is clicked', () => {
      renderLoginPage();

      const forgotButton = screen.getByRole('button', { name: /forgot your password/i });
      fireEvent.click(forgotButton);

      expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=forgot-password');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when login fails', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      renderLoginPage();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const signInButton = screen.getByRole('button', { name: /^sign in$/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(signInButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should display generic error message for non-Error exceptions', async () => {
      mockLogin.mockRejectedValueOnce('Unknown error');
      renderLoginPage();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const signInButton = screen.getByRole('button', { name: /^sign in$/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password' } });
        fireEvent.click(signInButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have required attribute on email input', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('required');
    });

    it('should have required attribute on password input', () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should have proper form structure', () => {
      const { container } = renderLoginPage();

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid form submissions', async () => {
      mockLogin.mockResolvedValue(undefined);
      renderLoginPage();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const signInButton = screen.getByRole('button', { name: /^sign in$/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        fireEvent.click(signInButton);
      }

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('should handle special characters in email', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const specialEmail = "test+special'chars@example.com";

      fireEvent.change(emailInput, { target: { value: specialEmail } });

      expect(emailInput).toHaveValue(specialEmail);
    });

    it('should handle unicode characters in password', () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText('Password');
      const unicodePassword = '密码パスワード';

      fireEvent.change(passwordInput, { target: { value: unicodePassword } });

      expect(passwordInput).toHaveValue(unicodePassword);
    });
  });
});
