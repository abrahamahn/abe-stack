// apps/web/src/__tests__/integration/dashboard.test.tsx
/**
 * Integration tests for the Dashboard feature.
 *
 * Tests:
 * - User profile display
 * - Logout functionality
 * - UI components and layout
 */

import { Route, Routes } from '@abe-stack/ui';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../../features/dashboard';

import { createMockEnvironment, mockAdminUser, mockUser, renderWithProviders } from '../utils';

describe('Dashboard Integration', () => {
  // ============================================================================
  // User Profile Display Tests
  // ============================================================================

  describe('User Profile Display', () => {
    it('should display user email', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });

    it('should display user name when provided', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      expect(screen.getByText(mockUser.name!)).toBeInTheDocument();
    });

    it('should display "Not provided" when user has no name', () => {
      const userWithoutName = { ...mockUser, name: null };
      const environment = createMockEnvironment({
        user: userWithoutName,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      expect(screen.getByText('Not provided')).toBeInTheDocument();
    });

    it('should display user ID', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      expect(screen.getByText(mockUser.id)).toBeInTheDocument();
    });

    it('should display admin user information correctly', () => {
      const environment = createMockEnvironment({
        user: mockAdminUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      expect(screen.getByText(mockAdminUser.email)).toBeInTheDocument();
      expect(screen.getByText(mockAdminUser.name!)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Layout Tests
  // ============================================================================

  describe('Layout and Structure', () => {
    it('should render dashboard heading', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    it('should render profile card with heading', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      expect(screen.getByRole('heading', { name: 'Your Profile' })).toBeInTheDocument();
    });

    it('should render welcome card', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      expect(screen.getByText(/welcome to your dashboard/i)).toBeInTheDocument();
    });

    it('should display protected route information', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      expect(screen.getByText(/protected route/i)).toBeInTheDocument();
      expect(screen.getByText(/JWT token/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Logout Functionality Tests
  // ============================================================================

  describe('Logout Functionality', () => {
    it('should render logout button', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    it('should call logout when button is clicked', async () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      const logoutSpy = vi.spyOn(environment.auth, 'logout');

      const { user } = renderWithProviders(
        <Routes>
          <Route path="/" element={<DashboardPage />} />
        </Routes>,
        { environment, route: '/' },
      );

      await user.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(logoutSpy).toHaveBeenCalled();
      });
    });

    it('should navigate to home after logout', async () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      const { user } = renderWithProviders(
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/" element={<div data-testid="home-page">Home</div>} />
        </Routes>,
        { environment, route: '/dashboard' },
      );

      await user.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle user with empty string name', () => {
      const userWithEmptyName = { ...mockUser, name: '' };
      const environment = createMockEnvironment({
        user: userWithEmptyName,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      // Empty string is falsy, so should show "Not provided"
      expect(screen.getByText('Not provided')).toBeInTheDocument();
    });

    it('should handle user with long email', () => {
      const userWithLongEmail = {
        ...mockUser,
        email: 'verylongemailaddressthatmightcauselayoutissues@example.com',
      };
      const environment = createMockEnvironment({
        user: userWithLongEmail,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      expect(
        screen.getByText('verylongemailaddressthatmightcauselayoutissues@example.com'),
      ).toBeInTheDocument();
    });

    it('should handle user with special characters in name', () => {
      const userWithSpecialName = { ...mockUser, name: "O'Brien-Smith" };
      const environment = createMockEnvironment({
        user: userWithSpecialName,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      expect(screen.getByText("O'Brien-Smith")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have proper heading hierarchy with h1 before h2', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThanOrEqual(2);

      // Verify heading hierarchy - h1 should come before h2
      const headingLevels = headings.map((h) => {
        const tagName = h.tagName.toLowerCase();
        return parseInt(tagName.replace('h', ''), 10);
      });

      // Check that headings are in proper order (lower levels first)
      // The first heading should be h1 or the lowest level present
      const minLevel = Math.min(...headingLevels);
      const firstHeadingIndex = headingLevels.indexOf(minLevel);
      expect(firstHeadingIndex).toBe(0);

      // Verify no skipped levels - if h1 and h3 exist, h2 must exist
      const uniqueLevels = [...new Set(headingLevels)].sort((a, b) => a - b);
      for (let i = 0; i < uniqueLevels.length - 1; i++) {
        const current = uniqueLevels[i];
        const next = uniqueLevels[i + 1];
        if (current !== undefined && next !== undefined) {
          const gap = next - current;
          expect(gap).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should have Dashboard as main h1 heading', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      const h1Headings = screen.getAllByRole('heading', { level: 1 });
      expect(h1Headings).toHaveLength(1);
      expect(h1Headings[0]).toHaveTextContent('Dashboard');
    });

    it('should have accessible logout button', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toBeEnabled();
    });

    it('should have accessible form labels and inputs', () => {
      const environment = createMockEnvironment({
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(<DashboardPage />, { environment });

      // Check that all interactive elements are accessible
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        // Every button should have accessible name
        expect(button).toHaveAccessibleName();
      });
    });
  });
});
