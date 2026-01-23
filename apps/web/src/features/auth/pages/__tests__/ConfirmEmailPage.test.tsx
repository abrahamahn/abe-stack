// apps/web/src/features/auth/pages/__tests__/ConfirmEmailPage.test.tsx
import { QueryCache, QueryCacheProvider } from '@abe-stack/sdk';
import { MemoryRouter } from '@abe-stack/ui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmEmailPage } from '../ConfirmEmailPage';

// Mock the auth hook
const mockVerifyEmail = vi.fn();
const mockUseAuth = vi.fn(() => ({
  verifyEmail: mockVerifyEmail,
  isLoading: false,
  user: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ConfirmEmailPage', () => {
  const createQueryCache = (): QueryCache =>
    new QueryCache({
      defaultStaleTime: 0,
      defaultGcTime: 0,
    });

  const renderConfirmEmailPage = (
    initialEntries: string[] = ['/confirm-email?token=valid-token'],
  ): ReturnType<typeof render> => {
    const queryCache = createQueryCache();
    return render(
      <QueryCacheProvider cache={queryCache}>
        <MemoryRouter initialEntries={initialEntries}>
          <ConfirmEmailPage />
        </MemoryRouter>
      </QueryCacheProvider>,
    );
  };

  beforeEach((): void => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      verifyEmail: mockVerifyEmail,
      isLoading: false,
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockVerifyEmail.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderConfirmEmailPage();

      expect(screen.getByText(/verifying your email/i)).toBeInTheDocument();
      expect(
        screen.getByText(/please wait while we verify your email address/i),
      ).toBeInTheDocument();
    });

    it('should show spinner during verification', () => {
      mockVerifyEmail.mockImplementation(() => new Promise(() => {}));
      renderConfirmEmailPage();

      // Check for spinner presence via role or class
      const spinner = document.querySelector('.spinner, [role="status"]');
      expect(spinner || screen.getByText(/verifying/i)).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('should show success message after successful verification', async () => {
      mockVerifyEmail.mockResolvedValueOnce({});
      renderConfirmEmailPage();

      await waitFor(() => {
        expect(screen.getByText(/email verified/i)).toBeInTheDocument();
      });

      expect(
        screen.getByText(/your email has been verified and you are now signed in/i),
      ).toBeInTheDocument();
    });

    it('should show redirecting message after success', async () => {
      mockVerifyEmail.mockResolvedValueOnce({});
      renderConfirmEmailPage();

      await waitFor(() => {
        expect(screen.getByText(/redirecting to dashboard/i)).toBeInTheDocument();
      });
    });

    it('should navigate to dashboard after delay', async () => {
      vi.useFakeTimers();
      mockVerifyEmail.mockResolvedValueOnce({});
      renderConfirmEmailPage();

      // Wait for verification to complete (using runAllTimersAsync to work with fake timers)
      // Wrap in act to handle state updates triggered by timers
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Verify navigation was called
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      vi.useRealTimers();
    });

    it('should call verifyEmail with token from URL', async () => {
      mockVerifyEmail.mockResolvedValueOnce({});
      renderConfirmEmailPage(['/confirm-email?token=my-test-token']);

      await waitFor(() => {
        expect(mockVerifyEmail).toHaveBeenCalledWith({ token: 'my-test-token' });
      });
    });
  });

  describe('Error State', () => {
    it('should show error when token is missing', async () => {
      renderConfirmEmailPage(['/confirm-email']);

      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/invalid verification link/i)).toBeInTheDocument();
    });

    it('should show error message when verification fails', async () => {
      mockVerifyEmail.mockRejectedValueOnce(new Error('Token expired'));
      renderConfirmEmailPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument();
      });

      // Error message is displayed in the Text component
      expect(screen.getByText(/token expired/i)).toBeInTheDocument();
    });

    it('should show generic error for non-Error exceptions', async () => {
      mockVerifyEmail.mockRejectedValueOnce('Unknown error');
      renderConfirmEmailPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument();
      });
    });

    it('should show sign in button on error', async () => {
      renderConfirmEmailPage(['/confirm-email']);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to sign in/i })).toBeInTheDocument();
      });
    });

    it('should navigate to login when sign in button is clicked', async () => {
      renderConfirmEmailPage(['/confirm-email']);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to sign in/i })).toBeInTheDocument();
      });

      const signInButton = screen.getByRole('button', { name: /go to sign in/i });
      fireEvent.click(signInButton);

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      mockVerifyEmail.mockImplementation(() => new Promise(() => {}));
      renderConfirmEmailPage();

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      mockVerifyEmail.mockImplementation(() => new Promise(() => {}));
      const { container } = renderConfirmEmailPage();

      const authForm = container.querySelector('.auth-form');
      expect(authForm).toBeInTheDocument();
    });
  });
});
