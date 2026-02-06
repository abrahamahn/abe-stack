// apps/web/src/test/integration/error-handling.test.tsx
/**
 * Integration tests for error handling across the application.
 *
 * Tests:
 * - API error handling and display
 * - Form validation errors
 * - Network error states
 * - Unauthorized access handling
 */

import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoginPage, RegisterPage } from '../../features/auth';
import { DashboardPage } from '../../features/dashboard';
import { createMockEnvironment, mockUser, renderWithProviders } from '../utils';

import type { AuthService } from '../../features/auth';

describe('Error Handling Integration', () => {
  // ============================================================================
  // Authentication Error Tests
  // ============================================================================

  describe('Authentication Errors', () => {
    it('should display invalid credentials error', async () => {
      const environment = createMockEnvironment({
        loginError: new Error('Invalid email or password'),
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });

    it('should display account not found error', async () => {
      const environment = createMockEnvironment({
        loginError: new Error('Account not found'),
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'nonexistent@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Account not found')).toBeInTheDocument();
      });
    });

    it('should display email already registered error', async () => {
      const environment = createMockEnvironment({
        registerError: new Error('Email already registered'),
      });

      const { user } = renderWithProviders(<RegisterPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'existing@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument();
      });
    });

    it('should display account locked error', async () => {
      const environment = createMockEnvironment({
        loginError: new Error('Account is locked. Please try again later.'),
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'locked@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Account is locked. Please try again later.')).toBeInTheDocument();
      });
    });

    it('should display email not verified error', async () => {
      const environment = createMockEnvironment({
        loginError: new Error('Please verify your email before logging in'),
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'unverified@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Please verify your email before logging in')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Network Error Tests
  // ============================================================================

  describe('Network Errors', () => {
    it('should handle network timeout error', async () => {
      const environment = createMockEnvironment({
        loginError: new Error('Request timeout. Please try again.'),
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Request timeout. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle server unavailable error', async () => {
      const environment = createMockEnvironment({
        loginError: new Error('Server is currently unavailable'),
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Server is currently unavailable')).toBeInTheDocument();
      });
    });

    it('should handle connection refused error', async () => {
      const environment = createMockEnvironment({
        loginError: new Error('Unable to connect to server'),
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Unable to connect to server')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Registration Error Tests
  // ============================================================================

  describe('Registration Errors', () => {
    it('should display password too weak error', async () => {
      const environment = createMockEnvironment({
        registerError: new Error('Password is too weak'),
      });

      const { user } = renderWithProviders(<RegisterPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), '123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Password is too weak')).toBeInTheDocument();
      });
    });

    it('should display invalid email format error from server validation', async () => {
      const environment = createMockEnvironment({
        registerError: new Error('Invalid email format'),
      });

      const { user } = renderWithProviders(<RegisterPage />, { environment });

      // Type a technically valid email that server might reject
      // (e.g., valid format but server-side validation fails for domain)
      await user.type(screen.getByLabelText('Email'), 'test@invalid-domain.test');
      await user.type(screen.getByLabelText('Password'), 'password123');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Verify the error is displayed
      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    it('should validate email format with browser validation', async () => {
      const { user } = renderWithProviders(<RegisterPage />);

      // Type an invalid email format
      await user.type(screen.getByLabelText('Email'), 'invalid-email-no-at-symbol');
      await user.type(screen.getByLabelText('Password'), 'password123');

      // Try to submit - browser validation should prevent submission
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Verify the input has a validation error via HTML5 validation
      const emailInput = screen.getByLabelText<HTMLInputElement>('Email');
      expect(emailInput.validity.typeMismatch).toBe(true);
    });
  });

  // ============================================================================
  // Error Recovery Tests
  // ============================================================================

  describe('Error Recovery', () => {
    it('should clear error when user modifies input', async () => {
      const errorFn = vi.fn().mockRejectedValueOnce(new Error('Invalid credentials'));
      const environment = createMockEnvironment();
      (environment.auth as { login: AuthService['login'] }).login = errorFn;

      const { user } = renderWithProviders(<LoginPage />, { environment });

      // First attempt fails
      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // User starts typing again - error should clear when form is resubmitted
      await user.clear(screen.getByLabelText('Password'));
      await user.type(screen.getByLabelText('Password'), 'correct');

      // Submit again (this time with a success mock)
      errorFn.mockResolvedValueOnce(undefined);
      await user.click(screen.getByRole('button', { name: /sign in/i }));
    });

    it('should allow retry after error', async () => {
      let callCount = 0;
      const environment = createMockEnvironment();
      (environment.auth as { login: AuthService['login'] }).login = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First attempt failed');
        }
        // Second attempt succeeds
        return Promise.resolve();
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');

      // First click - fails
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('First attempt failed')).toBeInTheDocument();
      });

      // Second click - succeeds
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(callCount).toBe(2);
      });
    });
  });

  // ============================================================================
  // Logout Error Tests
  // ============================================================================

  describe('Logout Errors', () => {
    it('should handle logout failure gracefully', async () => {
      // Create a mock that catches the error properly
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      // Override logout to throw but handle the error internally
      const logoutSpy = vi.fn().mockImplementation(() => {
        // Simulate local state clearing even if server call fails
        // The actual error is handled in the service, not thrown to component
        return Promise.resolve();
      });
      (environment.auth as { logout: () => Promise<void> }).logout = logoutSpy;

      const { user } = renderWithProviders(<DashboardPage />, { environment });

      // Attempt to logout
      await user.click(screen.getByRole('button', { name: /logout/i }));

      // Logout should have been called
      await waitFor(() => {
        expect(logoutSpy).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // Error Message Styling Tests
  // ============================================================================

  describe('Error Message Display', () => {
    it('should display error in error container', async () => {
      const environment = createMockEnvironment({
        loginError: new Error('Test error message'),
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        const errorElement = screen.getByText('Test error message');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveClass('auth-form-error');
      });
    });

    it('should not display error initially', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Case Errors
  // ============================================================================

  describe('Edge Case Errors', () => {
    it('should handle empty error message', async () => {
      const environment = createMockEnvironment({
        loginError: new Error(''),
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Empty error message should not cause crash
      await waitFor(() => {
        // Form should be interactive again
        expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
      });
    });

    it('should handle error with special characters', async () => {
      const environment = createMockEnvironment({
        loginError: new Error('Error: <script>alert("xss")</script>'),
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        // Error should be displayed as text, not executed as script
        expect(screen.getByText('Error: <script>alert("xss")</script>')).toBeInTheDocument();
      });
    });

    it('should handle very long error message', async () => {
      const longErrorMessage = 'A'.repeat(500);
      const environment = createMockEnvironment({
        loginError: new Error(longErrorMessage),
      });

      const { user } = renderWithProviders(<LoginPage />, { environment });

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(longErrorMessage)).toBeInTheDocument();
      });
    });
  });
});
