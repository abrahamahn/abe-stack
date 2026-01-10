/**
 * Web ClientEnvironment - Single Entry Point for Web App Dependencies
 *
 * This is the web app's "composition root". It creates a single object
 * containing all dependencies (api, auth, config) that gets passed
 * via React context to all components.
 *
 * Benefits:
 * - Single provider instead of nested providers
 * - Access everything via useEnvironment() hook
 * - Easy to test (mock the environment)
 * - Debug via window.env in development
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

import { config, apiConfig } from '../../shared/config';

import type { User } from '../../shared/schema';

// =============================================================================
// TYPES
// =============================================================================

export type ClientConfig = {
  apiUrl: string;
  wsUrl: string;
  env: 'development' | 'production' | 'test';
};

export type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export type ApiClient = {
  login: (data: { email: string; password: string }) => Promise<{ token: string; user: User }>;
  register: (data: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<{ token: string; user: User }>;
  refresh: () => Promise<{ token: string }>;
  logout: () => Promise<{ message: string }>;
  getCurrentUser: () => Promise<User>;
};

export type ClientEnvironment = {
  config: ClientConfig;
  api: ApiClient;
  auth: AuthState;
  queryClient: QueryClient;
  // Future phases:
  // pubsub: PubsubClient | null;
  // recordCache: RecordCache | null;
  // transactionQueue: TransactionQueue | null;
};

// =============================================================================
// CONTEXT
// =============================================================================

const EnvironmentContext = createContext<ClientEnvironment | null>(null);

/**
 * Access the client environment
 */
export function useEnvironment(): ClientEnvironment {
  const env = useContext(EnvironmentContext);
  if (!env) {
    throw new Error('useEnvironment must be used within EnvironmentProvider');
  }
  return env;
}

/** Convenience hook for API */
export function useApi(): ApiClient {
  return useEnvironment().api;
}

/** Convenience hook for auth */
export function useAuth(): AuthState {
  return useEnvironment().auth;
}

/** Convenience hook for config */
export function useConfig(): ClientConfig {
  return useEnvironment().config;
}

// =============================================================================
// API CLIENT
// =============================================================================

type ErrorResponse = { message?: string };

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
}

function createApiClient(baseUrl: string): ApiClient {
  const url = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${url}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...normalizeHeaders(options?.headers),
      },
      credentials: 'include',
    });

    const data: unknown = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorData = data as ErrorResponse;
      throw new Error(errorData.message ?? `HTTP ${String(response.status)}`);
    }

    return data as T;
  }

  return {
    login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data) =>
      request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    refresh: () => request('/api/auth/refresh', { method: 'POST', body: '{}' }),
    logout: () => request('/api/auth/logout', { method: 'POST', body: '{}' }),
    getCurrentUser: () => request('/api/users/me'),
  };
}

// =============================================================================
// PROVIDER
// =============================================================================

type ProviderProps = {
  children: ReactNode;
  /** Override config for testing */
  configOverride?: Partial<ClientConfig>;
};

/**
 * EnvironmentProvider - Wrap your app with this
 *
 * @example
 * ```tsx
 * // main.tsx
 * createRoot(document.getElementById('root')!).render(
 *   <EnvironmentProvider>
 *     <App />
 *   </EnvironmentProvider>
 * )
 *
 * // In components
 * function MyComponent() {
 *   const { auth, api } = useEnvironment();
 *   // ...
 * }
 * ```
 */
export function EnvironmentProvider({
  children,
  configOverride,
}: ProviderProps): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Build config from global config
  const clientConfig: ClientConfig = useMemo(
    () => ({
      apiUrl: apiConfig.url,
      wsUrl: apiConfig.wsUrl,
      env: config.app.env,
      ...configOverride,
    }),
    [configOverride],
  );

  // Create QueryClient
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60 * 1000, retry: 1 },
        },
      }),
    [],
  );

  // Create API client
  const api = useMemo(() => createApiClient(clientConfig.apiUrl), [clientConfig.apiUrl]);

  // Auth actions
  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.login({ email, password });
      setUser(result.user);
    },
    [api],
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const result = await api.register({ email, password, name });
      setUser(result.user);
    },
    [api],
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    queryClient.clear();
  }, [api, queryClient]);

  const refresh = useCallback(async () => {
    try {
      await api.refresh();
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Auth state
  const auth: AuthState = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      refresh,
    }),
    [user, isLoading, login, register, logout, refresh],
  );

  // Restore session on mount
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Build environment
  const environment: ClientEnvironment = useMemo(
    () => ({
      config: clientConfig,
      api,
      auth,
      queryClient,
    }),
    [clientConfig, api, auth, queryClient],
  );

  // Debug access in development
  useEffect(() => {
    if (clientConfig.env === 'development' && typeof window !== 'undefined') {
      (window as unknown as { env: ClientEnvironment }).env = environment;
    }
  }, [environment, clientConfig.env]);

  return (
    <QueryClientProvider client={queryClient}>
      <EnvironmentContext.Provider value={environment}>{children}</EnvironmentContext.Provider>
    </QueryClientProvider>
  );
}
