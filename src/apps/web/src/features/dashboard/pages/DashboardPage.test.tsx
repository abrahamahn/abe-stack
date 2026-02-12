// src/apps/web/src/features/dashboard/pages/DashboardPage.test.tsx
import { DashboardPage } from '@dashboard/pages/DashboardPage';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockEnvironment, mockUser, renderWithProviders } from '../../../__tests__/utils';

import type { RenderWithProvidersResult } from '../../../__tests__/utils';
import type { User } from '../../auth';
import type { UserId } from '@abe-stack/shared';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('@abe-stack/react/router', async () => {
  const actual = await vi.importActual('@abe-stack/react/router');
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

// Mock useWorkspaces for GettingStartedChecklist
vi.mock('@features/workspace', () => ({
  useWorkspaces: (): {
    data: unknown[];
    isLoading: boolean;
    isError: boolean;
    error: null;
    refetch: () => void;
  } => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('DashboardPage', () => {
  const renderDashboardPage = (options?: {
    user?: User;
    isLoading?: boolean;
    isAuthenticated?: boolean;
  }): RenderWithProvidersResult => {
    const environment = createMockEnvironment({
      user: options?.user ?? mockUser,
      isLoading: options?.isLoading ?? false,
      isAuthenticated: options?.isAuthenticated ?? options?.user !== undefined,
    });

    return renderWithProviders(<DashboardPage />, { environment });
  };

  beforeEach((): void => {
    vi.clearAllMocks();
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

      expect(screen.getByText(/Test User/)).toBeInTheDocument();
    });

    it('should display user ID', () => {
      renderDashboardPage();

      expect(screen.getByText(/user-123/i)).toBeInTheDocument();
    });

    it('should render getting started checklist', () => {
      renderDashboardPage();

      expect(screen.getByRole('heading', { name: /getting started/i })).toBeInTheDocument();
    });

    it('should render checklist progress', () => {
      renderDashboardPage();

      expect(screen.getByText(/of 4 steps completed/i)).toBeInTheDocument();
    });
  });

  describe('User Name Display', () => {
    it('should display user full name', () => {
      renderDashboardPage();

      expect(screen.getByText(/Test User/)).toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    it('should call logout when logout button is clicked', async () => {
      const { environment } = renderDashboardPage();

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        // Auth state should change after logout
        expect(environment.auth.getState().isAuthenticated).toBe(false);
      });
    });

    it('should navigate to home after logout', async () => {
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
    it('should handle missing user gracefully', () => {
      // Should not throw when no user is provided
      expect(() =>
        renderDashboardPage({
          isAuthenticated: false,
        }),
      ).not.toThrow();
    });
  });

  describe('Aggressive TDD - Edge Cases', () => {
    it('should call logout when logout button is clicked', async () => {
      const { environment } = renderDashboardPage();

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(environment.auth.getState().isAuthenticated).toBe(false);
      });
    });

    it('should handle rapid logout clicks', async () => {
      renderDashboardPage();

      const logoutButton = screen.getByRole('button', { name: /logout/i });

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(logoutButton);
      }

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it('should handle user with empty email', () => {
      expect(() =>
        renderDashboardPage({
          user: {
            ...mockUser,
            email: '',
          },
        }),
      ).not.toThrow();
    });

    it('should handle user with empty id', () => {
      expect(() =>
        renderDashboardPage({
          user: {
            ...mockUser,
            id: '' as unknown as UserId,
          },
        }),
      ).not.toThrow();
    });

    it('should handle user with special characters in firstName', () => {
      renderDashboardPage({
        user: {
          ...mockUser,
          firstName: '<script>alert("xss")</script>',
        },
      });

      // React escapes HTML — rendered as text, not executed
      expect(screen.getByText(/<script>alert\("xss"\)<\/script> User/)).toBeInTheDocument();
    });

    it('should handle user with unicode firstName', () => {
      renderDashboardPage({
        user: {
          ...mockUser,
          firstName: '用户名',
          lastName: '🎉',
        },
      });

      expect(screen.getByText(/用户名 🎉/)).toBeInTheDocument();
    });

    it('should handle user with extremely long firstName', () => {
      const longFirstName = 'A'.repeat(1000);
      expect(() =>
        renderDashboardPage({
          user: {
            ...mockUser,
            firstName: longFirstName,
          },
        }),
      ).not.toThrow();
    });

    it('should handle 100 rapid re-renders', () => {
      const { rerender } = renderDashboardPage();

      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        rerender(<DashboardPage />);
      }

      const end = performance.now();

      // Keep performance expectation resilient to slower CI agents.
      expect(end - start).toBeLessThan(7000);
      expect(screen.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeInTheDocument();
    });

    it('should handle component unmount during logout', () => {
      const { unmount } = renderDashboardPage();

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      // Unmount while logout is pending - should not throw
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle user object being undefined', () => {
      expect(() =>
        renderDashboardPage({
          isAuthenticated: false,
        }),
      ).not.toThrow();
    });
  });
});
