// apps/web/src/test/integration/navigation.test.tsx
/**
 * Integration tests for navigation and routing.
 *
 * Tests:
 * - Protected route behavior (redirect when unauthenticated)
 * - Navigation between pages
 * - URL parameter handling
 * - Route guards and loading states
 */

import { ProtectedRoute } from '@features/auth';
import { DashboardPage } from '@features/dashboard';
import { HomePage } from '@pages';
import { screen, waitFor } from '@testing-library/react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createMockEnvironment, mockUser, renderWithProviders } from '../utils';

import type { ReactElement, ReactNode } from 'react';

// Mock useAuth hook for ProtectedRoute tests
const mockUseAuth = vi.fn();
vi.mock('@auth/hooks/useAuth', () => ({
  useAuth: (): ReturnType<typeof mockUseAuth> => mockUseAuth(),
}));

// Mock the @abe-stack/ui ProtectedRoute to use local react-router-dom
vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();

  const ProtectedRouteComponent = ({
    isAuthenticated,
    isLoading,
    redirectTo = '/login',
    loadingComponent,
    children,
  }: {
    isAuthenticated: boolean;
    isLoading: boolean;
    redirectTo?: string;
    loadingComponent?: ReactNode;
    children?: ReactNode;
  }): ReactElement => {
    if (isLoading) {
      return (loadingComponent ?? (
        <div className="loading-container">
          <div data-testid="spinner">Loading Spinner</div>
          <span>Loading...</span>
        </div>
      )) as ReactElement;
    }

    if (!isAuthenticated) {
      return <Navigate to={redirectTo} replace />;
    }

    return children ? <>{children}</> : <Outlet />;
  };

  return {
    ...actual,
    ProtectedRoute: ProtectedRouteComponent,
  };
});

// ============================================================================
// Protected Route Tests
// ============================================================================

describe('Navigation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Protected Routes', () => {
    it('should redirect to login when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>,
        { route: '/dashboard' },
      );

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
    });

    it('should show loading state while checking authentication', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>,
        { route: '/dashboard' },
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
    });

    it('should render protected content when authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });

      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>,
        { environment, route: '/dashboard' },
      );

      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    it('should transition from loading to authenticated', async () => {
      // Start with loading state
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });

      const { rerender } = renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected</div>
              </ProtectedRoute>
            }
          />
        </Routes>,
        { route: '/dashboard' },
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Simulate auth completing
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });

      rerender(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected</div>
              </ProtectedRoute>
            }
          />
        </Routes>,
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Home Page Navigation Tests
  // ============================================================================

  describe('Home Page Navigation', () => {
    it('should render home page with navigation links', () => {
      renderWithProviders(<HomePage />, { route: '/' });

      expect(screen.getByRole('heading', { name: /welcome to abe stack/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /demo/i })).toBeInTheDocument();
    });

    it('should have correct link destinations', () => {
      renderWithProviders(<HomePage />, { route: '/' });

      const loginLink = screen.getByRole('link', { name: /login/i });
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const demoLink = screen.getByRole('link', { name: /demo/i });

      expect(loginLink).toHaveAttribute('href', '/login');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      expect(demoLink).toHaveAttribute('href', '/demo');
    });

    it('should navigate to login page when login link is clicked', async () => {
      const { user } = renderWithProviders(
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        </Routes>,
        { route: '/' },
      );

      const loginLink = screen.getByRole('link', { name: /login/i });
      await user.click(loginLink);

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('should navigate to demo page when demo link is clicked', async () => {
      const { user } = renderWithProviders(
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/demo" element={<div data-testid="demo-page">Demo Page</div>} />
        </Routes>,
        { route: '/' },
      );

      const demoLink = screen.getByRole('link', { name: /demo/i });
      await user.click(demoLink);

      expect(screen.getByTestId('demo-page')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Dashboard Navigation Tests
  // ============================================================================

  describe('Dashboard Navigation', () => {
    it('should render dashboard with user information', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
      });

      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>,
        { environment, route: '/dashboard' },
      );

      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
      expect(screen.getByText(mockUser.name!)).toBeInTheDocument();
    });

    it('should show logout button on dashboard', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
      });

      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>,
        { environment, route: '/dashboard' },
      );

      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    it('should call logout when logout button is clicked', async () => {
      const logoutFn = vi.fn().mockResolvedValue(undefined);
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        logout: logoutFn,
      });

      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      const { user } = renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>,
        { environment, route: '/dashboard' },
      );

      await user.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(logoutFn).toHaveBeenCalled();
      });
    });

    it('should display "Not provided" when user has no name', () => {
      const userWithoutName = { ...mockUser, name: null };
      mockUseAuth.mockReturnValue({
        user: userWithoutName,
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
      });

      const environment = createMockEnvironment({
        user: userWithoutName,
        isAuthenticated: true,
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>,
        { environment, route: '/dashboard' },
      );

      expect(screen.getByText('Not provided')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Route Transitions Tests
  // ============================================================================

  describe('Route Transitions', () => {
    it('should maintain auth state across route changes', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
      });

      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      const { user } = renderWithProviders(
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>,
        { environment, route: '/' },
      );

      // Navigate to dashboard
      await user.click(screen.getByRole('link', { name: /dashboard/i }));

      // Should still be authenticated
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    it('should handle navigation to non-existent routes gracefully', () => {
      renderWithProviders(
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<div data-testid="not-found">Not Found</div>} />
        </Routes>,
        { route: '/non-existent-route' },
      );

      expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Deep Linking Tests
  // ============================================================================

  describe('Deep Linking', () => {
    it('should handle direct navigation to protected route when authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
      });

      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>,
        { environment, route: '/dashboard' },
      );

      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    it('should redirect deep link to login when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login">Login</div>} />
        </Routes>,
        { route: '/dashboard' },
      );

      expect(screen.getByTestId('login')).toBeInTheDocument();
    });
  });
});
