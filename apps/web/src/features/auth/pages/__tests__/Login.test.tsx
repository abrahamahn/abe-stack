// apps/web/src/features/auth/pages/__tests__/Login.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from '../Login';

// Mock the auth context
const mockLogin = vi.fn();
const mockUseAuth = vi.fn(() => ({
  login: mockLogin,
  isLoading: false,
  user: null,
  isAuthenticated: false,
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
}));

// Mock history context from @abe-stack/ui
const mockGoBack = vi.fn();
const mockGoForward = vi.fn();
const mockUseHistoryNav = vi.fn(() => ({
  goBack: mockGoBack,
  canGoBack: true,
  history: ['/'],
  index: 1,
  canGoForward: false,
  goForward: mockGoForward,
}));

vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    useHistoryNav: (): ReturnType<typeof mockUseHistoryNav> => mockUseHistoryNav(),
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
      isLoading: false,
      user: null,
      isAuthenticated: false,
      register: vi.fn(),
      logout: vi.fn(),
    });
    mockUseHistoryNav.mockReturnValue({
      goBack: mockGoBack,
      canGoBack: true,
      history: ['/'],
      index: 1,
      canGoForward: false,
      goForward: mockGoForward,
    });
  });

  describe('Rendering', () => {
    it('should render the login heading', () => {
      renderLoginPage();

      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
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

    it('should render login button', () => {
      renderLoginPage();

      expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
    });

    it('should render back button', () => {
      renderLoginPage();

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should render registration info text', () => {
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
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should call goBack when back button is clicked', () => {
      renderLoginPage();

      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading text when isLoading is true', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        isLoading: true,
        user: null,
        isAuthenticated: false,
        register: vi.fn(),
        logout: vi.fn(),
      });

      renderLoginPage();

      expect(screen.getByRole('button', { name: /logging in/i })).toBeInTheDocument();
    });

    it('should disable login button when loading', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        isLoading: true,
        user: null,
        isAuthenticated: false,
        register: vi.fn(),
        logout: vi.fn(),
      });

      renderLoginPage();

      const loginButton = screen.getByRole('button', { name: /logging in/i });
      expect(loginButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when login fails', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      renderLoginPage();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(loginButton);
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
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password' } });
        fireEvent.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
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

  describe('Aggressive TDD - Edge Cases', () => {
    it('should handle rapid form submissions', async () => {
      mockLogin.mockResolvedValue(undefined);
      renderLoginPage();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Rapid fire 10 clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(loginButton);
      }

      // Should handle multiple submissions gracefully
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('should handle empty form submission gracefully', () => {
      renderLoginPage();

      const loginButton = screen.getByRole('button', { name: /^login$/i });

      // Empty form should not crash (HTML validation will prevent submit)
      expect(() => fireEvent.click(loginButton)).not.toThrow();
    });

    it('should handle extremely long email input', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const longEmail = 'a'.repeat(1000) + '@example.com';

      fireEvent.change(emailInput, { target: { value: longEmail } });

      expect(emailInput).toHaveValue(longEmail);
    });

    it('should handle extremely long password input', () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText('Password');
      const longPassword = 'a'.repeat(10000);

      fireEvent.change(passwordInput, { target: { value: longPassword } });

      expect(passwordInput).toHaveValue(longPassword);
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
      const unicodePassword = '密码パスワード🔐';

      fireEvent.change(passwordInput, { target: { value: unicodePassword } });

      expect(passwordInput).toHaveValue(unicodePassword);
    });

    it('should handle login that never resolves (timeout scenario)', () => {
      // Simulate a hung request
      mockLogin.mockImplementation(() => new Promise(() => {}));
      renderLoginPage();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      // Component should not crash while waiting
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('should handle multiple rapid re-renders', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Rapid re-renders
      for (let i = 0; i < 50; i++) {
        rerender(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <LoginPage />
            </MemoryRouter>
          </QueryClientProvider>,
        );
      }

      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    });

    it('should handle component unmount during pending login', () => {
      let resolveLogin: (() => void) | undefined;
      mockLogin.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveLogin = resolve;
          }),
      );

      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      // Unmount while login is pending
      expect(() => {
        unmount();
      }).not.toThrow();

      // Resolve after unmount - should not crash
      if (resolveLogin) {
        resolveLogin();
      }
    });

    it('should handle back button when canGoBack is false', () => {
      // Mock canGoBack as false for this test
      mockUseHistoryNav.mockReturnValue({
        goBack: mockGoBack,
        canGoBack: false,
        history: [],
        index: 0,
        canGoForward: false,
        goForward: mockGoForward,
      });

      renderLoginPage();

      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeDisabled();
    });
  });
});
