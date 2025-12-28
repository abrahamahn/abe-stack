import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useEffect, useState } from 'react';

import { api } from '../lib/api';

import type { AuthResponse, LoginRequest, RegisterRequest } from '@abe-stack/shared';
import type { ReactElement, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  );

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

  useEffect(() => {
    if (error) {
      localStorage.removeItem('token');
      setToken(null);
      queryClient.removeQueries({ queryKey: ['auth', 'me'], exact: true });
    }
  }, [error, queryClient]);

  const login = async (credentials: LoginRequest): Promise<void> => {
    const response: AuthResponse = await api.login(credentials);
    localStorage.setItem('token', response.token);
    setToken(response.token);
    queryClient.setQueryData(['auth', 'me'], response.user);
  };

  const register = async (data: RegisterRequest): Promise<void> => {
    const response: AuthResponse = await api.register(data);
    localStorage.setItem('token', response.token);
    setToken(response.token);
    queryClient.setQueryData(['auth', 'me'], response.user);
  };

  const logout = async (): Promise<void> => {
    localStorage.removeItem('token');
    setToken(null);
    queryClient.removeQueries({ queryKey: ['auth', 'me'], exact: true });
    await Promise.resolve();
  };

  const isLoading = Boolean(token) && isPending;
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{ user: user ?? null, isLoading, isAuthenticated, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
