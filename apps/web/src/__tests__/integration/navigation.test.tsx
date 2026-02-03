// apps/web/src/__tests__/integration/navigation.test.tsx
/**
 * Integration tests for navigation and routing.
 *
 * Tests:
 * - Protected route behavior (redirect when unauthenticated)
 * - Navigation between pages
 * - URL parameter handling
 * - Route guards and loading states
 */

import { Navigate, Outlet, ProtectedRoute, Route, Routes, useLocation } from '@abe-stack/ui';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../../features/dashboard';
import { HomePage } from '../../pages';

import { createMockEnvironment, mockUser, renderWithProviders } from '../utils';

import type { ReactElement, ReactNode } from 'react';

// Helper component to capture and display current location for testing
const LocationDisplay = (): ReactElement => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

let isAuthenticated = false;
let isLoading = false;

// Mock the @abe-stack/ui ProtectedRoute component for testing
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

    return children !== null && children !== undefined ? <>{children}</> : <Outlet />;
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
    isAuthenticated = false;
    isLoading = false;
  });

  describe('Protected Routes', () => {
    it('should redirect to login when not authenticated and verify location', () => {
      isAuthenticated = false;
      isLoading = false;

      renderWithProviders(
        <>
          <LocationDisplay />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                  <div>Dashboard Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          </Routes>
        </>,
        { route: '/dashboard' },
      );

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
      // Verify actual navigation occurred by checking location
      expect(screen.getByTestId('location-display')).toHaveTextContent('/login');
    });

    it('should show loading state while checking authentication', () => {
      isAuthenticated = false;
      isLoading = true;

      renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
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
      isAuthenticated = true;
      isLoading = false;

      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>,
        { environment, route: '/dashboard' },
      );

      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    it('should transition from loading to authenticated', () => {
      // Start with loading state
      isAuthenticated = false;
      isLoading = true;

      const { rerender } = renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                <div data-testid="protected-content">Protected</div>
              </ProtectedRoute>
            }
          />
        </Routes>,
        { route: '/dashboard' },
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Simulate auth completing
      isAuthenticated = true;
      isLoading = false;

      rerender(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
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

      // Main heading is "ABE Stack" (there may be duplicates in README content)
      const headings = screen.getAllByRole('heading', { name: /abe stack/i, level: 1 });
      expect(headings.length).toBeGreaterThanOrEqual(1);
      // Links wrap buttons, so we can find them by href attribute
      expect(screen.getByRole('link', { name: /^login$/i })).toBeInTheDocument();
      // For links in the README, there may be multiple "dashboard" matches, so be specific
      expect(document.querySelector('a[href="/dashboard"]')).toBeInTheDocument();
      expect(document.querySelector('a[href="/demo"]')).toBeInTheDocument();
    });

    it('should have correct link destinations', () => {
      renderWithProviders(<HomePage />, { route: '/' });

      // Use href-based queries to avoid ambiguity from README links
      const loginLink = document.querySelector('a[href="/login"]');
      const dashboardLink = document.querySelector('a[href="/dashboard"]');
      const demoLink = document.querySelector('a[href="/demo"]');

      expect(loginLink).toBeInTheDocument();
      expect(dashboardLink).toBeInTheDocument();
      expect(demoLink).toBeInTheDocument();
    });

    it('should navigate to login page when login link is clicked', async () => {
      const { user } = renderWithProviders(
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        </Routes>,
        { route: '/' },
      );

      const loginLink = document.querySelector('a[href="/login"]');
      expect(loginLink).not.toBeNull();
      await user.click(loginLink!);

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

      const demoLink = document.querySelector('a[href="/demo"]');
      expect(demoLink).not.toBeNull();
      await user.click(demoLink!);

      expect(screen.getByTestId('demo-page')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Dashboard Navigation Tests
  // Note: Core dashboard functionality is tested in dashboard.test.tsx
  // This section focuses on navigation behavior with protected routes
  // ============================================================================

  describe('Dashboard Navigation', () => {
    it('should redirect to home after logout and verify location', async () => {
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
        <>
          <LocationDisplay />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<div data-testid="home">Home</div>} />
          </Routes>
        </>,
        { environment, route: '/dashboard' },
      );

      // Verify we start at dashboard
      expect(screen.getByTestId('location-display')).toHaveTextContent('/dashboard');

      await user.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(logoutFn).toHaveBeenCalled();
      });

      // Verify navigation to home after logout
      await waitFor(() => {
        expect(screen.getByTestId('home')).toBeInTheDocument();
        expect(screen.getByTestId('location-display')).toHaveTextContent('/');
      });
    });

    it('should preserve dashboard route when authenticated', () => {
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
        <>
          <LocationDisplay />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </>,
        { environment, route: '/dashboard' },
      );

      // Verify location stays at dashboard
      expect(screen.getByTestId('location-display')).toHaveTextContent('/dashboard');
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
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
              <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>,
        { environment, route: '/' },
      );

      // Navigate to dashboard via href-based selector (avoids README link conflicts)
      const dashboardLink = document.querySelector('a[href="/dashboard"]');
      expect(dashboardLink).not.toBeNull();
      await user.click(dashboardLink!);

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
    it('should handle direct navigation to protected route when authenticated and verify location', () => {
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
        <>
          <LocationDisplay />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </>,
        { environment, route: '/dashboard' },
      );

      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
      // Verify location is preserved for deep link
      expect(screen.getByTestId('location-display')).toHaveTextContent('/dashboard');
    });

    it('should redirect deep link to login when not authenticated and verify location', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      renderWithProviders(
        <>
          <LocationDisplay />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                  <div>Dashboard Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login">Login</div>} />
          </Routes>
        </>,
        { route: '/dashboard' },
      );

      expect(screen.getByTestId('login')).toBeInTheDocument();
      // Verify redirect location
      expect(screen.getByTestId('location-display')).toHaveTextContent('/login');
    });
  });
});
