// main/apps/web/src/__tests__/utils.tsx
/**
 * Test utilities for integration testing.
 *
 * Provides:
 * - renderWithProviders: Render components with all required providers
 * - createMockEnvironment: Create mock ClientEnvironment for testing
 * - createMockFetch: Create a configurable fetch mock
 * - Mock user data for common test scenarios
 *
 * @module test-utils
 */

import { QueryCache } from '@bslt/client-engine';
import { QueryCacheProvider } from '@bslt/react';
import { MemoryRouter } from '@bslt/react/router';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { ClientEnvironmentProvider } from '../app/ClientEnvironment';

import type { User, UserId } from '@bslt/shared';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import type { ClientEnvironment } from '../app/ClientEnvironment';
import type { ClientConfig } from '../config';
import type { AuthService, AuthState } from '../features/auth';

// ============================================================================
// Mock User Data
// ============================================================================

/**
 * Standard mock user for authenticated tests.
 */
export const mockUser: User = {
  id: 'user-123' as unknown as UserId,
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: null,
  role: 'user',
  emailVerified: true,
  phone: null,
  phoneVerified: null,
  dateOfBirth: null,
  gender: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/**
 * Admin user for admin-related tests.
 */
export const mockAdminUser: User = {
  id: 'admin-123' as unknown as UserId,
  email: 'admin@example.com',
  username: 'adminuser',
  firstName: 'Admin',
  lastName: 'User',
  avatarUrl: null,
  role: 'admin',
  emailVerified: true,
  phone: null,
  phoneVerified: null,
  dateOfBirth: null,
  gender: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// ============================================================================
// Mock Config
// ============================================================================

/**
 * Default mock configuration for tests.
 */
export const mockConfig: ClientConfig = {
  mode: 'test',
  isDev: false,
  isProd: false,
  apiUrl: 'http://localhost:3000/api',
  stripePublishableKey: 'pk_test_123',
  tokenRefreshInterval: 13 * 60 * 1000,
  uiVersion: '1.0.0',
  queryPersistence: {
    maxAge: 24 * 60 * 60 * 1000,
    throttleTime: 1000,
  },
};

// ============================================================================
// Mock AuthService
// ============================================================================

/**
 * Options for configuring the mock AuthService.
 */
export interface MockAuthServiceOptions {
  /** Initial user (null for unauthenticated) */
  user?: User;
  /** Whether auth state is loading */
  isLoading?: boolean;
  /** Whether user is authenticated (defaults based on user presence) */
  isAuthenticated?: boolean;
  /** Error to throw on login */
  loginError?: Error;
  /** Error to throw on register */
  registerError?: Error;
  /** Error to throw on logout */
  logoutError?: Error;
}

/**
 * Create a mock AuthService for testing.
 *
 * The mock maintains internal state and notifies listeners on changes,
 * mimicking the real AuthService behavior.
 *
 * @param options - Configuration options for the mock
 * @returns Mock AuthService instance
 *
 * @example
 * ```typescript
 * // Unauthenticated state
 * const auth = createMockAuthService();
 *
 * // Authenticated state
 * const auth = createMockAuthService({ user: mockUser });
 *
 * // With login error
 * const auth = createMockAuthService({
 *   loginError: new Error('Invalid credentials'),
 * });
 * ```
 */
export function createMockAuthService(options: MockAuthServiceOptions = {}): AuthService {
  const {
    user = null,
    isLoading = false,
    isAuthenticated = user !== null,
    loginError,
    registerError,
    logoutError,
  } = options;

  const state: AuthState = { user, isLoading, isAuthenticated, isNewDevice: false };
  const listeners = new Set<() => void>();

  const updateState = (newState: Partial<AuthState>): void => {
    Object.assign(state, newState);
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    getState: () => ({ ...state }),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: () => {
      updateState({ isLoading: false });
      return Promise.resolve(state.user);
    },
    login: () => {
      if (loginError !== undefined) return Promise.reject(loginError);
      updateState({ user: mockUser, isAuthenticated: true });
      return Promise.resolve();
    },
    register: () => {
      if (registerError !== undefined) return Promise.reject(registerError);
      return Promise.resolve({
        message: 'Please check your email to verify your account',
        email: 'test@example.com',
      });
    },
    logout: () => {
      if (logoutError !== undefined) return Promise.reject(logoutError);
      updateState({ user: null, isAuthenticated: false });
      return Promise.resolve();
    },
    refreshToken: () => Promise.resolve(true),
    fetchCurrentUser: () => Promise.resolve(state.user),
    forgotPassword: () => Promise.resolve({ message: 'Password reset email sent' }),
    resetPassword: () => Promise.resolve({ message: 'Password reset successful' }),
    verifyEmail: () =>
      Promise.resolve({
        verified: true,
        message: 'Email verified',
        token: 'test-token',
        user: mockUser,
      }),
    resendVerification: () => Promise.resolve({ message: 'Verification email sent' }),
    verifyTotpLogin: () => Promise.resolve(),
    dismissNewDeviceBanner: () => {
      updateState({ isNewDevice: false });
    },
    destroy: () => {
      listeners.clear();
    },
  } as unknown as AuthService;
}

// ============================================================================
// Mock Environment
// ============================================================================

/**
 * Options for configuring the mock environment.
 */
export interface MockEnvironmentOptions extends MockAuthServiceOptions {
  /** Override config values */
  config?: Partial<ClientConfig>;
}

/**
 * Create a mock ClientEnvironment for testing.
 *
 * Creates a complete environment with:
 * - Mock config (with optional overrides)
 * - Mock QueryCache (configured for tests)
 * - Mock AuthService (with configurable state)
 *
 * @param options - Configuration options
 * @returns Complete mock ClientEnvironment
 *
 * @example
 * ```typescript
 * // Default environment (unauthenticated)
 * const env = createMockEnvironment();
 *
 * // Authenticated environment
 * const env = createMockEnvironment({ user: mockUser });
 *
 * // With custom config
 * const env = createMockEnvironment({
 *   config: { apiUrl: 'http://custom-api.test' },
 * });
 * ```
 */
export function createMockEnvironment(options: MockEnvironmentOptions = {}): ClientEnvironment {
  const { config: configOverrides, ...authOptions } = options;

  const queryCache = new QueryCache({
    defaultStaleTime: 0,
    defaultGcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    config: {
      ...mockConfig,
      ...configOverrides,
      queryPersistence: {
        maxAge: configOverrides?.queryPersistence?.maxAge ?? mockConfig.queryPersistence.maxAge,
        throttleTime:
          configOverrides?.queryPersistence?.throttleTime ??
          mockConfig.queryPersistence.throttleTime,
      },
    },
    queryCache,
    auth: createMockAuthService(authOptions),
  };
}

// ============================================================================
// Render with Providers
// ============================================================================

/**
 * Options for renderWithProviders.
 */
export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Custom environment (uses default mock if not provided) */
  environment?: ClientEnvironment;
  /** Initial router entries */
  initialEntries?: string[];
  /** Single route (shorthand for initialEntries with one entry) */
  route?: string;
}

/**
 * Result from renderWithProviders.
 */
export interface RenderWithProvidersResult extends RenderResult {
  /** userEvent instance for interactions */
  user: ReturnType<typeof userEvent.setup>;
  /** The environment used (useful for asserting on auth state) */
  environment: ClientEnvironment;
}

/**
 * Render a component with all required providers.
 *
 * Wraps the component with:
 * - QueryCacheProvider (for data fetching)
 * - MemoryRouter (for routing)
 * - ClientEnvironmentProvider (for app services)
 *
 * Also sets up userEvent for interaction testing.
 *
 * @param ui - Component to render
 * @param options - Render options
 * @returns Render result with user and environment
 *
 * @example
 * ```typescript
 * // Basic usage
 * const { user } = renderWithProviders(<LoginPage />);
 * await user.type(screen.getByLabelText('Email'), 'test@example.com');
 *
 * // With authenticated state
 * const { environment } = renderWithProviders(<Dashboard />, {
 *   environment: createMockEnvironment({ user: mockUser }),
 * });
 *
 * // With specific route
 * renderWithProviders(<App />, { route: '/dashboard' });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const {
    environment = createMockEnvironment(),
    initialEntries = ['/'],
    route,
    ...renderOptions
  } = options;

  const entries = route !== undefined ? [route] : initialEntries;

  const Wrapper = ({ children }: { children: ReactNode }): ReactElement => {
    return (
      <QueryCacheProvider cache={environment.queryCache}>
        <MemoryRouter initialEntries={entries}>
          <ClientEnvironmentProvider value={environment}>{children}</ClientEnvironmentProvider>
        </MemoryRouter>
      </QueryCacheProvider>
    );
  };

  const user = userEvent.setup();

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    user,
    environment,
  };
}

// ============================================================================
// Fetch Mock Helpers
// ============================================================================

/**
 * Configuration for a single fetch response.
 */
export interface MockFetchResponse {
  /** Response data (will be returned by json()) */
  data?: unknown;
  /** HTTP status code (default: 200) */
  status?: number;
  /** Whether request was successful (default: status < 400) */
  ok?: boolean;
  /** Headers to include in response */
  headers?: Record<string, string>;
  /** Error to throw instead of returning response */
  error?: Error;
  /** Delay before resolving (ms) */
  delay?: number;
}

/**
 * Create a mock fetch function for testing.
 *
 * Returns a vi.fn() configured to return the specified response.
 * Use vi.stubGlobal('fetch', mockFetch) to install it.
 *
 * @param response - Response configuration
 * @returns Mock fetch function
 *
 * @example
 * ```typescript
 * // Simple success response
 * vi.stubGlobal('fetch', createMockFetch({ data: { user: mockUser } }));
 *
 * // Error response
 * vi.stubGlobal('fetch', createMockFetch({
 *   status: 401,
 *   data: { error: 'Unauthorized' },
 * }));
 *
 * // Network error
 * vi.stubGlobal('fetch', createMockFetch({
 *   error: new Error('Network error'),
 * }));
 *
 * // With delay (for loading state tests)
 * vi.stubGlobal('fetch', createMockFetch({
 *   data: { success: true },
 *   delay: 100,
 * }));
 * ```
 */
export function createMockFetch(response: MockFetchResponse = {}): ReturnType<typeof vi.fn> {
  const { data = {}, status = 200, ok = status < 400, headers = {}, error, delay = 0 } = response;

  return vi.fn(async () => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (error !== undefined) {
      throw error;
    }

    return {
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      headers: new Headers(headers),
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
      clone: function () {
        return this;
      },
    } as Response;
  });
}

/**
 * Create a mock fetch that responds differently based on URL.
 *
 * @param handlers - Map of URL patterns to responses
 * @param defaultResponse - Default response for unmatched URLs
 * @returns Mock fetch function
 *
 * @example
 * ```typescript
 * vi.stubGlobal('fetch', createMockFetchWithHandlers({
 *   '/api/auth/login': { data: { token: 'test-token', user: mockUser } },
 *   '/api/auth/logout': { data: { success: true } },
 *   '/api/users/me': { data: mockUser },
 * }));
 * ```
 */
export function createMockFetchWithHandlers(
  handlers: Record<string, MockFetchResponse>,
  defaultResponse: MockFetchResponse = { status: 404, data: { error: 'Not found' } },
): ReturnType<typeof vi.fn> {
  return vi.fn((url: RequestInfo | URL) => {
    const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;

    // Find matching handler
    for (const [pattern, response] of Object.entries(handlers)) {
      if (urlString.includes(pattern)) {
        const mockFetch = createMockFetch(response) as (
          input: RequestInfo | URL,
        ) => Promise<Response>;
        return mockFetch(url);
      }
    }

    // Use default response
    const mockFetch = createMockFetch(defaultResponse) as (
      input: RequestInfo | URL,
    ) => Promise<Response>;
    return mockFetch(url);
  });
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Wait for loading states to resolve.
 *
 * Flushes the microtask queue to ensure all pending promises are resolved.
 */
export async function waitForLoadingToFinish(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * Create a deferred promise for controlling async operations in tests.
 *
 * Useful for testing loading states and race conditions.
 *
 * @returns Object with promise, resolve, and reject functions
 *
 * @example
 * ```typescript
 * const { promise, resolve } = createDeferred<User>();
 *
 * // Set up mock to return the deferred promise
 * mockApi.getUser.mockReturnValue(promise);
 *
 * // Render and check loading state
 * renderWithProviders(<UserProfile />);
 * expect(screen.getByText('Loading...')).toBeInTheDocument();
 *
 * // Resolve and check success state
 * resolve(mockUser);
 * await waitFor(() => {
 *   expect(screen.getByText(mockUser.name)).toBeInTheDocument();
 * });
 * ```
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Type-safe reference to console that doesn't trigger no-console lint rule
const consoleRef = globalThis.console;

/**
 * Suppress console errors during a test.
 *
 * Useful for testing error boundaries where React logs errors.
 * Returns a restore function that must be called to restore console.error.
 *
 * @returns Function to restore console.error
 *
 * @example
 * ```typescript
 * it('should render error boundary on error', () => {
 *   const restore = suppressConsoleError();
 *   try {
 *     renderWithProviders(<ComponentThatThrows />);
 *     expect(screen.getByText('Something went wrong')).toBeInTheDocument();
 *   } finally {
 *     restore();
 *   }
 * });
 * ```
 */
export function suppressConsoleError(): () => void {
  const originalError = consoleRef.error;
  consoleRef.error = (): void => {
    /* intentionally empty */
  };
  return (): void => {
    consoleRef.error = originalError;
  };
}

/**
 * Suppress console warnings during a test.
 *
 * @returns Function to restore console.warn
 */
export function suppressConsoleWarn(): () => void {
  const originalWarn = consoleRef.warn;
  consoleRef.warn = (): void => {
    /* intentionally empty */
  };
  return (): void => {
    consoleRef.warn = originalWarn;
  };
}

/**
 * Wait for a condition to be true with timeout.
 *
 * Alternative to waitFor when you need more control.
 *
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in ms (default: 5000)
 * @param interval - Check interval in ms (default: 50)
 *
 * @example
 * ```typescript
 * await waitForCondition(() => mockFn.mock.calls.length > 0);
 * ```
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 50,
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Condition not met within ${String(timeout)}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

// ============================================================================
// Mock Module Helpers
// ============================================================================

/**
 * Helper type for creating mock modules with vi.hoisted.
 *
 * Use vi.hoisted() at the top of test files to create mock variables
 * that can be used in vi.mock() factory functions.
 *
 * @example
 * ```typescript
 * // At the top of your test file
 * const mockNavigate = vi.hoisted(() => vi.fn());
 *
 * vi.mock('react-router-dom', async () => {
 *   const actual = await vi.importActual('react-router-dom');
 *   return {
 *     ...actual,
 *     useNavigate: () => mockNavigate,
 *   };
 * });
 *
 * // In your tests
 * it('should navigate on success', async () => {
 *   mockNavigate.mockClear();
 *   // ... test code
 *   expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
 * });
 * ```
 */
export type MockedFunction<T extends (...args: never[]) => unknown> = ReturnType<typeof vi.fn<T>>;
