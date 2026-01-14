// apps/web/src/features/auth/contexts/AuthContext.tsx
import { tokenStore } from '@abe-stack/contracts';
import { api } from '@api/client';
import { config } from '@config';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useEffect, useRef, useState } from 'react';

import type { AuthResponse, LoginRequest, RegisterRequest, UserRole } from '@abe-stack/contracts';
import type { ReactElement, ReactNode } from 'react';

export type User = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    data: user,
    isPending,
    error,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.getCurrentUser(),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Token refresh function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await api.refresh();
      tokenStore.set(response.token);
      setToken(response.token);
      return true;
    } catch {
      // Refresh failed - clear auth state
      tokenStore.clear();
      setToken(null);
      queryClient.removeQueries({ queryKey: ['auth', 'me'], exact: true });
      return false;
    }
  }, [queryClient]);

  // Setup auto-refresh interval when authenticated
  useEffect(() => {
    if (!token) {
      return;
    }

    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Setup new refresh interval
    refreshIntervalRef.current = setInterval(() => {
      void refreshToken();
    }, config.tokenRefreshInterval);

    return (): void => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [token, refreshToken]);

  useEffect(() => {
    if (error) {
      // Try to refresh token before giving up
      void refreshToken();
    }
  }, [error, refreshToken]);

  const login = async (credentials: LoginRequest): Promise<void> => {
    const response: AuthResponse = await api.login(credentials);
    tokenStore.set(response.token);
    setToken(response.token);
    queryClient.setQueryData(['auth', 'me'], response.user);
  };

  const register = async (data: RegisterRequest): Promise<void> => {
    const response: AuthResponse = await api.register(data);
    tokenStore.set(response.token);
    setToken(response.token);
    queryClient.setQueryData(['auth', 'me'], response.user);
  };

  const logout = async (): Promise<void> => {
    // Clear refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Call server logout to invalidate refresh token
    try {
      await api.logout();
    } catch {
      // Ignore errors - we're logging out anyway
    }

    tokenStore.clear();
    setToken(null);
    queryClient.removeQueries({ queryKey: ['auth', 'me'], exact: true });
  };

  const isLoading = Boolean(token) && isPending;
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
