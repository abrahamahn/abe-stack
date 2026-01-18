// apps/web/src/features/auth/hooks/useAuth.ts
/**
 * useAuth hook - Access authentication state and operations.
 *
 * Uses the ClientEnvironment's AuthService under the hood.
 * Provides a stable API matching the previous AuthContext interface.
 */

import { useClientEnvironment } from '@app';
import { useCallback, useEffect, useState } from 'react';

import type { LoginRequest, RegisterRequest } from '@abe-stack/core';
import type { AuthState, User } from '@features/auth';

export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
};

/**
 * Hook to access authentication state and operations.
 *
 * Returns the same interface as the previous AuthContext for backward compatibility.
 * Internally uses the ClientEnvironment's AuthService.
 */
export function useAuth(): AuthContextType {
  const { auth } = useClientEnvironment();

  // Track auth state with useState for reactivity
  const [state, setState] = useState<AuthState>(() => auth.getState());

  // Subscribe to auth state changes
  useEffect(() => {
    // Get initial state
    setState(auth.getState());

    // Subscribe to updates
    const unsubscribe = auth.subscribe(() => {
      setState(auth.getState());
    });

    return unsubscribe;
  }, [auth]);

  // Memoized operations
  const login = useCallback(
    async (credentials: LoginRequest): Promise<void> => {
      await auth.login(credentials);
    },
    [auth],
  );

  const register = useCallback(
    async (data: RegisterRequest): Promise<void> => {
      await auth.register(data);
    },
    [auth],
  );

  const logout = useCallback(async (): Promise<void> => {
    await auth.logout();
  }, [auth]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    return auth.refreshToken();
  }, [auth]);

  return {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
  };
}
