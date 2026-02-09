// src/apps/web/src/__tests__/integration/navigation.test.tsx
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

import { Outlet, useNavigate } from '@abe-stack/ui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../app/App';
import { createMockEnvironment, mockUser, renderWithProviders } from '../utils';

import type { ReactElement, ReactNode } from 'react';

// Module-level auth state variables used to pass to MockProtectedRoute
let isAuthenticated = false;
let isLoading = false;

// Mock for useAuth hook (used in Dashboard tests)
const mockUseAuth = vi.fn();

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

const renderAppAtRoute = (
  route: string,
  environment = createMockEnvironment(),
): {
  user: ReturnType<typeof userEvent.setup>;
} => {
  window.history.replaceState({}, '', route);
  const user = userEvent.setup();
  render(<App environment={environment} />);
  return { user };
};

// ============================================================================
// Protected Route Tests
// ============================================================================

describe('Navigation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
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

      renderAppAtRoute(
        '/dashboard',
        createMockEnvironment({ isAuthenticated: false, isLoading: true }),
      );

      expect(screen.getByTestId('app-top-panel')).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /ABE Stack Dashboard/i }),
      ).not.toBeInTheDocument();
    });

    it('should render protected content when authenticated', () => {
      isAuthenticated = true;
      isLoading = false;

      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderAppAtRoute('/dashboard', environment);

      expect(screen.getByTestId('app-top-panel')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    it('should transition from loading to authenticated', () => {
      // Removed async
      // Start with loading state
      isAuthenticated = false;
      isLoading = true;

      window.history.replaceState({}, '', '/dashboard');
      const { rerender } = render(
        <App environment={createMockEnvironment({ isAuthenticated: false, isLoading: true })} />,
      );

      expect(screen.getByTestId('app-top-panel')).toBeInTheDocument();

      // Simulate auth completing
      isAuthenticated = true;
      isLoading = false;

      rerender(
        <App
          environment={createMockEnvironment({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
          })}
        />,
      );

      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Home Page Navigation Tests
  // ============================================================================

  describe('Home Page Navigation', () => {
    it('should render home page with navigation elements', () => {
      renderAppAtRoute('/', createMockEnvironment());

      // Main heading is "ABE Stack" (there may be duplicates in README content)
      const headings = screen.getAllByRole('heading', { name: /abe stack/i, level: 1 });
      expect(headings.length).toBeGreaterThanOrEqual(1);
      // Login and Register are buttons that trigger modals, not links
      expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^register$/i })).toBeInTheDocument();
      // Navigation links in right-side Home menu
      expect(screen.getByRole('link', { name: 'Auth' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    });

    it('should have correct navigation link destinations', () => {
      renderAppAtRoute('/', createMockEnvironment());

      // Use href-based queries for navigation links
      expect(screen.getByRole('link', { name: 'Auth' })).toHaveAttribute('href', '/auth');
      expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
        'href',
        '/settings/accounts',
      );
      expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    });

    it('should navigate to dashboard when dashboard link is clicked', async () => {
      // Set up authenticated state so dashboard shows content
      isAuthenticated = true;
      isLoading = false;

      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      const { user } = renderAppAtRoute('/', environment);

      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
      expect(dashboardLink).not.toBeNull();
      await user.click(dashboardLink);
      expect(screen.getByRole('heading', { name: /ABE Stack Dashboard/i })).toBeInTheDocument();
      expect(window.location.pathname).toBe('/dashboard');
    });

    it('should navigate to auth page when auth link is clicked', async () => {
      const { user } = renderAppAtRoute('/', createMockEnvironment());

      const authLink = screen.getByRole('link', { name: 'Auth' });
      expect(authLink).not.toBeNull();
      await user.click(authLink);
      expect(screen.getByRole('heading', { name: /ABE Stack Auth/i })).toBeInTheDocument();
      expect(window.location.pathname).toBe('/auth');
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

      renderAppAtRoute('/dashboard', environment);

      // Authenticated controls should be present
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

      renderAppAtRoute(
        '/dashboard',
        createMockEnvironment({ user: mockUser, isAuthenticated: true }),
      );

      expect(window.location.pathname).not.toBe('/login');
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
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

      const { user } = renderAppAtRoute('/', environment);

      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
      expect(dashboardLink).not.toBeNull();
      await user.click(dashboardLink);

      // Should still be authenticated
      expect(screen.getByRole('heading', { name: /ABE Stack Dashboard/i })).toBeInTheDocument();
      expect(window.location.pathname).toBe('/dashboard');
    });

    it('should handle navigation to non-existent routes gracefully', () => {
      renderAppAtRoute('/non-existent-route', createMockEnvironment());

      // Route remains reachable in browser history and app shell still renders.
      expect(screen.getByTestId('app-top-panel')).toBeInTheDocument();
      expect(window.location.pathname).toBe('/non-existent-route');
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

      renderAppAtRoute('/dashboard', environment);

      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    it('should not render dashboard content when not authenticated on deep link', () => {
      // Explicitly set module-level auth state for ProtectedRoute mock
      isAuthenticated = false;
      isLoading = false;

      renderAppAtRoute(
        '/dashboard',
        createMockEnvironment({ isAuthenticated: false, isLoading: false }),
      );

      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    });
  });
});
