// src/apps/web/src/features/auth/hooks/useAuth.ts
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

import type {
  EmailVerificationRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResetPasswordRequest,
  User,
} from '@abe-stack/api';
import type { AuthState } from '@auth/services';

// Import directly from services to avoid circular dependency through barrel

export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<void>;
  resetPassword: (data: ResetPasswordRequest) => Promise<void>;
  verifyEmail: (data: EmailVerificationRequest) => Promise<void>;
  resendVerification: (data: ResendVerificationRequest) => Promise<void>;
  verifyTotpLogin: (challengeToken: string, code: string) => Promise<void>;
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
    async (data: RegisterRequest): Promise<RegisterResponse> => {
      const result = await auth.register(data);
      return result;
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
    async (data: ForgotPasswordRequest): Promise<void> => {
      await auth.forgotPassword(data);
    },
    [auth],
  );

  const resetPassword = useCallback(
    async (data: ResetPasswordRequest): Promise<void> => {
      await auth.resetPassword(data);
    },
    [auth],
  );

  const verifyEmail = useCallback(
    async (data: EmailVerificationRequest): Promise<void> => {
      await auth.verifyEmail(data);
    },
    [auth],
  );

  const resendVerification = useCallback(
    async (data: ResendVerificationRequest): Promise<void> => {
      await auth.resendVerification(data);
    },
    [auth],
  );

  const verifyTotpLogin = useCallback(
    async (challengeToken: string, code: string): Promise<void> => {
      await auth.verifyTotpLogin(challengeToken, code);
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
    verifyTotpLogin,
  };
}
