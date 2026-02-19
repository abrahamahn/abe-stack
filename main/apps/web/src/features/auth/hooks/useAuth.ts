// main/apps/web/src/features/auth/hooks/useAuth.ts
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

import type { AuthState } from '@auth/services/AuthService';
import type {
  EmailVerificationRequest,
  EmailVerificationResponse,
  ForgotPasswordRequest,
  LoginRequest,
  MagicLinkRequest,
  MagicLinkRequestResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResetPasswordRequest,
  User,
} from '@bslt/api';

// Import directly from services to avoid circular dependency through barrel

export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isNewDevice: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<void>;
  resetPassword: (data: ResetPasswordRequest) => Promise<void>;
  verifyEmail: (data: EmailVerificationRequest) => Promise<EmailVerificationResponse>;
  resendVerification: (data: ResendVerificationRequest) => Promise<void>;
  verifyTotpLogin: (challengeToken: string, code: string) => Promise<void>;
  sendSmsCode: (challengeToken: string) => Promise<void>;
  verifySmsLogin: (challengeToken: string, code: string) => Promise<void>;
  requestMagicLink: (data: MagicLinkRequest) => Promise<MagicLinkRequestResponse>;
  verifyMagicLink: (data: { token: string }) => Promise<void>;
  dismissNewDeviceBanner: () => void;
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

  // Derived state during render: sync immediately when auth service reference changes
  // (e.g. during testing rerenders with a new mock). Calling setState during render
  // is safe when guarded by a reference check — React re-renders synchronously.
  const [prevAuth, setPrevAuth] = useState(auth);
  if (prevAuth !== auth) {
    setPrevAuth(auth);
    setState(auth.getState());
  }

  // Subscribe to ongoing auth state changes
  useEffect(() => {
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
    async (data: EmailVerificationRequest): Promise<EmailVerificationResponse> => {
      const result = await auth.verifyEmail(data);
      return result;
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

  const sendSmsCode = useCallback(
    async (challengeToken: string): Promise<void> => {
      await auth.sendSmsCode(challengeToken);
    },
    [auth],
  );

  const verifySmsLogin = useCallback(
    async (challengeToken: string, code: string): Promise<void> => {
      await auth.verifySmsLogin(challengeToken, code);
    },
    [auth],
  );

  const requestMagicLink = useCallback(
    async (data: MagicLinkRequest): Promise<MagicLinkRequestResponse> => {
      return auth.requestMagicLink(data);
    },
    [auth],
  );

  const verifyMagicLink = useCallback(
    async (data: { token: string }): Promise<void> => {
      await auth.verifyMagicLink(data);
    },
    [auth],
  );

  const dismissNewDeviceBanner = useCallback((): void => {
    auth.dismissNewDeviceBanner();
  }, [auth]);

  return {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    isNewDevice: state.isNewDevice,
    login,
    register,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    verifyTotpLogin,
    sendSmsCode,
    verifySmsLogin,
    requestMagicLink,
    verifyMagicLink,
    dismissNewDeviceBanner,
  };
}
