// main/apps/web/src/features/auth/pages/RevertEmailChangePage.test.tsx
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { renderWithProviders } from './../../../__tests__/utils';
import { RevertEmailChangePage } from './RevertEmailChangePage';

const mockRevertEmailChange = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('@abe-stack/api', () => ({
  getApiClient: () => ({
    revertEmailChange: mockRevertEmailChange,
  }),
}));

vi.mock('@abe-stack/react/router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/react/router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RevertEmailChangePage', () => {
  const renderPage = (route = '/auth/change-email/revert?token=valid-token') =>
    renderWithProviders(<RevertEmailChangePage />, { route });

  beforeEach((): void => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading UI while request is pending', () => {
      mockRevertEmailChange.mockImplementation(() => new Promise(() => {}));
      renderPage();

      expect(screen.getByText(/reverting email change/i)).toBeInTheDocument();
      expect(screen.getByText(/please wait while we secure your account/i)).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('shows success heading and API message', async () => {
      mockRevertEmailChange.mockResolvedValueOnce({
        message: 'Email change reverted',
        email: 'old@example.com',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /email reverted/i })).toBeInTheDocument();
      });

      expect(screen.getByText('Email change reverted')).toBeInTheDocument();
      expect(screen.getByText('old@example.com')).toBeInTheDocument();
    });

    it('navigates to login when button is clicked on success', async () => {
      mockRevertEmailChange.mockResolvedValueOnce({
        message: 'Email change reverted',
        email: 'old@example.com',
      });
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /go to login/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Error State', () => {
    it('shows error when token is missing', async () => {
      renderPage('/auth/change-email/revert');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reversion failed/i })).toBeInTheDocument();
      });

      expect(
        screen.getByText(/invalid email reversion link\. no token was provided/i),
      ).toBeInTheDocument();
      expect(mockRevertEmailChange).not.toHaveBeenCalled();
    });

    it('shows API error message when request fails with Error', async () => {
      mockRevertEmailChange.mockRejectedValueOnce(new Error('Token expired or already used'));
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reversion failed/i })).toBeInTheDocument();
      });

      expect(screen.getByText('Token expired or already used')).toBeInTheDocument();
    });

    it('shows fallback error for non-Error exceptions', async () => {
      mockRevertEmailChange.mockRejectedValueOnce('unknown');
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reversion failed/i })).toBeInTheDocument();
      });

      expect(screen.getByText('Email change reversion failed')).toBeInTheDocument();
    });

    it('navigates to login when button is clicked on error', async () => {
      mockRevertEmailChange.mockRejectedValueOnce(new Error('Reversion failed'));
      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /go to login/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('calls API with token from URL', async () => {
    mockRevertEmailChange.mockResolvedValueOnce({
      message: 'ok',
      email: 'old@example.com',
    });
    renderPage('/auth/change-email/revert?token=my-token-123');

    await waitFor(() => {
      expect(mockRevertEmailChange).toHaveBeenCalledWith({ token: 'my-token-123' });
    });
  });
});
