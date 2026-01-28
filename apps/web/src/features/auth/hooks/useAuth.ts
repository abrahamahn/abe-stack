// apps/web/src/features/auth/hooks/useAuth.ts
/**
 * useAuth hook - Access authentication state and operations.
 *
 * Uses the ClientEnvironment's AuthService under the hood.
 * Provides a stable API matching the previous AuthContext interface.
 */

// Import directly from ClientEnvironment to avoid circular dependency
// (The @app barrel exports createEnvironment which imports from @features/auth)
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useEffect, useState } from 'react';

import type { AuthState, User } from '@auth/services/AuthService';
// Import directly from services to avoid circular dependency through barrel

// ============================================================================
// Local Type Definitions
// ============================================================================

interface LoginRequestLocal {
  email: string;
  password: string;
}

interface RegisterRequestLocal {
  email: string;
  password: string;
  name?: string | undefined;
}

interface RegisterResponseLocal {
  status: 'pending_verification';
  message: string;
  email: string;
}

interface ForgotPasswordRequestLocal {
  email: string;
}

interface ResetPasswordRequestLocal {
  token: string;
  password: string;
}

interface EmailVerificationRequestLocal {
  token: string;
}

interface ResendVerificationRequestLocal {
  email: string;
}

export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequestLocal) => Promise<void>;
  register: (data: RegisterRequestLocal) => Promise<RegisterResponseLocal>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  forgotPassword: (data: ForgotPasswordRequestLocal) => Promise<void>;
  resetPassword: (data: ResetPasswordRequestLocal) => Promise<void>;
  verifyEmail: (data: EmailVerificationRequestLocal) => Promise<void>;
  resendVerification: (data: ResendVerificationRequestLocal) => Promise<void>;
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
    async (credentials: LoginRequestLocal): Promise<void> => {
      await auth.login(credentials);
    },
    [auth],
  );

  const register = useCallback(
    async (data: RegisterRequestLocal): Promise<RegisterResponseLocal> => {
      const result = await auth.register(data);
      return result as RegisterResponseLocal;
    },
    [auth],
  );

  const logout = useCallback(async (): Promise<void> => {
    await auth.logout();
  }, [auth]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const result = await auth.refreshToken();
    return result;
  }, [auth]);

  const forgotPassword = useCallback(
    async (data: ForgotPasswordRequestLocal): Promise<void> => {
      await auth.forgotPassword(data);
    },
    [auth],
  );

  const resetPassword = useCallback(
    async (data: ResetPasswordRequestLocal): Promise<void> => {
      await auth.resetPassword(data);
    },
    [auth],
  );

  const verifyEmail = useCallback(
    async (data: EmailVerificationRequestLocal): Promise<void> => {
      await auth.verifyEmail(data);
    },
    [auth],
  );

  const resendVerification = useCallback(
    async (data: ResendVerificationRequestLocal): Promise<void> => {
      await auth.resendVerification(data);
    },
    [auth],
  );

  return {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
  };
}
