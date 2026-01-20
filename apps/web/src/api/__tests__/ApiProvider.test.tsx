// apps/web/src/api/__tests__/ApiProvider.test.tsx
/** @vitest-environment jsdom */
import { ClientEnvironmentProvider } from '@app';
import { QueryClient } from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiProvider, useApi } from '../ApiProvider';

import type { ClientConfig, ClientEnvironment } from '@app';
import type { AuthService } from '@features/auth';

// Track callback handlers captured by createReactQueryClient
let capturedCallbacks: {
  getToken?: () => string | null;
  onUnauthorized?: () => void;
  onServerError?: (message?: string) => void;
} = {};

// Use vi.hoisted to hoist mock functions along with vi.mock
const { mockNavigate, mockTokenGet, mockTokenClear, mockShowToast } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockTokenGet: vi.fn(() => 'test-token'),
  mockTokenClear: vi.fn(),
  mockShowToast: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

// Mock dependencies - use importOriginal for partial mocking
vi.mock('@abe-stack/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/sdk')>();
  return {
    ...actual,
    createReactQueryClient: vi.fn(
      (config: {
        getToken?: () => string | null;
        onUnauthorized?: () => void;
        onServerError?: (message?: string) => void;
      }) => {
        capturedCallbacks = config;
        return { someApiMethod: vi.fn() };
      },
    ),
    createApiClient: vi.fn(() => ({
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      getCurrentUser: vi.fn(),
    })),
  };
});

vi.mock('@abe-stack/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/core')>();
  return {
    ...actual,
    tokenStore: {
      get: mockTokenGet,
      set: vi.fn(),
      clear: mockTokenClear,
    },
    toastStore: {
      getState: (): { show: typeof mockShowToast } => ({
        show: mockShowToast,
      }),
    },
  };
});

// Create mock environment for tests
function createMockEnvironment(): ClientEnvironment {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
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
    queryClient,
    auth: mockAuth,
  };
}

// Test component that uses the API context
function TestConsumer(): React.ReactElement {
  useApi();
  return <div data-testid="api-consumer">API Available</div>;
}

describe('ApiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCallbacks = {};
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

  describe('callback behaviors', () => {
    it('getToken retrieves token from tokenStore', () => {
      renderWithProvider();

      expect(capturedCallbacks.getToken).toBeDefined();
      const getToken = capturedCallbacks.getToken;
      if (!getToken) throw new Error('getToken not captured');
      const token = getToken();

      expect(mockTokenGet).toHaveBeenCalled();
      expect(token).toBe('test-token');
    });

    it('onUnauthorized clears token and navigates to login', () => {
      renderWithProvider();

      expect(capturedCallbacks.onUnauthorized).toBeDefined();
      const onUnauthorized = capturedCallbacks.onUnauthorized;
      if (!onUnauthorized) throw new Error('onUnauthorized not captured');
      onUnauthorized();

      expect(mockTokenClear).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('onServerError shows toast with error message', () => {
      renderWithProvider();

      expect(capturedCallbacks.onServerError).toBeDefined();
      const onServerError = capturedCallbacks.onServerError;
      if (!onServerError) throw new Error('onServerError not captured');
      onServerError('Database connection failed');

      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Server error',
        description: 'Database connection failed',
      });
    });

    it('onServerError shows default message when none provided', () => {
      renderWithProvider();

      const onServerError = capturedCallbacks.onServerError;
      if (!onServerError) throw new Error('onServerError not captured');
      onServerError(undefined);

      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Server error',
        description: 'Something went wrong',
      });
    });
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
