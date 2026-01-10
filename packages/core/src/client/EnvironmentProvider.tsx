/**
 * EnvironmentProvider - Single React provider for the entire app
 *
 * This replaces the nested providers pattern:
 * - QueryClientProvider
 * - AuthProvider
 * - ApiProvider
 * - HistoryProvider
 *
 * With a single provider that exposes everything via useEnvironment()
 */

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type {
  ClientEnvironment,
  ClientConfig,
  AuthState,
  ApiClient,
  User,
} from './ClientEnvironment';

// Context for the environment
const EnvironmentContext = createContext<ClientEnvironment | null>(null);

/**
 * Hook to access the client environment
 * @throws Error if used outside EnvironmentProvider
 */
export function useEnvironment(): ClientEnvironment {
  const env = useContext(EnvironmentContext);
  if (!env) {
    throw new Error('useEnvironment must be used within EnvironmentProvider');
  }
  return env;
}

/**
 * Convenience hook to access just the API client
 */
export function useApi(): ApiClient {
  return useEnvironment().api;
}

/**
 * Convenience hook to access just the auth state
 */
export function useAuth(): AuthState {
  return useEnvironment().auth;
}

/**
 * Convenience hook to access just the config
 */
export function useConfig(): ClientConfig {
  return useEnvironment().config;
}

/**
 * Props for EnvironmentProvider
 */
type EnvironmentProviderProps = {
  /** Client configuration */
  config: ClientConfig;
  /** Optional custom API client (for testing) */
  apiClient?: ApiClient;
  /** Optional custom QueryClient */
  queryClient?: QueryClient;
  /** Children to render */
  children: ReactNode;
};

/**
 * Create a basic API client
 * This is a simplified version - the full implementation is in packages/api-client
 */
function createBasicApiClient(config: ClientConfig): ApiClient {
  const baseUrl = config.apiUrl.replace(/\/+$/, '');

  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include', // Send cookies for auth
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error((data as { message?: string }).message || `HTTP ${response.status}`);
    }

    return data as T;
  }

  return {
    async login(data) {
      return request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async register(data) {
      return request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async refresh() {
      return request('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    async logout() {
      return request('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    async getCurrentUser() {
      return request('/api/users/me');
    },
  };
}

/**
 * EnvironmentProvider - The single provider for your entire app
 *
 * @example
 * ```tsx
 * // In main.tsx
 * const config = {
 *   apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
 *   wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
 *   env: import.meta.env.MODE as 'development' | 'production',
 * }
 *
 * createRoot(document.getElementById('root')!).render(
 *   <EnvironmentProvider config={config}>
 *     <App />
 *   </EnvironmentProvider>
 * )
 *
 * // In components
 * function MyComponent() {
 *   const { auth, api } = useEnvironment()
 *
 *   if (auth.isLoading) return <div>Loading...</div>
 *   if (!auth.isAuthenticated) return <LoginForm />
 *
 *   return <div>Welcome, {auth.user?.name}</div>
 * }
 * ```
 */
export function EnvironmentProvider({
  config,
  apiClient,
  queryClient: providedQueryClient,
  children,
}: EnvironmentProviderProps) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create QueryClient (memoized to prevent recreation)
  const queryClient = useMemo(
    () =>
      providedQueryClient ??
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
          },
        },
      }),
    [providedQueryClient],
  );

  // Create API client (memoized)
  const api = useMemo(
    () => apiClient ?? createBasicApiClient(config),
    [apiClient, config],
  );

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

  // Auth state object
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
    refresh();
  }, [refresh]);

  // Build the environment object
  const environment: ClientEnvironment = useMemo(
    () => ({
      config,
      api,
      auth,
      queryClient,
      // Phase 4-6: These will be implemented later
      pubsub: null,
      subscriptionCache: null,
      recordCache: null,
      recordStorage: null,
      transactionQueue: null,
      undoRedo: null,
    }),
    [config, api, auth, queryClient],
  );

  // Expose environment on window for debugging (development only)
  useEffect(() => {
    if (config.env === 'development' && typeof window !== 'undefined') {
      (window as unknown as { env: ClientEnvironment }).env = environment;
    }
  }, [environment, config.env]);

  return (
    <QueryClientProvider client={queryClient}>
      <EnvironmentContext.Provider value={environment}>
        {children}
      </EnvironmentContext.Provider>
    </QueryClientProvider>
  );
}
