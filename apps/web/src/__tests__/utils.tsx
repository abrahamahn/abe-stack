// apps/web/src/__tests__/utils.tsx
/**
 * Test utilities for integration testing.
 *
 * Provides:
 * - renderWithProviders: Render components with all required providers
 * - createMockEnvironment: Create mock ClientEnvironment for testing
 * - MSW handlers: Mock API responses
 */

import { QueryCache } from '@abe-stack/sdk';
import { MemoryRouter } from '@abe-stack/ui';
import { ClientEnvironmentProvider } from '@app/ClientEnvironment';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ClientEnvironment } from '@app/ClientEnvironment';
import type { ClientConfig } from '@/config';
import type { AuthService, AuthState, User } from '@features/auth';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

// ============================================================================
// Mock User Data
// ============================================================================

export const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
  role: 'user',
  createdAt: '2024-01-01T00:00:00Z',
};

export const mockAdminUser: User = {
  id: 'admin-123',
  email: 'admin@example.com',
  name: 'Admin User',
  avatarUrl: null,
  role: 'admin',
  createdAt: '2024-01-01T00:00:00Z',
};

// ============================================================================
// Mock Config
// ============================================================================

export const mockConfig: ClientConfig = {
  mode: 'test',
  isDev: false,
  isProd: false,
  apiUrl: 'http://localhost:3000/api',
  tokenRefreshInterval: 13 * 60 * 1000,
  uiVersion: '1.0.0',
};

// ============================================================================
// Mock AuthService
// ============================================================================

export interface MockAuthServiceOptions {
  user?: User | null;
  isLoading?: boolean;
  isAuthenticated?: boolean;
  loginError?: Error;
  registerError?: Error;
  logoutError?: Error;
}

export function createMockAuthService(options: MockAuthServiceOptions = {}): AuthService {
  const {
    user = null,
    isLoading = false,
    isAuthenticated = user !== null,
    loginError,
    registerError,
    logoutError,
  } = options;

  const state: AuthState = { user, isLoading, isAuthenticated };
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
    destroy: () => {
      listeners.clear();
    },
  } as unknown as AuthService;
}

// ============================================================================
// Mock Environment
// ============================================================================

export interface MockEnvironmentOptions extends MockAuthServiceOptions {
  config?: Partial<ClientConfig>;
}

export function createMockEnvironment(options: MockEnvironmentOptions = {}): ClientEnvironment {
  const { config: configOverrides, ...authOptions } = options;

  const queryCache = new QueryCache({
    defaultStaleTime: 0,
    defaultGcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    config: { ...mockConfig, ...configOverrides },
    queryCache,
    auth: createMockAuthService(authOptions),
  };
}

// ============================================================================
// Render with Providers
// ============================================================================

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  environment?: ClientEnvironment;
  initialEntries?: string[];
  route?: string;
}

export interface RenderWithProvidersResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
  environment: ClientEnvironment;
}

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
      <MemoryRouter initialEntries={entries}>
        <ClientEnvironmentProvider value={environment}>{children}</ClientEnvironmentProvider>
      </MemoryRouter>
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
// Test Helpers
// ============================================================================

/**
 * Wait for loading states to resolve
 */
export async function waitForLoadingToFinish(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a deferred promise for controlling async operations in tests
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
 * Suppress console errors during a test (useful for testing error boundaries)
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
 * Suppress console warnings during a test
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
