// apps/web/src/api/ApiProvider.test.tsx
import { QueryCache } from '@abe-stack/client-engine';
import { MemoryRouter } from '@abe-stack/ui';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientEnvironmentProvider } from '../app';

import { ApiProvider, useApi } from './ApiProvider';

import type { ClientConfig, ClientEnvironment } from '../app';
import type { AuthService } from '../features/auth';

// Use vi.hoisted to hoist mock functions along with vi.mock
const { mockTokenGet } = vi.hoisted(() => ({
  mockTokenGet: vi.fn(() => 'test-token'),
}));

// Mock dependencies - use importOriginal for partial mocking
vi.mock('@abe-stack/client-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/client-engine')>();
  return {
    ...actual,
    createApiClient: vi.fn(() => ({
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      getCurrentUser: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
    })),
  };
});

vi.mock('@abe-stack/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...actual,
    tokenStore: {
      get: mockTokenGet,
      set: vi.fn(),
      clear: vi.fn(),
    },
  };
});

// Create mock environment for tests
function createMockEnvironment(): ClientEnvironment {
  const queryCache = new QueryCache({
    defaultStaleTime: 5 * 60 * 1000,
    defaultGcTime: 24 * 60 * 60 * 1000,
  });

  const mockConfig: ClientConfig = {
    mode: 'test',
    isDev: false,
    isProd: false,
    apiUrl: '',
    tokenRefreshInterval: 13 * 60 * 1000,
    uiVersion: '1.0.0',
  };

  const mockAuth = {
    getState: () => ({ user: null, isLoading: false, isAuthenticated: false }),
    subscribe: () => () => {},
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    fetchCurrentUser: vi.fn(),
    destroy: vi.fn(),
  } as unknown as AuthService;

  return {
    config: mockConfig,
    queryCache,
    auth: mockAuth,
  };
}

// Test component that uses the API context
const TestConsumer = (): React.ReactElement => {
  useApi();
  return <div data-testid="api-consumer">API Available</div>;
};

describe('ApiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = (): ReturnType<typeof render> => {
    const mockEnv = createMockEnvironment();
    return render(
      <ClientEnvironmentProvider value={mockEnv}>
        <MemoryRouter>
          <ApiProvider>
            <TestConsumer />
          </ApiProvider>
        </MemoryRouter>
      </ClientEnvironmentProvider>,
    );
  };

  it('should render children', () => {
    renderWithProvider();

    expect(screen.getByTestId('api-consumer')).toBeInTheDocument();
  });

  it('should provide API context to children', () => {
    renderWithProvider();

    expect(screen.getByText('API Available')).toBeInTheDocument();
  });

  it('should render without crashing', () => {
    expect(() => renderWithProvider()).not.toThrow();
  });
});

describe('useApi', () => {
  it('should throw error when used outside ApiProvider', () => {
    const mockEnv = createMockEnvironment();
    const TestComponent = (): React.ReactElement => {
      useApi();
      return <div>Test</div>;
    };

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      render(
        <ClientEnvironmentProvider value={mockEnv}>
          <MemoryRouter>
            <TestComponent />
          </MemoryRouter>
        </ClientEnvironmentProvider>,
      ),
    ).toThrow('useApi must be used within ApiProvider');

    consoleSpy.mockRestore();
  });
});
