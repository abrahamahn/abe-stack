// apps/web/src/features/auth/pages/__tests__/Register.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegisterPage } from '../Register';

// ============================================================================
// Mocks
// ============================================================================

const mockRegister = vi.fn();
const mockUseAuth = vi.fn(() => ({
  register: mockRegister,
  isLoading: false,
  user: null,
  isAuthenticated: false,
  login: vi.fn(),
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

// ============================================================================
// Test Helpers
// ============================================================================

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderRegisterPage(): ReturnType<typeof render> {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      isLoading: false,
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
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
    it('should render the create account heading', () => {
      renderRegisterPage();

      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render name input field', () => {
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute('type', 'text');
    });

    it('should render email input field', () => {
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should render password input field', () => {
      renderRegisterPage();

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should render confirm password input field', () => {
      renderRegisterPage();

      const confirmInput = screen.getByLabelText(/confirm password/i);
      expect(confirmInput).toBeInTheDocument();
      expect(confirmInput).toHaveAttribute('type', 'password');
    });

    it('should render create account button', () => {
      renderRegisterPage();

      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render back button', () => {
      renderRegisterPage();

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should render login link', () => {
      renderRegisterPage();

      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should update name field on input', () => {
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      expect(nameInput).toHaveValue('John Doe');
    });

    it('should update email field on input', () => {
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password field on input', () => {
      renderRegisterPage();

      const passwordInput = screen.getByLabelText('Password');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(passwordInput).toHaveValue('password123');
    });

    it('should update confirm password field on input', () => {
      renderRegisterPage();

      const confirmInput = screen.getByLabelText(/confirm password/i);
      fireEvent.change(confirmInput, { target: { value: 'password123' } });

      expect(confirmInput).toHaveValue('password123');
    });

    it('should call register function on form submit', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          name: 'John Doe',
        });
      });
    });

    it('should call goBack when back button is clicked', () => {
      renderRegisterPage();

      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Password Validation', () => {
    it('should show error when passwords do not match', async () => {
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'differentpassword' } });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      // Should not call register
      expect(mockRegister).not.toHaveBeenCalled();

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button when passwords do not match', () => {
      renderRegisterPage();

      const passwordInput = screen.getByLabelText('Password');
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'different' } });

      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when passwords match', () => {
      renderRegisterPage();

      const passwordInput = screen.getByLabelText('Password');
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'password123' } });

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('should show loading text when isLoading is true', () => {
      mockUseAuth.mockReturnValue({
        register: mockRegister,
        isLoading: true,
        user: null,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderRegisterPage();

      expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument();
    });

    it('should disable submit button when loading', () => {
      mockUseAuth.mockReturnValue({
        register: mockRegister,
        isLoading: true,
        user: null,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderRegisterPage();

      const submitButton = screen.getByRole('button', { name: /creating account/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when registration fails', async () => {
      mockRegister.mockRejectedValueOnce(new Error('Email already exists'));
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });

    it('should display generic error message for non-Error exceptions', async () => {
      mockRegister.mockRejectedValueOnce('Unknown error');
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have required attribute on email input', () => {
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('required');
    });

    it('should have required attribute on password inputs', () => {
      renderRegisterPage();

      const passwordInput = screen.getByLabelText('Password');
      const confirmInput = screen.getByLabelText(/confirm password/i);

      expect(passwordInput).toHaveAttribute('required');
      expect(confirmInput).toHaveAttribute('required');
    });

    it('should have proper form structure', () => {
      const { container } = renderRegisterPage();

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should disable back button when canGoBack is false', () => {
      mockUseHistoryNav.mockReturnValue({
        goBack: mockGoBack,
        canGoBack: false,
        history: [],
        index: 0,
        canGoForward: false,
        goForward: mockGoForward,
      });

      renderRegisterPage();

      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid form submissions', async () => {
      mockRegister.mockResolvedValue(undefined);
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'password123' } });

      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        fireEvent.click(submitButton);
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
      const unicodePassword = '密码パスワード🔐';

      fireEvent.change(passwordInput, { target: { value: unicodePassword } });

      expect(passwordInput).toHaveValue(unicodePassword);
    });

    it('should clear error when form is resubmitted', async () => {
      mockRegister.mockRejectedValueOnce(new Error('First error')).mockResolvedValueOnce(undefined);
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      // Fill form
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmInput, { target: { value: 'password123' } });

      // First submission - fails
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/first error/i)).toBeInTheDocument();
      });

      // Second submission - should clear error and succeed
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.queryByText(/first error/i)).not.toBeInTheDocument();
      });
    });
  });
});
