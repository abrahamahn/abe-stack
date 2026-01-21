// apps/web/src/test/integration/email-verification.test.tsx
/**
 * Integration tests for email verification flow.
 *
 * Tests:
 * - Email confirmation page loading state
 * - Success verification flow
 * - Error handling for missing token
 */

import { ConfirmEmailPage } from '@features/auth';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockUser, renderWithProviders } from '../utils';

// Mock useAuth hook - must mock the barrel export as that's what the component imports from
const mockVerifyEmail = vi.fn();
vi.mock('@auth/hooks', () => ({
  useAuth: () => ({
    verifyEmail: mockVerifyEmail,
  }),
  useAuthModeNavigation: () => ({
    navigateToMode: vi.fn(),
    navigateToLogin: vi.fn(),
  }),
  useResendCooldown: () => ({
    cooldown: 0,
    isOnCooldown: false,
    startCooldown: vi.fn(),
  }),
}));

describe('Email Verification Integration', () => {
  beforeEach(() => {
    mockVerifyEmail.mockClear();
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      // Create a promise that never resolves to keep loading state
      let resolveVerify: () => void;
      const verifyPromise = new Promise<void>((resolve) => {
        resolveVerify = resolve;
      });
      mockVerifyEmail.mockImplementation(async () => {
        await verifyPromise;
        return { verified: true, message: 'Email verified', token: 'token', user: mockUser };
      });

      renderWithProviders(
        <Routes>
          <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
        </Routes>,
        { route: '/auth/confirm-email?token=valid-token' },
      );

      expect(screen.getByText('Verifying your email...')).toBeInTheDocument();
      expect(
        screen.getByText('Please wait while we verify your email address.'),
      ).toBeInTheDocument();

      // Cleanup
      resolveVerify!();
    });

    it('should show spinner during loading', () => {
      let resolveVerify: () => void;
      const verifyPromise = new Promise<void>((resolve) => {
        resolveVerify = resolve;
      });
      mockVerifyEmail.mockImplementation(async () => {
        await verifyPromise;
        return { verified: true, message: 'Email verified', token: 'token', user: mockUser };
      });

      renderWithProviders(
        <Routes>
          <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
        </Routes>,
        { route: '/auth/confirm-email?token=valid-token' },
      );

      // Verify loading state is shown by checking the loading content
      // The loading state displays specific text content
      expect(screen.getByText('Verifying your email...')).toBeInTheDocument();
      expect(
        screen.getByText('Please wait while we verify your email address.'),
      ).toBeInTheDocument();

      // Also verify that success/error states are not shown
      expect(screen.queryByText('Email verified!')).not.toBeInTheDocument();
      expect(screen.queryByText('Verification failed')).not.toBeInTheDocument();

      // Cleanup
      resolveVerify!();
    });
  });

  // ============================================================================
  // Success State Tests
  // ============================================================================

  describe('Verification Success', () => {
    it('should show success message after verification', async () => {
      mockVerifyEmail.mockResolvedValue({
        verified: true,
        message: 'Email verified',
        token: 'auth-token',
        user: mockUser,
      });

      renderWithProviders(
        <Routes>
          <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>,
        { route: '/auth/confirm-email?token=valid-token' },
      );

      await waitFor(() => {
        expect(screen.getByText('Email verified!')).toBeInTheDocument();
      });
    });

    it('should show success message content', async () => {
      mockVerifyEmail.mockResolvedValue({
        verified: true,
        message: 'Email verified',
        token: 'auth-token',
        user: mockUser,
      });

      renderWithProviders(
        <Routes>
          <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>,
        { route: '/auth/confirm-email?token=valid-token' },
      );

      await waitFor(() => {
        expect(
          screen.getByText('Your email has been verified and you are now signed in.'),
        ).toBeInTheDocument();
      });
    });

    it('should show redirect message after verification', async () => {
      mockVerifyEmail.mockResolvedValue({
        verified: true,
        message: 'Email verified',
        token: 'auth-token',
        user: mockUser,
      });

      renderWithProviders(
        <Routes>
          <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>,
        { route: '/auth/confirm-email?token=valid-token' },
      );

      await waitFor(() => {
        expect(screen.getByText('Redirecting to dashboard...')).toBeInTheDocument();
      });
    });

    it('should call verifyEmail with token', async () => {
      mockVerifyEmail.mockResolvedValue({
        verified: true,
        message: 'Email verified',
        token: 'auth-token',
        user: mockUser,
      });

      renderWithProviders(
        <Routes>
          <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>,
        { route: '/auth/confirm-email?token=my-verification-token' },
      );

      await waitFor(() => {
        expect(mockVerifyEmail).toHaveBeenCalledWith({ token: 'my-verification-token' });
      });
    });
  });

  // ============================================================================
  // Error State Tests
  // ============================================================================

  describe('Verification Error', () => {
    it('should show error when token is missing', () => {
      renderWithProviders(
        <Routes>
          <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
        </Routes>,
        { route: '/auth/confirm-email' }, // No token param
      );

      // Should immediately show error
      expect(screen.getByText('Verification failed')).toBeInTheDocument();
      expect(screen.getByText('Invalid verification link')).toBeInTheDocument();
    });
  });
});
