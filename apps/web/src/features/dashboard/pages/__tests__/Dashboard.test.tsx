// apps/web/src/features/dashboard/pages/__tests__/Dashboard.test.tsx
import { MemoryRouter } from '@abe-stack/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from '../Dashboard';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

// Mock the auth context
const mockLogout = vi.fn();
const mockUseAuth = vi.fn(() => ({
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  },
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  register: vi.fn(),
  logout: mockLogout,
}));

vi.mock('../../../auth', () => ({
  useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
}));

describe('DashboardPage', () => {
  const createQueryClient = (): QueryClient =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

  const renderDashboardPage = (): ReturnType<typeof render> => {
    const queryClient = createQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach((): void => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
    });
  });

  describe('Rendering', () => {
    it('should render the dashboard heading', () => {
      renderDashboardPage();

      // Use level to get the h1 heading specifically
      expect(screen.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeInTheDocument();
    });

    it('should render logout button', () => {
      renderDashboardPage();

      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    it('should render Your Profile section', () => {
      renderDashboardPage();

      expect(screen.getByRole('heading', { name: /your profile/i })).toBeInTheDocument();
    });

    it('should display user email', () => {
      renderDashboardPage();

      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });

    it('should display user name', () => {
      renderDashboardPage();

      expect(screen.getByText(/test user/i)).toBeInTheDocument();
    });

    it('should display user ID', () => {
      renderDashboardPage();

      expect(screen.getByText(/user-123/i)).toBeInTheDocument();
    });

    it('should render welcome card', () => {
      renderDashboardPage();

      expect(screen.getByText(/welcome to your dashboard/i)).toBeInTheDocument();
    });

    it('should render protected route info', () => {
      renderDashboardPage();

      expect(screen.getByText(/protected route that requires authentication/i)).toBeInTheDocument();
    });
  });

  describe('User Without Name', () => {
    it('should display "Not provided" when name is null', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-456',
          email: 'noname@example.com',
          name: null as unknown as string,
        },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: mockLogout,
      });

      renderDashboardPage();

      expect(screen.getByText(/not provided/i)).toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    it('should call logout when logout button is clicked', async () => {
      mockLogout.mockResolvedValueOnce(undefined);
      renderDashboardPage();

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should navigate to home after logout', async () => {
      mockLogout.mockResolvedValueOnce(undefined);
      renderDashboardPage();

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Semantic Structure', () => {
    it('should have proper section structure', () => {
      const { container } = renderDashboardPage();

      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(1);
    });

    it('should have header section with title and logout', () => {
      const { container } = renderDashboardPage();

      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveClass('flex-between');
    });
  });

  describe('Null User Handling', () => {
    it('should handle null user gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null as unknown as { id: string; email: string; name: string },
        isLoading: false,
        isAuthenticated: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: mockLogout,
      });

      // Should not throw
      expect(() => renderDashboardPage()).not.toThrow();
    });
  });

  describe('Aggressive TDD - Edge Cases', () => {
    it('should call logout when logout button is clicked', async () => {
      // Logout resolves successfully
      mockLogout.mockResolvedValueOnce(undefined);

      renderDashboardPage();

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should handle rapid logout clicks', async () => {
      mockLogout.mockResolvedValue(undefined);
      renderDashboardPage();

      const logoutButton = screen.getByRole('button', { name: /logout/i });

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(logoutButton);
      }

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should handle user with empty email', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: '',
          name: 'Test User',
        },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: mockLogout,
      });

      expect(() => renderDashboardPage()).not.toThrow();
    });

    it('should handle user with empty name and id', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '',
          email: 'test@example.com',
          name: '',
        },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: mockLogout,
      });

      expect(() => renderDashboardPage()).not.toThrow();
    });

    it('should handle user with special characters in name', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: '<script>alert("xss")</script>',
        },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: mockLogout,
      });

      renderDashboardPage();

      // Should render as text, not execute
      expect(screen.getByText(/script/i)).toBeInTheDocument();
    });

    it('should handle user with unicode name', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: '用户名 🎉',
        },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: mockLogout,
      });

      renderDashboardPage();

      expect(screen.getByText(/用户名 🎉/)).toBeInTheDocument();
    });

    it('should handle user with extremely long name', () => {
      const longName = 'A'.repeat(1000);
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: longName,
        },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: mockLogout,
      });

      expect(() => renderDashboardPage()).not.toThrow();
    });

    it('should handle 100 rapid re-renders', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <DashboardPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        rerender(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <DashboardPage />
            </MemoryRouter>
          </QueryClientProvider>,
        );
      }

      const end = performance.now();

      // Should complete within 2 seconds
      expect(end - start).toBeLessThan(2000);
      expect(screen.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeInTheDocument();
    });

    it('should handle component unmount during logout', () => {
      let resolveLogout: (() => void) | undefined;
      mockLogout.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveLogout = resolve;
          }),
      );

      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <DashboardPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      // Unmount while logout is pending
      expect(() => {
        unmount();
      }).not.toThrow();

      // Resolve after unmount
      if (resolveLogout) {
        resolveLogout();
      }
    });

    it('should handle user object being undefined', () => {
      mockUseAuth.mockReturnValue({
        user: undefined as unknown as { id: string; email: string; name: string },
        isLoading: false,
        isAuthenticated: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: mockLogout,
      });

      expect(() => renderDashboardPage()).not.toThrow();
    });
  });
});
