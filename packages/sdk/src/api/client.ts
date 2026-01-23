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
    addAuthHeader(headers, config.getToken?.());

    const url = `${baseUrl}${API_PREFIX}${path}`;

    let response: Response;
    try {
      response = await fetcher(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for refresh token
      });
    } catch (error) {
      // Network error (offline, DNS failure, etc.)
      throw new NetworkError(
        `Failed to fetch ${options?.method ?? 'GET'} ${path}`,
        error instanceof Error ? error : undefined,
      );
    }

    const data = (await response.json().catch((_parseError: unknown) => {
      return {};
    })) as ApiErrorBody & Record<string, unknown>;

    if (!response.ok) {
      throw createApiError(response.status, data);
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
      return request<OAuthUnlinkResponse>(`/auth/oauth/${provider}/unlink`, {
        method: 'DELETE',
      });
    },
    getOAuthLoginUrl(provider: OAuthProvider): string {
      // This returns a URL the browser should navigate to (redirect)
      return `${baseUrl}${API_PREFIX}/auth/oauth/${provider}`;
    },
    getOAuthLinkUrl(provider: OAuthProvider): string {
      // This returns the link initiation endpoint - must be called with auth
      return `${baseUrl}${API_PREFIX}/auth/oauth/${provider}/link`;
    },
  };
}
