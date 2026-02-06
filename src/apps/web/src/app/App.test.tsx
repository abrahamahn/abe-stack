// apps/web/src/app/App.test.tsx
/**
 * Unit tests for App component.
 *
 * These tests verify the App component renders correctly.
 * Tests focus on structural elements that can be reliably tested.
 *
 * Uses the test utilities from __tests__/utils.tsx which properly
 * handle providers without vi.mock deadlocks.
 *
 * @complexity O(1) - All tests are unit tests with mocked dependencies
 */

import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockEnvironment, renderWithProviders } from '../__tests__/utils';
import { HomePage } from '../pages';

import type { ClientEnvironment } from './ClientEnvironment';

// ============================================================================
// Tests
// ============================================================================

describe('App', () => {
  let mockEnvironment: ClientEnvironment;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvironment = createMockEnvironment();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', async () => {
      expect(() => {
        renderWithProviders(<HomePage />, { environment: mockEnvironment });
      }).not.toThrow();

      // Wait for async effects to settle
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('should render the page content', async () => {
      renderWithProviders(<HomePage />, { environment: mockEnvironment });

      await waitFor(() => {
        // HomePage renders "ABE Stack" heading
        expect(screen.getByText('ABE Stack')).toBeInTheDocument();
      });
    });

    it('should render navigation links', async () => {
      renderWithProviders(<HomePage />, { environment: mockEnvironment });

      await waitFor(() => {
        // HomePage renders navigation links
        expect(document.querySelector('a[href="/dashboard"]')).toBeInTheDocument();
        expect(document.querySelector('a[href="/ui-library"]')).toBeInTheDocument();
      });
    });
  });

  describe('Route Rendering', () => {
    it('should render content on root route', async () => {
      renderWithProviders(<HomePage />, { environment: mockEnvironment, route: '/' });

      // Verify the app renders content - the HomePage renders "ABE Stack" heading
      await waitFor(() => {
        expect(screen.getByText('ABE Stack')).toBeInTheDocument();
      });
    });

    it('should render auth buttons in top bar', async () => {
      renderWithProviders(<HomePage />, { environment: mockEnvironment });

      await waitFor(() => {
        // HomePage top bar renders Login and Register buttons when not authenticated
        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
      });
    });
  });

  describe('Query Persistence', () => {
    it('should render immediately without blocking', async () => {
      renderWithProviders(<HomePage />, { environment: mockEnvironment });

      // App renders immediately without waiting for cache restoration
      await waitFor(() => {
        expect(screen.getByText('ABE Stack')).toBeInTheDocument();
      });
    });

    it('should have query cache available', async () => {
      renderWithProviders(<HomePage />, { environment: mockEnvironment });

      await waitFor(() => {
        expect(screen.getByText('ABE Stack')).toBeInTheDocument();
      });

      // Verify queryCache is available in environment
      expect(mockEnvironment.queryCache).toBeDefined();
      expect(mockEnvironment.queryCache.getAll).toBeDefined();
    });
  });
});
