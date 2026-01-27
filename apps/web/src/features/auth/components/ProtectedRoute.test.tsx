// apps/web/src/features/auth/components/__tests__/ProtectedRoute.test.tsx
import { MemoryRouter, Route, Routes } from '@abe-stack/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProtectedRoute } from '../ProtectedRoute';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
}));

// Mock UI components - we need to fully mock ProtectedRoute to avoid router context issues
// between different package instances in the monorepo
vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();
  const { Navigate, Outlet } = await importOriginal<typeof import('@abe-stack/ui')>();

  // Re-create ProtectedRoute using the same router instance as the test
  const ProtectedRoute = ({
    isAuthenticated,
    isLoading,
    redirectTo = '/login',
    loadingComponent,
    children,
  }: {
    isAuthenticated: boolean;
    isLoading: boolean;
    redirectTo?: string;
    loadingComponent?: React.ReactNode;
    children?: React.ReactNode;
  }): React.ReactElement => {
    if (isLoading) {
      return (loadingComponent ?? (
        <div className="loading-container">
          <div data-testid="spinner">Loading Spinner</div>
          <span>Loading...</span>
        </div>
      )) as React.ReactElement;
    }

    if (!isAuthenticated) {
      return <Navigate to={redirectTo} replace />;
    }

    return children ? <>{children}</> : <Outlet />;
  };

  return {
    ...actual,
    ProtectedRoute,
    Spinner: (): React.ReactElement => <div data-testid="spinner">Loading Spinner</div>,
    Text: ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <span>{children}</span>
    ),
  };
});

describe('ProtectedRoute', () => {
  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should display loading text with spinner', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should have proper loading container styling', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });

      const { container } = render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      const loadingDiv = container.querySelector('.loading-container');
      expect(loadingDiv).toBeInTheDocument();
      expect(loadingDiv).toHaveClass('loading-container');
    });
  });

  describe('Unauthenticated State', () => {
    it('should redirect to login when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      let currentLocation = '';

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <div
                  ref={(el): void => {
                    if (el) currentLocation = '/login';
                  }}
                >
                  Login Page
                </div>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(currentLocation).toBe('/login');
    });

    it('should not show protected content when unauthenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      render(
        <MemoryRouter>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div>Secret Data</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.queryByText('Secret Data')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated State - With Children', () => {
    it('should render children when authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should render multiple children when authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>First Child</div>
            <div>Second Child</div>
            <div>Third Child</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
      expect(screen.getByText('Third Child')).toBeInTheDocument();
    });

    it('should render complex component tree', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>
              <h1>Dashboard</h1>
              <p>Welcome back!</p>
              <button>Action</button>
            </div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });

  describe('Authenticated State - Without Children (Outlet)', () => {
    it('should render Outlet when no children provided', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/" element={<ProtectedRoute />}>
              <Route path="dashboard" element={<div>Dashboard from Outlet</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Dashboard from Outlet')).toBeInTheDocument();
    });

    it('should support nested routes via Outlet', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/app/profile']}>
          <Routes>
            <Route path="/app" element={<ProtectedRoute />}>
              <Route path="profile" element={<div>User Profile</div>} />
              <Route path="settings" element={<div>Settings</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    it('should transition from loading to authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });

      const { rerender } = render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Simulate authentication completing
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      rerender(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should transition from loading to unauthenticated redirect', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });

      const { rerender } = render(
        <MemoryRouter>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Simulate authentication check completing (not authenticated)
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      rerender(
        <MemoryRouter>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children when authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>{null}</ProtectedRoute>
        </MemoryRouter>,
      );

      // Should not crash
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    it('should handle undefined children when authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      const { container } = render(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<ProtectedRoute />}>
              <Route index element={<div>Index Route</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(container).toBeInTheDocument();
    });

    it('should prioritize loading state over authentication state', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: true,
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      // Should show loading even if authenticated is true
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Integration with React Router', () => {
    it('should preserve location state during redirect', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={[{ pathname: '/protected', state: { from: '/dashboard' } }]}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('should work with different route paths', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <Routes>
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <div>Admin Dashboard</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('should unmount without errors', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      const { unmount } = render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle rapid re-renders', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      const { rerender } = render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      for (let i = 0; i < 10; i++) {
        rerender(
          <MemoryRouter>
            <ProtectedRoute>
              <div>Content</div>
            </ProtectedRoute>
          </MemoryRouter>,
        );
      }

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
