// apps/web/src/features/auth/pages/__tests__/Register.test.tsx
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './../../../__tests__/utils';
import { RegisterPage } from './Register';

// Mock the auth hook
const mockRegister = vi.fn();
const mockResendVerification = vi.fn();
const mockUseAuth = vi.fn(() => ({
  register: mockRegister,
  resendVerification: mockResendVerification,
  isLoading: false,
  user: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
}));

// Mock navigate
const mockNavigate = vi.fn();

// Mock the hooks module - useAuth and useAuthModeNavigation
vi.mock('../hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks')>();
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

describe('RegisterPage', () => {
  const renderRegisterPage = () => renderWithProviders(<RegisterPage />);

  beforeEach((): void => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      resendVerification: mockResendVerification,
      isLoading: false,
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render the create account heading', () => {
      renderRegisterPage();

      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render email input field', () => {
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should render name input field', () => {
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute('type', 'text');
    });

    it('should render password input field', () => {
      renderRegisterPage();

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should render create account button', () => {
      renderRegisterPage();

      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render sign in option', () => {
      renderRegisterPage();

      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should update email field on input', () => {
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update name field on input', () => {
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      expect(nameInput).toHaveValue('John Doe');
    });

    it('should update password field on input', () => {
      renderRegisterPage();

      const passwordInput = screen.getByLabelText('Password');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(passwordInput).toHaveValue('password123');
    });

    it('should call register function on form submit', async () => {
      mockRegister.mockResolvedValueOnce({
        email: 'test@example.com',
        message: 'Check your email',
      });
      renderRegisterPage();

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
          password: 'password123',
          name: 'John Doe',
        });
      });
    });

    it('should allow registration without name (optional field)', async () => {
      mockRegister.mockResolvedValueOnce({
        email: 'test@example.com',
        message: 'Check your email',
      });
      renderRegisterPage();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const createButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          name: undefined,
        });
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to login page when sign in is clicked', () => {
      renderRegisterPage();

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(signInButton);

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: false });
    });
  });

  describe('Registration Success', () => {
    it('should show email verification message after successful registration', async () => {
      mockRegister.mockResolvedValueOnce({
        email: 'test@example.com',
        message: 'Please check your email to verify your account',
      });
      renderRegisterPage();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const createButton = screen.getByRole('button', { name: /create account/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when registration fails', async () => {
      mockRegister.mockRejectedValueOnce(new Error('Email already exists'));
      renderRegisterPage();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const createButton = screen.getByRole('button', { name: /create account/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });

    it('should display generic error message for non-Error exceptions', async () => {
      mockRegister.mockRejectedValueOnce('Unknown error');
      renderRegisterPage();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const createButton = screen.getByRole('button', { name: /create account/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have required attribute on email input', () => {
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('required');
    });

    it('should have required attribute on password input', () => {
      renderRegisterPage();

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should have proper form structure', () => {
      const { container } = renderRegisterPage();

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid form submissions', async () => {
      mockRegister.mockResolvedValue({ email: 'test@example.com', message: 'Success' });
      renderRegisterPage();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const createButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        fireEvent.click(createButton);
      }

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled();
      });
    });

    it('should handle special characters in name', () => {
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: "John O'Brien-Smith" } });

      expect(nameInput).toHaveValue("John O'Brien-Smith");
    });

    it('should handle unicode characters in password', () => {
      renderRegisterPage();

      const passwordInput = screen.getByLabelText('Password');
      const unicodePassword = '密码パスワード';

      fireEvent.change(passwordInput, { target: { value: unicodePassword } });

      expect(passwordInput).toHaveValue(unicodePassword);
    });
  });
});
