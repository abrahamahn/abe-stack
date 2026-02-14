// main/apps/web/src/features/auth/pages/RegisterPage.test.tsx
import { RegisterPage } from '@auth/pages/RegisterPage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { renderWithProviders } from './../../../__tests__/utils';

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
const mockNavigateToMode = vi.fn();

// Mock @abe-stack/ui - only mock useAuthModeNavigation, keep useFormState real
vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();
  return {
    ...actual,
    useAuthModeNavigation: () => ({
      navigateToMode: mockNavigateToMode,
    }),
  };
});

vi.mock('../hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks')>();
  return {
    ...actual,
    useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
  };
});

describe('RegisterPage', () => {
  const renderRegisterPage = () => renderWithProviders(<RegisterPage />);

  beforeEach((): void => {
    vi.clearAllMocks();
    mockRegister.mockReset();
    mockRegister.mockResolvedValue(undefined);
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

      const usernameInput = screen.getByLabelText('Username');
      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      expect(usernameInput).toBeInTheDocument();
      expect(firstNameInput).toBeInTheDocument();
      expect(lastNameInput).toBeInTheDocument();
      expect(usernameInput).toHaveAttribute('type', 'text');
      expect(firstNameInput).toHaveAttribute('type', 'text');
      expect(lastNameInput).toHaveAttribute('type', 'text');
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

      const usernameInput = screen.getByLabelText('Username');
      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');

      fireEvent.change(usernameInput, { target: { value: 'johndoe' } });
      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });

      expect(usernameInput).toHaveValue('johndoe');
      expect(firstNameInput).toHaveValue('John');
      expect(lastNameInput).toHaveValue('Doe');
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
      const usernameInput = screen.getByLabelText('Username');
      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      const passwordInput = screen.getByLabelText('Password');
      const createButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(usernameInput, { target: { value: 'johndoe' } });
      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'test@example.com',
          username: 'johndoe',
          firstName: 'John',
          lastName: 'Doe',
          password: 'password123',
          tosAccepted: false,
        });
      });
    });

    it('should allow registration without name (optional field)', () => {
      mockRegister.mockResolvedValueOnce({
        email: 'test@example.com',
        message: 'Check your email',
      });
      renderRegisterPage();

      const emailInput = screen.getByLabelText('Email');
      const usernameInput = screen.getByLabelText('Username');
      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      const passwordInput = screen.getByLabelText('Password');

      // All fields are now required, so this test verifies they are all required
      expect(emailInput).toHaveAttribute('required');
      expect(usernameInput).toHaveAttribute('required');
      expect(firstNameInput).toHaveAttribute('required');
      expect(lastNameInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('required');
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
      const usernameInput = screen.getByLabelText('Username');
      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      const passwordInput = screen.getByLabelText('Password');
      const createButton = screen.getByRole('button', { name: /create account/i });

      act(() => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(firstNameInput, { target: { value: 'Test' } });
        fireEvent.change(lastNameInput, { target: { value: 'User' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    afterEach(() => {
      mockRegister.mockReset();
      mockRegister.mockResolvedValue(undefined);
    });

    it('should display error message when registration fails', async () => {
      renderRegisterPage();

      const emailInput = screen.getByLabelText('Email');
      const usernameInput = screen.getByLabelText('Username');
      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      const passwordInput = screen.getByLabelText('Password');
      const createButton = screen.getByRole('button', { name: /create account/i });

      // Setup mock rejection before filling form
      mockRegister.mockRejectedValueOnce(new Error('Email already exists'));

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(firstNameInput, { target: { value: 'Test' } });
      fireEvent.change(lastNameInput, { target: { value: 'User' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(createButton);

      // Wait for error to appear (mock is called synchronously but state updates are async)
      await waitFor(
        () => {
          const errorElements = screen.queryAllByText(/email already exists/i);
          expect(errorElements.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );
    });

    it('should display generic error message for non-Error exceptions', async () => {
      mockRegister.mockRejectedValueOnce('Unknown error');
      renderRegisterPage();

      const emailInput = screen.getByLabelText('Email');
      const usernameInput = screen.getByLabelText('Username');
      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      const passwordInput = screen.getByLabelText('Password');
      const createButton = screen.getByRole('button', { name: /create account/i });

      act(() => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(firstNameInput, { target: { value: 'Test' } });
        fireEvent.change(lastNameInput, { target: { value: 'User' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(createButton);
      });

      // Wait for error to appear (mock is called synchronously but state updates are async)
      await waitFor(
        () => {
          const errorElements = screen.queryAllByText(/an error occurred/i);
          expect(errorElements.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );
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
      const usernameInput = screen.getByLabelText('Username');
      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      const passwordInput = screen.getByLabelText('Password');
      const createButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(firstNameInput, { target: { value: 'Test' } });
      fireEvent.change(lastNameInput, { target: { value: 'User' } });
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

      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      fireEvent.change(lastNameInput, { target: { value: "O'Brien-Smith" } });

      expect(firstNameInput).toHaveValue('John');
      expect(lastNameInput).toHaveValue("O'Brien-Smith");
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
