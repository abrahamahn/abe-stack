// src/client/api/src/api/client.ts

import { addAuthHeader } from '@abe-stack/shared';

import { createApiError, NetworkError } from '../errors';

import type { ApiErrorBody } from '../errors';
import type {
  AuthResponse,
  ChangeEmailRequest,
  ChangeEmailResponse,
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
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
  RevertEmailChangeRequest,
  RevertEmailChangeResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  TotpLoginChallengeResponse,
  TotpLoginVerifyRequest,
  TotpSetupResponse,
  TotpStatusResponse,
  TotpVerifyRequest,
  TotpVerifyResponse,
  User,
} from '@abe-stack/shared';

/** Payload emitted when the server requires ToS acceptance (403 TOS_ACCEPTANCE_REQUIRED) */
export interface TosRequiredPayload {
  documentId: string;
  requiredVersion: number;
}

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
  /**
   * Called when the server returns 403 with code TOS_ACCEPTANCE_REQUIRED.
   * The promise should resolve after the user accepts the ToS,
   * allowing the original request to be retried automatically.
   * If not provided, the 403 error is thrown normally.
   */
  onTosRequired?: (payload: TosRequiredPayload) => Promise<void>;
}

export interface ApiClient {
  login: (data: LoginRequest) => Promise<AuthResponse | TotpLoginChallengeResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  refresh: () => Promise<RefreshResponse>;
  logout: () => Promise<LogoutResponse>;
  getCurrentUser: () => Promise<User>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<ForgotPasswordResponse>;
  resetPassword: (data: ResetPasswordRequest) => Promise<ResetPasswordResponse>;
  verifyEmail: (data: EmailVerificationRequest) => Promise<EmailVerificationResponse>;
  resendVerification: (data: ResendVerificationRequest) => Promise<ResendVerificationResponse>;
  // TOTP methods
  totpSetup: () => Promise<TotpSetupResponse>;
  totpEnable: (data: TotpVerifyRequest) => Promise<TotpVerifyResponse>;
  totpDisable: (data: TotpVerifyRequest) => Promise<TotpVerifyResponse>;
  totpStatus: () => Promise<TotpStatusResponse>;
  totpVerifyLogin: (data: TotpLoginVerifyRequest) => Promise<AuthResponse>;
  // Email change methods
  changeEmail: (data: ChangeEmailRequest) => Promise<ChangeEmailResponse>;
  confirmEmailChange: (data: ConfirmEmailChangeRequest) => Promise<ConfirmEmailChangeResponse>;
  revertEmailChange: (data: RevertEmailChangeRequest) => Promise<RevertEmailChangeResponse>;
  // OAuth methods
  getEnabledOAuthProviders: () => Promise<OAuthEnabledProvidersResponse>;
  getOAuthConnections: () => Promise<OAuthConnectionsResponse>;
  unlinkOAuthProvider: (provider: OAuthProvider) => Promise<OAuthUnlinkResponse>;
  getOAuthLoginUrl: (provider: OAuthProvider) => string;
  getOAuthLinkUrl: (provider: OAuthProvider) => string;
}

const API_PREFIX = '/api';

function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end--;
  }
  return value.slice(0, end);
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const baseUrl = trimTrailingSlashes(config.baseUrl);
  const fetcher = config.fetchImpl ?? fetch;

  const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');

    const token = config.getToken?.();
    if (token !== null && token !== undefined) {
      (addAuthHeader as (headers: Headers, token: string | null | undefined) => Headers)(
        headers,
        token,
      );
    }

    const url = `${baseUrl}${API_PREFIX}${path}`;

    let response: Response;
    try {
      response = await fetcher(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for refresh token
      });
    } catch (error: unknown) {
      // Network error (offline, DNS failure, etc.)
      const errorMessage = `Failed to fetch ${options?.method ?? 'GET'} ${path}`;
      const originalError = error instanceof Error ? error : new Error(String(error));
      throw new NetworkError(errorMessage, originalError) as Error;
    }

    const data = (await response.json().catch((_parseError: unknown) => {
      return {};
    })) as Record<string, unknown>;

    if (!response.ok) {
      // Intercept 403 TOS_ACCEPTANCE_REQUIRED: allow caller to show ToS modal and retry
      if (
        response.status === 403 &&
        data['code'] === 'TOS_ACCEPTANCE_REQUIRED' &&
        config.onTosRequired !== undefined
      ) {
        const documentId = typeof data['documentId'] === 'string' ? data['documentId'] : '';
        const requiredVersion =
          typeof data['requiredVersion'] === 'number' ? data['requiredVersion'] : 0;

        if (documentId !== '') {
          // Wait for the user to accept ToS, then retry the original request
          await config.onTosRequired({ documentId, requiredVersion });
          return request<T>(path, options);
        }
      }

      const errorBody: ApiErrorBody = {};
      if (typeof data['message'] === 'string') {
        errorBody.message = data['message'];
      }
      if (typeof data['code'] === 'string') {
        errorBody.code = data['code'];
      }
      if (typeof data['details'] === 'object' && data['details'] !== null) {
        errorBody.details = data['details'] as Record<string, unknown>;
      }
      throw createApiError(response.status, errorBody);
    }

    return data as T;
  };

  return {
    async login(data: LoginRequest): Promise<AuthResponse | TotpLoginChallengeResponse> {
      return request<AuthResponse | TotpLoginChallengeResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async register(data: RegisterRequest): Promise<RegisterResponse> {
      return request<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async refresh(): Promise<RefreshResponse> {
      return request<RefreshResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    async logout(): Promise<LogoutResponse> {
      return request<LogoutResponse>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    async getCurrentUser(): Promise<User> {
      return request<User>('/users/me');
    },
    async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
      return request<ForgotPasswordResponse>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
      return request<ResetPasswordResponse>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async verifyEmail(data: EmailVerificationRequest): Promise<EmailVerificationResponse> {
      return request<EmailVerificationResponse>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async resendVerification(data: ResendVerificationRequest): Promise<ResendVerificationResponse> {
      return request<ResendVerificationResponse>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    // TOTP methods
    async totpSetup(): Promise<TotpSetupResponse> {
      return request<TotpSetupResponse>('/auth/totp/setup', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    async totpEnable(data: TotpVerifyRequest): Promise<TotpVerifyResponse> {
      return request<TotpVerifyResponse>('/auth/totp/enable', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async totpDisable(data: TotpVerifyRequest): Promise<TotpVerifyResponse> {
      return request<TotpVerifyResponse>('/auth/totp/disable', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async totpStatus(): Promise<TotpStatusResponse> {
      return request<TotpStatusResponse>('/auth/totp/status');
    },
    async totpVerifyLogin(data: TotpLoginVerifyRequest): Promise<AuthResponse> {
      return request<AuthResponse>('/auth/totp/verify-login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    // Email change methods
    async changeEmail(data: ChangeEmailRequest): Promise<ChangeEmailResponse> {
      return request<ChangeEmailResponse>('/auth/change-email', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async confirmEmailChange(data: ConfirmEmailChangeRequest): Promise<ConfirmEmailChangeResponse> {
      return request<ConfirmEmailChangeResponse>('/auth/change-email/confirm', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async revertEmailChange(data: RevertEmailChangeRequest): Promise<RevertEmailChangeResponse> {
      return request<RevertEmailChangeResponse>('/auth/change-email/revert', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    // OAuth methods
    async getEnabledOAuthProviders(): Promise<OAuthEnabledProvidersResponse> {
      return request<OAuthEnabledProvidersResponse>('/auth/oauth/providers');
    },
    async getOAuthConnections(): Promise<OAuthConnectionsResponse> {
      return request<OAuthConnectionsResponse>('/auth/oauth/connections');
    },
    async unlinkOAuthProvider(provider: OAuthProvider): Promise<OAuthUnlinkResponse> {
      // OAuthProvider is already a string literal union type
      const providerStr = provider as string;
      return request<OAuthUnlinkResponse>(`/auth/oauth/${providerStr}/unlink`, {
        method: 'DELETE',
      });
    },
    getOAuthLoginUrl(provider: OAuthProvider): string {
      // This returns a URL the browser should navigate to (redirect)
      const providerStr = provider as string;
      return `${baseUrl}${API_PREFIX}/auth/oauth/${providerStr}`;
    },
    getOAuthLinkUrl(provider: OAuthProvider): string {
      // This returns the link initiation endpoint - must be called with auth
      const providerStr = provider as string;
      return `${baseUrl}${API_PREFIX}/auth/oauth/${providerStr}/link`;
    },
  };
}
