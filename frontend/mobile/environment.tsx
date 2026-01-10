/**
 * Mobile ClientEnvironment - Single Entry Point for Mobile App Dependencies
 *
 * Similar to web, but extended for React Native-specific features:
 * - SecureStore for token storage
 * - Network state handling
 * - Background sync
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
import { config, apiConfig } from '../../shared/config';
import type { User } from '../../shared/schema';

// =============================================================================
// TYPES (extended for mobile-specific features)
// =============================================================================

export type ClientConfig = {
  apiUrl: string;
  wsUrl: string;
  env: 'development' | 'production' | 'test';
  /** Mobile-specific: use SecureStore for tokens */
  useSecureStorage?: boolean;
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
  register: (data: { email: string; password: string; name?: string }) => Promise<{ token: string; user: User }>;
  refresh: () => Promise<{ token: string }>;
  logout: () => Promise<{ message: string }>;
  getCurrentUser: () => Promise<User>;
};

export type ClientEnvironment = {
  config: ClientConfig;
  api: ApiClient;
  auth: AuthState;
  queryClient: QueryClient;
  /** Mobile-specific: network state */
  // networkState?: { isOnline: boolean; isInternetReachable: boolean };
};

// =============================================================================
// CONTEXT
// =============================================================================

const EnvironmentContext = createContext<ClientEnvironment | null>(null);

export function useEnvironment(): ClientEnvironment {
  const env = useContext(EnvironmentContext);
  if (!env) {
    throw new Error('useEnvironment must be used within EnvironmentProvider');
  }
  return env;
}

export function useApi(): ApiClient {
  return useEnvironment().api;
}

export function useAuth(): AuthState {
  return useEnvironment().auth;
}

export function useConfig(): ClientConfig {
  return useEnvironment().config;
}

// =============================================================================
// API CLIENT (mobile version - could add token header instead of cookies)
// =============================================================================

function createApiClient(baseUrl: string, getToken?: () => string | null): ApiClient {
  const url = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Mobile may use Bearer token instead of cookies
    const token = getToken?.();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${url}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error((data as { message?: string }).message || `HTTP ${response.status}`);
    }

    return data as T;
  }

  return {
    login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
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
  configOverride?: Partial<ClientConfig>;
};

export function EnvironmentProvider({ children, configOverride }: ProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const clientConfig: ClientConfig = useMemo(() => ({
    apiUrl: apiConfig.url,
    wsUrl: apiConfig.wsUrl,
    env: config.app.env,
    useSecureStorage: true, // Mobile uses SecureStore by default
    ...configOverride,
  }), [configOverride]);

  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5 * 60 * 1000, retry: 1 },
    },
  }), []);

  const getToken = useCallback(() => token, [token]);
  const api = useMemo(() => createApiClient(clientConfig.apiUrl, getToken), [clientConfig.apiUrl, getToken]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login({ email, password });
    setToken(result.token);
    setUser(result.user);
    // TODO: Store token in SecureStore
  }, [api]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const result = await api.register({ email, password, name });
    setToken(result.token);
    setUser(result.user);
    // TODO: Store token in SecureStore
  }, [api]);

  const logout = useCallback(async () => {
    await api.logout();
    setToken(null);
    setUser(null);
    queryClient.clear();
    // TODO: Clear token from SecureStore
  }, [api, queryClient]);

  const refresh = useCallback(async () => {
    try {
      // TODO: Load token from SecureStore first
      const result = await api.refresh();
      setToken(result.token);
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const auth: AuthState = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refresh,
  }), [user, isLoading, login, register, logout, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const environment: ClientEnvironment = useMemo(() => ({
    config: clientConfig,
    api,
    auth,
    queryClient,
  }), [clientConfig, api, auth, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <EnvironmentContext.Provider value={environment}>
        {children}
      </EnvironmentContext.Provider>
    </QueryClientProvider>
  );
}
