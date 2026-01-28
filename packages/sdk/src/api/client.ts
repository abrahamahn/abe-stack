// packages/sdk/src/api/client.ts

import { addAuthHeader } from '@abe-stack/core';

import { createApiError, NetworkError } from '../errors';

import type { ApiErrorBody } from '../errors';
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

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

export interface ApiClient {
  login: (data: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  refresh: () => Promise<RefreshResponse>;
  logout: () => Promise<LogoutResponse>;
  getCurrentUser: () => Promise<User>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<ForgotPasswordResponse>;
  resetPassword: (data: ResetPasswordRequest) => Promise<ResetPasswordResponse>;
  verifyEmail: (data: EmailVerificationRequest) => Promise<EmailVerificationResponse>;
  resendVerification: (data: ResendVerificationRequest) => Promise<ResendVerificationResponse>;
  // OAuth methods
  getEnabledOAuthProviders: () => Promise<OAuthEnabledProvidersResponse>;
  getOAuthConnections: () => Promise<OAuthConnectionsResponse>;
  unlinkOAuthProvider: (provider: OAuthProvider) => Promise<OAuthUnlinkResponse>;
  getOAuthLoginUrl: (provider: OAuthProvider) => string;
  getOAuthLinkUrl: (provider: OAuthProvider) => string;
}

const API_PREFIX = '/api';

export function createApiClient(config: ApiClientConfig): ApiClient {
  const baseUrl = config.baseUrl.replace(/\/+$/, ''); // trim trailing slashes
  const fetcher = config.fetchImpl ?? fetch;

  const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');

    const token = config.getToken?.();
    if (token !== null && token !== undefined) {
      (addAuthHeader as (headers: Headers, token: string | null | undefined) => Headers)(headers, token);
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
    async login(data: LoginRequest): Promise<AuthResponse> {
      return request<AuthResponse>('/auth/login', {
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
