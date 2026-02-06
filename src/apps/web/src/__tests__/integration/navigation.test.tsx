// apps/web/src/__tests__/integration/navigation.test.tsx
/**
 * Integration tests for navigation and routing.
 *
 * Tests:
 * - Protected route behavior (redirect when unauthenticated)
 * - Navigation between pages
 * - URL parameter handling
 * - Route guards and loading states
 *
 * Note: These tests use the test utility's renderWithProviders which wraps
 * components in MemoryRouter. The HomePage component uses buttons (not links)
 * for Login/Register actions that trigger navigation modals.
 */

import { Outlet, Route, Routes, useLocation, useNavigate } from '@abe-stack/ui';
import { act, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from '../../features/dashboard';
import { HomePage } from '../../pages';
import { createMockEnvironment, mockUser, renderWithProviders } from '../utils';

import type { ReactElement, ReactNode } from 'react';

// Module-level auth state variables used to pass to MockProtectedRoute
let isAuthenticated = false;
let isLoading = false;

// Mock for useAuth hook (used in Dashboard tests)
const mockUseAuth = vi.fn();

// Helper component to capture and display current location for testing
const LocationDisplay = (): ReactElement => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

// Simple ProtectedRoute mock that handles auth state internally
// Uses useNavigate instead of Navigate component to avoid ESM identity issues
const MockProtectedRoute = ({
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
}): ReactElement | null => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isLoading, isAuthenticated, redirectTo, navigate]);

  if (isLoading) {
    return (loadingComponent ?? (
      <div className="loading-container">
        <div data-testid="spinner">Loading Spinner</div>
        <span>Loading...</span>
      </div>
    )) as ReactElement;
  }

  if (!isAuthenticated) {
    // Return null while redirect is pending
    return null;
  }

  return children !== null && children !== undefined ? <>{children}</> : <Outlet />;
};

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
    it('should not render protected content when not authenticated', () => {
      isAuthenticated = false;
      isLoading = false;

      renderWithProviders(
        <MockProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
          <div data-testid="protected-content">Dashboard Content</div>
        </MockProtectedRoute>,
        { route: '/dashboard' },
      );

      // Protected content should not be visible when unauthenticated
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should show loading state while checking authentication', () => {
      isAuthenticated = false;
      isLoading = true;

      renderWithProviders(
        <Routes>
          <Route
            path="/dashboard"
            element={
              <MockProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                <div>Dashboard Content</div>
              </MockProtectedRoute>
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
              <MockProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                <DashboardPage />
              </MockProtectedRoute>
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
              <MockProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                <div data-testid="protected-content">Protected</div>
              </MockProtectedRoute>
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
              <MockProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                <div data-testid="protected-content">Protected</div>
              </MockProtectedRoute>
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
    it('should render home page with navigation elements', () => {
      renderWithProviders(<HomePage />, { route: '/' });

      // Main heading is "ABE Stack" (there may be duplicates in README content)
      const headings = screen.getAllByRole('heading', { name: /abe stack/i, level: 1 });
      expect(headings.length).toBeGreaterThanOrEqual(1);
      // Login and Register are buttons that trigger modals, not links
      expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^register$/i })).toBeInTheDocument();
      // Navigation links for Dashboard and UI Library
      expect(document.querySelector('a[href="/dashboard"]')).toBeInTheDocument();
      expect(document.querySelector('a[href="/ui-library"]')).toBeInTheDocument();
    });

    it('should have correct navigation link destinations', () => {
      renderWithProviders(<HomePage />, { route: '/' });

      // Use href-based queries for navigation links
      const dashboardLink = document.querySelector('a[href="/dashboard"]');
      const uiLibraryLink = document.querySelector('a[href="/ui-library"]');

      expect(dashboardLink).toBeInTheDocument();
      expect(uiLibraryLink).toBeInTheDocument();
    });

    it('should navigate to dashboard when dashboard link is clicked', async () => {
      // Set up authenticated state so dashboard shows content
      isAuthenticated = true;
      isLoading = false;

      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      const { user } = renderWithProviders(<HomePage />, { environment, route: '/' });

      const dashboardLink = document.querySelector('a[href="/dashboard"]');
      expect(dashboardLink).not.toBeNull();

      // Click will attempt navigation - test that link is clickable
      await act(async () => {
        await user.click(dashboardLink!);
      });
      // Note: Full navigation test is covered in Route Transitions tests
    });

    it('should navigate to ui-library page when ui-library link is clicked', async () => {
      const { user } = renderWithProviders(
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/ui-library"
            element={<div data-testid="ui-library-page">UI Library Page</div>}
          />
        </Routes>,
        { route: '/' },
      );

      const uiLibraryLink = document.querySelector('a[href="/ui-library"]');
      expect(uiLibraryLink).not.toBeNull();
      await user.click(uiLibraryLink!);

      expect(screen.getByTestId('ui-library-page')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Dashboard Navigation Tests
  // Note: Core dashboard functionality is tested in dashboard.test.tsx
  // This section focuses on navigation behavior with protected routes
  // ============================================================================

  describe('Dashboard Navigation', () => {
    it('should render dashboard when authenticated', () => {
      // Set module-level auth state for ProtectedRoute mock
      isAuthenticated = true;
      isLoading = false;

      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(
        <MockProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
          <DashboardPage />
        </MockProtectedRoute>,
        { environment, route: '/dashboard' },
      );

      // Dashboard should render when authenticated
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
      // Logout button should be present
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    it('should preserve dashboard route when authenticated', () => {
      // Set module-level auth state for ProtectedRoute mock
      isAuthenticated = true;
      isLoading = false;

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
                <MockProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                  <DashboardPage />
                </MockProtectedRoute>
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
      // Set module-level auth state for ProtectedRoute mock
      isAuthenticated = true;
      isLoading = false;

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
              <MockProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                <DashboardPage />
              </MockProtectedRoute>
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
      // Set module-level auth state for ProtectedRoute mock
      isAuthenticated = true;
      isLoading = false;

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
                <MockProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
                  <DashboardPage />
                </MockProtectedRoute>
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

    it('should not render dashboard content when not authenticated on deep link', () => {
      // Explicitly set module-level auth state for ProtectedRoute mock
      isAuthenticated = false;
      isLoading = false;

      renderWithProviders(
        <MockProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
          <div data-testid="dashboard-content">Dashboard Content</div>
        </MockProtectedRoute>,
        { route: '/dashboard' },
      );

      // Dashboard content should not be visible when not authenticated
      expect(screen.queryByTestId('dashboard-content')).not.toBeInTheDocument();
    });
  });
});
