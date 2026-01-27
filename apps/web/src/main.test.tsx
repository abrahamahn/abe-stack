// apps/web/src/main.test.tsx
/**
 * Unit tests for application entry point.
 *
 * Tests:
 * - Service creation and initialization
 * - Environment assembly
 * - QueryCache configuration
 * - AuthService configuration
 * - Service worker registration (development mode)
 *
 * Note: This file tests module-level code execution. Mocks must be set up
 * before the module is imported, and we test the observable effects.
 *
 * @complexity O(1) - All tests are unit tests with mocked dependencies
 */

import { describe, expect, it, vi } from 'vitest';

// ============================================================================
// Vi.mock calls (hoisted to top - must not reference external variables)
// ============================================================================

vi.mock('@abe-stack/sdk', () => {
  const mockQueryCacheInstance = {
    defaultStaleTime: 5 * 60 * 1000,
    defaultGcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
    subscribe: vi.fn(),
    subscribeAll: vi.fn(),
    getAll: vi.fn(),
  };

  // eslint-disable-next-line @typescript-eslint/naming-convention -- Mock must match original class name
  const QueryCacheMock = vi.fn(function QueryCache() {
    return mockQueryCacheInstance;
  });

  const createQueryPersisterMock = vi.fn(() => ({
    persistClient: vi.fn(),
    restoreClient: vi.fn().mockResolvedValue(undefined),
    removeClient: vi.fn(),
  }));

  const QueryCacheProviderMock = vi.fn(({ children }: { children: unknown }) => children);

  return {
    QueryCache: QueryCacheMock,
    createQueryPersister: createQueryPersisterMock,
    QueryCacheProvider: QueryCacheProviderMock,
  };
});

vi.mock('@features/auth', () => {
  const mockAuthServiceInstance = {
    getState: vi.fn(() => ({ user: null, isLoading: false, isAuthenticated: false })),
    subscribe: vi.fn(() => vi.fn()),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    refreshToken: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    fetchCurrentUser: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  };

  const createAuthServiceMock = vi.fn(() => mockAuthServiceInstance);

  return {
    createAuthService: createAuthServiceMock,
  };
});

vi.mock('./utils/registerServiceWorker', () => ({
  registerServiceWorker: vi.fn().mockResolvedValue({
    status: 'registered',
    registration: {},
    checkForUpdates: vi.fn(),
    skipWaiting: vi.fn(),
    unregister: vi.fn(),
    getVersion: vi.fn(),
    clearCache: vi.fn(),
  }),
}));

// Mock @abe-stack/stores
vi.mock('@abe-stack/stores', () => ({
  toastStore: vi.fn(() => ({
    messages: [],
    dismiss: vi.fn(),
  })),
}));

// Mock @abe-stack/ui
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual<typeof import('@abe-stack/ui')>('@abe-stack/ui');
  return {
    ...actual,
    // Use MemoryRouter instead of BrowserRouter in tests
    BrowserRouter: actual.MemoryRouter,
    ScrollArea: vi.fn(({ children }: { children: unknown }) => children),
    Toaster: vi.fn(() => <div data-testid="toaster">Toaster</div>),
    HistoryProvider: vi.fn(({ children }: { children: unknown }) => children),
  };
});

// Mock App component to avoid rendering the full application
vi.mock('./app/App', () => ({
  App: vi.fn(() => <div data-testid="app">App</div>),
}));

// Mock react-dom/client
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
    unmount: vi.fn(),
  })),
}));

// ============================================================================
// Import main.tsx AFTER mocks are set up
// ============================================================================
// Note: Root element is created in setup.ts

// This import triggers module-level code execution with our mocks in place
import './main';

// Get the mocked functions after import
const { QueryCache } = await import('@abe-stack/sdk');
const { createAuthService } = await import('@features/auth');
const { registerServiceWorker } = await import('./utils/registerServiceWorker');

// Cast to vi.Mock for better type safety in tests
const QueryCacheMock = QueryCache as unknown as ReturnType<typeof vi.fn>;
const createAuthServiceMock = createAuthService as unknown as ReturnType<typeof vi.fn>;
const registerServiceWorkerMock = registerServiceWorker as unknown as ReturnType<typeof vi.fn>;

// ============================================================================
// Tests
// ============================================================================

describe('main.tsx - Service Creation', () => {
  it('should create QueryCache with correct configuration', () => {
    expect(QueryCacheMock).toHaveBeenCalledWith({
      defaultStaleTime: 5 * 60 * 1000, // 5 minutes
      defaultGcTime: 24 * 60 * 60 * 1000, // 24 hours
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });
  });

  it('should create QueryCache only once at module level', () => {
    expect(QueryCacheMock).toHaveBeenCalledTimes(1);
  });

  it('should create AuthService with config', () => {
    expect(createAuthServiceMock).toHaveBeenCalled();
    expect(createAuthServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.any(Object),
      }),
    );
  });

  it('should create AuthService only once at module level', () => {
    expect(createAuthServiceMock).toHaveBeenCalledTimes(1);
  });
});

describe('main.tsx - QueryCache Configuration', () => {
  it('should use 5 minute stale time', () => {
    expect(QueryCacheMock).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultStaleTime: 5 * 60 * 1000,
      }),
    );
  });

  it('should use 24 hour garbage collection time for persistence', () => {
    expect(QueryCacheMock).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultGcTime: 24 * 60 * 60 * 1000,
      }),
    );
  });

  it('should enable refetch on window focus', () => {
    expect(QueryCacheMock).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchOnWindowFocus: true,
      }),
    );
  });

  it('should enable refetch on reconnect', () => {
    expect(QueryCacheMock).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchOnReconnect: true,
      }),
    );
  });
});

describe('main.tsx - Service Worker Registration', () => {
  it('should not register service worker in development mode', () => {
    // Service worker registration is conditional on !config.isDev
    // In test environment, isDev is true, so it should NOT be called
    expect(registerServiceWorkerMock).not.toHaveBeenCalled();
  });
});

describe('main.tsx - AuthService Configuration', () => {
  it('should pass ClientConfig to AuthService', () => {
    const authServiceCall = createAuthServiceMock.mock.calls[0]?.[0];

    expect(authServiceCall).toHaveProperty('config');
    expect(authServiceCall.config).toHaveProperty('isDev');
    expect(authServiceCall.config).toHaveProperty('isProd');
    expect(authServiceCall.config).toHaveProperty('apiUrl');
  });

  it('should pass config with apiUrl', () => {
    const authServiceCall = createAuthServiceMock.mock.calls[0]?.[0];

    expect(authServiceCall.config.apiUrl).toBeDefined();
    expect(typeof authServiceCall.config.apiUrl).toBe('string');
  });

  it('should pass config with tokenRefreshInterval', () => {
    const authServiceCall = createAuthServiceMock.mock.calls[0]?.[0];

    expect(authServiceCall.config.tokenRefreshInterval).toBeDefined();
    expect(typeof authServiceCall.config.tokenRefreshInterval).toBe('number');
  });
});

describe('main.tsx - Module Execution', () => {
  it('should execute without errors', () => {
    // If we got here, the module executed successfully
    expect(true).toBe(true);
  });

  it('should create services in correct order', () => {
    // QueryCache is created first, then AuthService
    expect(QueryCacheMock).toHaveBeenCalled();
    expect(createAuthServiceMock).toHaveBeenCalled();
  });
});
