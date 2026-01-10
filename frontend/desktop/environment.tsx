/**
 * Desktop ClientEnvironment - Single Entry Point for Desktop App Dependencies
 *
 * Similar to web, but can be extended for Electron-specific features:
 * - Secure token storage (keytar)
 * - IPC communication
 * - Native file system access
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
// TYPES (same as web, can be extended for desktop-specific features)
// =============================================================================

export type ClientConfig = {
  apiUrl: string;
  wsUrl: string;
  env: 'development' | 'production' | 'test';
  /** Desktop-specific: use native storage for tokens */
  useNativeStorage?: boolean;
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
  /** Desktop-specific: Electron IPC bridge */
  // ipc?: ElectronIPC;
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
  configOverride?: Partial<ClientConfig>;
};

export function EnvironmentProvider({
  children,
  configOverride,
}: ProviderProps): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clientConfig: ClientConfig = useMemo(
    () => ({
      apiUrl: apiConfig.url,
      wsUrl: apiConfig.wsUrl,
      env: config.app.env,
      useNativeStorage: true, // Desktop uses native storage by default
      ...configOverride,
    }),
    [configOverride],
  );

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60 * 1000, retry: 1 },
        },
      }),
    [],
  );

  const api = useMemo(() => createApiClient(clientConfig.apiUrl), [clientConfig.apiUrl]);

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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const environment: ClientEnvironment = useMemo(
    () => ({
      config: clientConfig,
      api,
      auth,
      queryClient,
    }),
    [clientConfig, api, auth, queryClient],
  );

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
