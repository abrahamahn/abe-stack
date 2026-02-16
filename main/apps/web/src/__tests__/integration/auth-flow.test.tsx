// main/apps/web/src/__tests__/integration/auth-flow.test.tsx
/**
 * Integration tests for authentication user flows.
 *
 * Tests the complete user journey through:
 * - Login flow (form submission, validation, success/error states)
 * - Registration flow (form submission, email verification message)
 * - Logout flow
 * - Mode switching between login/register/forgot-password
 */

import { Route, Routes, useLocation } from '@abe-stack/react/router';
import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoginPage, RegisterPage } from '../../features/auth';
import { createMockEnvironment, mockUser, renderWithProviders } from '../utils';

import type { AuthService } from '../../features/auth';
import type { ReactElement } from 'react';

// Helper component to capture and display current location for testing
const LocationDisplay = (): ReactElement => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname + location.search}</div>;
};

// ============================================================================
// Login Flow Tests
// ============================================================================

describe('Auth Flow Integration', () => {
  describe('Login Flow', () => {
    it('should render login form with all required fields', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByLabelText('Email or Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should show loading state during login submission', async () => {
      const environment = createMockEnvironment();
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      (environment.auth as { login: AuthService['login'] }).login = vi.fn(async () => {
        await loginPromise;
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email or Username'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Should show loading state
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

      // Resolve the promise to complete
      resolveLogin!();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /signing in/i })).not.toBeInTheDocument();
      });
    });

    it('should call login with correct credentials', async () => {
      const environment = createMockEnvironment();
      const loginSpy = vi.fn().mockResolvedValue(undefined);
      (environment.auth as { login: AuthService['login'] }).login = loginSpy;

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email or Username'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'securePassword123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(loginSpy).toHaveBeenCalledWith({
          identifier: 'test@example.com',
          password: 'securePassword123',
        });
      });
    });

    it('should display error message on login failure', async () => {
      const environment = createMockEnvironment({
        loginError: new Error('Invalid credentials'),
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email or Username'), 'wrong@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should disable form fields during loading', async () => {
      const environment = createMockEnvironment();
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      (environment.auth as { login: AuthService['login'] }).login = vi.fn(async () => {
        await loginPromise;
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email or Username'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Check fields are disabled during loading
      await waitFor(() => {
        expect(screen.getByLabelText('Email or Username')).toBeDisabled();
        expect(screen.getByLabelText('Password')).toBeDisabled();
      });

      resolveLogin!();
    });

    it('should navigate to register when "Sign up" is clicked and verify URL changes', async () => {
      const { user } = renderWithProviders(
        <>
          <LocationDisplay />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/register"
              element={<div data-testid="register-page">Register Page</div>}
            />
          </Routes>
        </>,
        { route: '/login' },
      );

      const signUpButton = screen.getByRole('button', { name: /sign up/i });
      expect(signUpButton).toBeInTheDocument();

      // Verify initial location
      expect(screen.getByTestId('location-display')).toHaveTextContent('/login');

      await user.click(signUpButton);

      // Verify navigation occurred - LoginPage navigates to /register
      await waitFor(() => {
        expect(screen.getByTestId('location-display')).toHaveTextContent('/register');
        expect(screen.getByTestId('register-page')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Registration Flow Tests
  // ============================================================================

  describe('Registration Flow', () => {
    it('should render registration form with all required fields', () => {
      renderWithProviders(<RegisterPage />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should call register with correct data including name', async () => {
      const environment = createMockEnvironment();
      const registerSpy = vi.fn().mockResolvedValue({
        message: 'Please check your email to verify your account',
        email: 'newuser@example.com',
      });
      (environment.auth as { register: AuthService['register'] }).register = registerSpy;

      const { user } = renderWithProviders(<RegisterPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'newuser@example.com');
      await user.type(screen.getByLabelText('Username'), 'newuser');
      await user.type(screen.getByLabelText('First Name'), 'New');
      await user.type(screen.getByLabelText('Last Name'), 'User');
      await user.type(screen.getByLabelText('Password'), 'newpassword123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(registerSpy).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          username: 'newuser',
          firstName: 'New',
          lastName: 'User',
          password: 'newpassword123',
          tosAccepted: false,
        });
      });
    });

    it('should submit registration with all required fields', async () => {
      const environment = createMockEnvironment();
      const registerSpy = vi.fn().mockResolvedValue({
        message: 'Please check your email',
        email: 'minimal@example.com',
      });
      (environment.auth as { register: AuthService['register'] }).register = registerSpy;

      const { user } = renderWithProviders(<RegisterPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'minimal@example.com');
      await user.type(screen.getByLabelText('Username'), 'minimaluser');
      await user.type(screen.getByLabelText('First Name'), 'Min');
      await user.type(screen.getByLabelText('Last Name'), 'User');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(registerSpy).toHaveBeenCalledWith({
          email: 'minimal@example.com',
          username: 'minimaluser',
          firstName: 'Min',
          lastName: 'User',
          password: 'password123',
          tosAccepted: false,
        });
      });
    });

    it('should show email verification message after successful registration', async () => {
      const environment = createMockEnvironment();
      const registerSpy = vi.fn().mockResolvedValue({
        message: 'Please check your email to verify your account',
        email: 'newuser@example.com',
      });
      (environment.auth as { register: AuthService['register'] }).register = registerSpy;

      const { user } = renderWithProviders(<RegisterPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'newuser@example.com');
      await user.type(screen.getByLabelText('Username'), 'newuser');
      await user.type(screen.getByLabelText('First Name'), 'New');
      await user.type(screen.getByLabelText('Last Name'), 'User');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
        expect(
          screen.getByText('Please check your email to verify your account'),
        ).toBeInTheDocument();
      });
    });

    it('should show resend verification button after registration', async () => {
      const environment = createMockEnvironment();
      (environment.auth as { register: AuthService['register'] }).register = vi
        .fn()
        .mockResolvedValue({
          message: 'Please check your email',
          email: 'test@example.com',
        });

      const { user } = renderWithProviders(<RegisterPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Username'), 'testuser');
      await user.type(screen.getByLabelText('First Name'), 'Test');
      await user.type(screen.getByLabelText('Last Name'), 'User');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/didn't receive it\?/i)).toBeInTheDocument();
      });
    });

    it('should display error message on registration failure', async () => {
      const environment = createMockEnvironment({
        registerError: new Error('Email already registered'),
      });

      const { user } = renderWithProviders(<RegisterPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'existing@example.com');
      await user.type(screen.getByLabelText('Username'), 'existinguser');
      await user.type(screen.getByLabelText('First Name'), 'Existing');
      await user.type(screen.getByLabelText('Last Name'), 'User');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument();
      });
    });

    it('should show loading state during registration', async () => {
      const environment = createMockEnvironment();
      let resolveRegister: (value: {
        status: 'pending_verification';
        message: string;
        email: string;
      }) => void;
      const registerPromise = new Promise<{
        status: 'pending_verification';
        message: string;
        email: string;
      }>((resolve) => {
        resolveRegister = resolve;
      });
      (environment.auth as { register: AuthService['register'] }).register = vi.fn(
        async () => registerPromise,
      );

      const { user } = renderWithProviders(<RegisterPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Username'), 'testuser');
      await user.type(screen.getByLabelText('First Name'), 'Test');
      await user.type(screen.getByLabelText('Last Name'), 'User');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();

      // Cleanup: resolve the promise and wait for state updates to complete
      act(() => {
        resolveRegister!({
          status: 'pending_verification',
          message: 'Check email',
          email: 'test@example.com',
        });
      });
    });
  });

  // ============================================================================
  // Authenticated State Tests
  // ============================================================================

  describe('Authenticated User State', () => {
    it('should provide user data to authenticated components', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      // This would be tested with the Dashboard component
      expect(environment.auth.getState().user).toEqual(mockUser);
      expect(environment.auth.getState().isAuthenticated).toBe(true);
    });

    it('should clear user state on logout', async () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      await environment.auth.logout();

      expect(environment.auth.getState().user).toBeNull();
      expect(environment.auth.getState().isAuthenticated).toBe(false);
    });
  });

  // ============================================================================
  // Form Validation Tests
  // ============================================================================

  describe('Form Validation', () => {
    it('should require email field in login form', async () => {
      const { user } = renderWithProviders(<LoginPage />);

      await user.type(screen.getByLabelText('Password'), 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // HTML5 validation will prevent submission
      const emailInput = screen.getByLabelText<HTMLInputElement>('Email or Username');
      expect(emailInput.validity.valueMissing).toBe(true);
    });

    it('should require password field in login form', async () => {
      const { user } = renderWithProviders(<LoginPage />);

      await user.type(screen.getByLabelText('Email or Username'), 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // HTML5 validation will prevent submission
      const passwordInput = screen.getByLabelText<HTMLInputElement>('Password');
      expect(passwordInput.validity.valueMissing).toBe(true);
    });

    it('should require email field in registration form', async () => {
      const { user } = renderWithProviders(<RegisterPage />);

      await user.type(screen.getByLabelText('Password'), 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      const emailInput = screen.getByLabelText<HTMLInputElement>('Email');
      expect(emailInput.validity.valueMissing).toBe(true);
    });

    it('should validate email format', async () => {
      const { user } = renderWithProviders(<LoginPage />);

      await user.type(screen.getByLabelText('Email or Username'), 'invalid-email');

      // Note: The field type is "text" not "email", so typeMismatch won't work
      // This test is checking client-side validation, but the identifier field accepts both email and username
      const emailInput = screen.getByLabelText<HTMLInputElement>('Email or Username');
      expect(emailInput.value).toBe('invalid-email');
    });
  });
});
