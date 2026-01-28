// apps/web/src/api/ApiProvider.tsx
/**
 * ApiProvider - Provides API client to components.
 *
 * Uses ClientEnvironment's config for base URL and token management.
 * Creates a standalone API client with navigation callbacks.
 */

import { tokenStore } from '@abe-stack/core';
import { createApiClient } from '@abe-stack/sdk';
import { useClientEnvironment } from '@app';
import { createContext, useContext, useMemo } from 'react';

import type {
  AuthResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LogoutResponse,
  OAuthConnectionsResponse,
  OAuthEnabledProvidersResponse,
  OAuthProvider,
  OAuthUnlinkResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  User,
} from '@abe-stack/core';
import type { ReactElement, ReactNode } from 'react';

/**
 * API Client interface - mirrors @abe-stack/sdk ApiClient
 * Defined inline due to SDK type resolution issues.
 */
interface ApiClient {
  login: (data: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  refresh: () => Promise<RefreshResponse>;
  logout: () => Promise<LogoutResponse>;
  getCurrentUser: () => Promise<User>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<ForgotPasswordResponse>;
  resetPassword: (data: ResetPasswordRequest) => Promise<ResetPasswordResponse>;
  verifyEmail: (data: EmailVerificationRequest) => Promise<EmailVerificationResponse>;
  resendVerification: (data: ResendVerificationRequest) => Promise<ResendVerificationResponse>;
  getEnabledOAuthProviders: () => Promise<OAuthEnabledProvidersResponse>;
  getOAuthConnections: () => Promise<OAuthConnectionsResponse>;
  unlinkOAuthProvider: (provider: OAuthProvider) => Promise<OAuthUnlinkResponse>;
  getOAuthLoginUrl: (provider: OAuthProvider) => string;
}

const ApiContext = createContext<ApiClient | null>(null);

/**
 * Hook to access the typed API client.
 * Must be used within ApiProvider (which is inside ClientEnvironmentProvider).
 */
export const useApi = (): ApiClient => {
  const ctx = useContext(ApiContext);
  if (ctx === null) throw new Error('useApi must be used within ApiProvider');
  return ctx;
};

type ApiProviderProps = {
  children: ReactNode;
};

/**
 * ApiProvider creates a configured API client with auth token management.
 * Must be used within ClientEnvironmentProvider.
 *
 * Note: Error handling (unauthorized, server errors) should be done at the
 * call site using try-catch. Use isUnauthorizedError() from @abe-stack/sdk
 * to check for 401 errors.
 */
export const ApiProvider = ({ children }: ApiProviderProps): ReactElement => {
  const { config } = useClientEnvironment();

  const api = useMemo<ApiClient>(() => {
    const client = createApiClient({
      baseUrl: config.apiUrl,
      getToken: (): string | null => tokenStore.get(),
    });
    return client as ApiClient;
  }, [config.apiUrl]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};
