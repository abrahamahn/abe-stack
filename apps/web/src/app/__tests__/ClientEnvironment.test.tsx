// apps/web/src/app/__tests__/ClientEnvironment.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientEnvironmentProvider, useClientEnvironment } from '../ClientEnvironment';

import type { ClientEnvironment } from '../ClientEnvironment';
import type { JSX } from 'react';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockClientEnvironment(): ClientEnvironment {
  return {
    config: {
      apiUrl: 'http://test-api.example.com',
      tokenRefreshInterval: 60000,
    } as ClientEnvironment['config'],
    queryClient: {
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn(),
      getQueryState: vi.fn(),
    } as unknown as ClientEnvironment['queryClient'],
    auth: {
      getState: vi.fn(() => ({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      })),
      subscribe: vi.fn(() => () => {}),
      login: vi.fn(),
      logout: vi.fn(),
      destroy: vi.fn(),
    } as unknown as ClientEnvironment['auth'],
  };
}

// Test component that uses the hook
function TestConsumer(): JSX.Element {
  const env = useClientEnvironment();
  return (
    <div>
      <span data-testid="api-url">{env.config.apiUrl}</span>
      <span data-testid="has-auth">{env.auth ? 'yes' : 'no'}</span>
      <span data-testid="has-query-client">{env.queryClient ? 'yes' : 'no'}</span>
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('ClientEnvironment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ClientEnvironmentProvider', () => {
    it('should provide environment to children', () => {
      const mockEnv = createMockClientEnvironment();

      render(
        <ClientEnvironmentProvider value={mockEnv}>
          <TestConsumer />
        </ClientEnvironmentProvider>,
      );

      expect(screen.getByTestId('api-url')).toHaveTextContent('http://test-api.example.com');
      expect(screen.getByTestId('has-auth')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-query-client')).toHaveTextContent('yes');
    });

    it('should allow accessing config properties', () => {
      const mockEnv = createMockClientEnvironment();

      render(
        <ClientEnvironmentProvider value={mockEnv}>
          <TestConsumer />
        </ClientEnvironmentProvider>,
      );

      expect(screen.getByTestId('api-url')).toBeInTheDocument();
    });

    it('should render children correctly', () => {
      const mockEnv = createMockClientEnvironment();

      render(
        <ClientEnvironmentProvider value={mockEnv}>
          <div data-testid="child">Child Content</div>
        </ClientEnvironmentProvider>,
      );

      expect(screen.getByTestId('child')).toHaveTextContent('Child Content');
    });
  });

  describe('useClientEnvironment', () => {
    it('should return environment when inside provider', () => {
      const mockEnv = createMockClientEnvironment();

      render(
        <ClientEnvironmentProvider value={mockEnv}>
          <TestConsumer />
        </ClientEnvironmentProvider>,
      );

      // If we get here without throwing, the hook worked
      expect(screen.getByTestId('api-url')).toBeInTheDocument();
    });

    it('should throw when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useClientEnvironment must be used within ClientEnvironmentProvider');

      consoleSpy.mockRestore();
    });

    it('should provide access to auth service', () => {
      const mockEnv = createMockClientEnvironment();

      function AuthConsumer(): JSX.Element {
        const env = useClientEnvironment();
        return (
          <span data-testid="auth-state">
            {env.auth.getState().isAuthenticated ? 'auth' : 'anon'}
          </span>
        );
      }

      render(
        <ClientEnvironmentProvider value={mockEnv}>
          <AuthConsumer />
        </ClientEnvironmentProvider>,
      );

      expect(screen.getByTestId('auth-state')).toHaveTextContent('anon');
    });

    it('should provide access to query client', () => {
      const mockEnv = createMockClientEnvironment();

      function QueryConsumer(): JSX.Element {
        const env = useClientEnvironment();
        const hasQueryClient = typeof env.queryClient.getQueryData === 'function';
        return <span data-testid="has-methods">{hasQueryClient ? 'yes' : 'no'}</span>;
      }

      render(
        <ClientEnvironmentProvider value={mockEnv}>
          <QueryConsumer />
        </ClientEnvironmentProvider>,
      );

      expect(screen.getByTestId('has-methods')).toHaveTextContent('yes');
    });
  });

  describe('ClientEnvironment type', () => {
    it('should have all required properties', () => {
      const mockEnv = createMockClientEnvironment();

      // Type check - environment should have these properties
      expect(mockEnv.config).toBeDefined();
      expect(mockEnv.queryClient).toBeDefined();
      expect(mockEnv.auth).toBeDefined();
    });

    it('should have correct config shape', () => {
      const mockEnv = createMockClientEnvironment();

      expect(mockEnv.config.apiUrl).toBeDefined();
      expect(typeof mockEnv.config.apiUrl).toBe('string');
    });
  });
});
