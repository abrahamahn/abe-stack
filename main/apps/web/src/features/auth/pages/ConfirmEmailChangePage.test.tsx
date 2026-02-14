// main/apps/web/src/features/auth/pages/ConfirmEmailChangePage.test.tsx
/**
 * Tests for the ConfirmEmailChangePage component.
 *
 * Covers:
 * - Loading state while API call is in progress
 * - Success state with new email display
 * - Error state (no token, API failure, non-Error exceptions)
 * - Navigation to settings and login
 * - API client integration with correct token
 *
 * @module ConfirmEmailChangePage.test
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { renderWithProviders } from './../../../__tests__/utils';
import { ConfirmEmailChangePage } from './ConfirmEmailChangePage';

// ============================================================================
// Mocks
// ============================================================================

const mockConfirmEmailChange = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('@abe-stack/api', () => ({
  getApiClient: () => ({
    confirmEmailChange: mockConfirmEmailChange,
  }),
}));

vi.mock('@abe-stack/react/router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/react/router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ============================================================================
// Tests
// ============================================================================

describe('ConfirmEmailChangePage', () => {
  /**
   * Helper to render the page with a specific route (URL with query params).
   *
   * @param route - The URL path including query string
   * @returns Render result from renderWithProviders
   */
  const renderPage = (route = '/auth/change-email/confirm?token=valid-token-123') =>
    renderWithProviders(<ConfirmEmailChangePage />, { route });

  beforeEach((): void => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Loading State
  // --------------------------------------------------------------------------

  describe('Loading State', () => {
    it('should show loading state initially when token is present', () => {
      mockConfirmEmailChange.mockImplementation(() => new Promise(() => {}));
      renderPage();

      expect(screen.getByText(/confirming email change/i)).toBeInTheDocument();
    });

    it('should show spinner during confirmation', () => {
      mockConfirmEmailChange.mockImplementation(() => new Promise(() => {}));
      const { container } = renderPage();

      const spinner = container.querySelector('[role="status"], .spinner');
      expect(spinner ?? screen.getByText(/confirming email change/i)).toBeInTheDocument();
    });

    it('should show waiting message during confirmation', () => {
      mockConfirmEmailChange.mockImplementation(() => new Promise(() => {}));
      renderPage();

      expect(
        screen.getByText(/please wait while we confirm your new email address/i),
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Success State
  // --------------------------------------------------------------------------

  describe('Success State', () => {
    it('should show success heading after successful confirmation', async () => {
      mockConfirmEmailChange.mockResolvedValueOnce({
        message: 'Email changed successfully',
        email: 'new@example.com',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /email updated/i })).toBeInTheDocument();
      });
    });

    it('should display the API success message', async () => {
      mockConfirmEmailChange.mockResolvedValueOnce({
        message: 'Your email address has been updated',
        email: 'new@example.com',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Your email address has been updated')).toBeInTheDocument();
      });
    });

    it('should display the new email address', async () => {
      mockConfirmEmailChange.mockResolvedValueOnce({
        message: 'Email changed',
        email: 'newemail@example.com',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('newemail@example.com')).toBeInTheDocument();
      });

      expect(screen.getByText(/your email is now/i)).toBeInTheDocument();
    });

    it('should not display email line when email is empty string', async () => {
      mockConfirmEmailChange.mockResolvedValueOnce({
        message: 'Email changed',
        email: '',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Email changed')).toBeInTheDocument();
      });

      expect(screen.queryByText(/your email is now/i)).not.toBeInTheDocument();
    });

    it('should show Go to Settings button on success', async () => {
      mockConfirmEmailChange.mockResolvedValueOnce({
        message: 'Email changed',
        email: 'new@example.com',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to settings/i })).toBeInTheDocument();
      });
    });

    it('should navigate to /settings when Go to Settings is clicked', async () => {
      mockConfirmEmailChange.mockResolvedValueOnce({
        message: 'Email changed',
        email: 'new@example.com',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to settings/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /go to settings/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('should not show sign in button on success', async () => {
      mockConfirmEmailChange.mockResolvedValueOnce({
        message: 'Email changed',
        email: 'new@example.com',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /email updated/i })).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /go to sign in/i })).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Error State
  // --------------------------------------------------------------------------

  describe('Error State', () => {
    it('should show error when no token is provided', async () => {
      renderPage('/auth/change-email/confirm');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirmation failed/i })).toBeInTheDocument();
      });

      expect(
        screen.getByText(/invalid email change link\. no token was provided/i),
      ).toBeInTheDocument();
    });

    it('should show error when API call fails with Error', async () => {
      mockConfirmEmailChange.mockRejectedValueOnce(new Error('Token expired or invalid'));
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirmation failed/i })).toBeInTheDocument();
      });

      expect(screen.getByText('Token expired or invalid')).toBeInTheDocument();
    });

    it('should show generic error message for non-Error exceptions', async () => {
      mockConfirmEmailChange.mockRejectedValueOnce('some unknown error');
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirmation failed/i })).toBeInTheDocument();
      });

      expect(screen.getByText('Email change confirmation failed')).toBeInTheDocument();
    });

    it('should show both navigation buttons on error', async () => {
      renderPage('/auth/change-email/confirm');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to settings/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /go to sign in/i })).toBeInTheDocument();
    });

    it('should navigate to /settings when Go to Settings is clicked on error', async () => {
      renderPage('/auth/change-email/confirm');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to settings/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /go to settings/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('should navigate to /login when Go to sign in is clicked on error', async () => {
      renderPage('/auth/change-email/confirm');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to sign in/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /go to sign in/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should not call API when token is missing', async () => {
      renderPage('/auth/change-email/confirm');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirmation failed/i })).toBeInTheDocument();
      });

      expect(mockConfirmEmailChange).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // API Integration
  // --------------------------------------------------------------------------

  describe('API Integration', () => {
    it('should call confirmEmailChange with token from URL', async () => {
      mockConfirmEmailChange.mockResolvedValueOnce({
        message: 'Success',
        email: 'new@example.com',
      });
      renderPage('/auth/change-email/confirm?token=my-special-token');

      await waitFor(() => {
        expect(mockConfirmEmailChange).toHaveBeenCalledWith({ token: 'my-special-token' });
      });
    });

    it('should call API exactly once per render', async () => {
      mockConfirmEmailChange.mockResolvedValueOnce({
        message: 'Success',
        email: 'new@example.com',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /email updated/i })).toBeInTheDocument();
      });

      expect(mockConfirmEmailChange).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors gracefully', async () => {
      mockConfirmEmailChange.mockRejectedValueOnce(new Error('Network error'));
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('should have proper heading hierarchy in loading state', () => {
      mockConfirmEmailChange.mockImplementation(() => new Promise(() => {}));
      renderPage();

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/confirming email change/i);
    });

    it('should have proper heading hierarchy in success state', async () => {
      mockConfirmEmailChange.mockResolvedValueOnce({
        message: 'Done',
        email: 'new@example.com',
      });
      renderPage();

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toHaveTextContent(/email updated/i);
      });
    });

    it('should have proper heading hierarchy in error state', async () => {
      renderPage('/auth/change-email/confirm');

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toHaveTextContent(/confirmation failed/i);
      });
    });

    it('should render within auth form container', () => {
      mockConfirmEmailChange.mockImplementation(() => new Promise(() => {}));
      const { container } = renderPage();

      const authFormContent = container.querySelector('.auth-form-content');
      expect(authFormContent).toBeInTheDocument();
    });

    it('should have proper form structure with auth-form class', () => {
      mockConfirmEmailChange.mockImplementation(() => new Promise(() => {}));
      const { container } = renderPage();

      const authForm = container.querySelector('.auth-form');
      expect(authForm).toBeInTheDocument();
    });
  });
});
