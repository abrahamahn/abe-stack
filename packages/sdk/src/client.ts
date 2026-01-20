// packages/sdk/src/client.ts
import { addAuthHeader } from '@abe-stack/core';

import type {
  AuthResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LogoutResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UserResponse,
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
  getCurrentUser: () => Promise<UserResponse>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<ForgotPasswordResponse>;
  resetPassword: (data: ResetPasswordRequest) => Promise<ResetPasswordResponse>;
  verifyEmail: (data: EmailVerificationRequest) => Promise<EmailVerificationResponse>;
  resendVerification: (data: ResendVerificationRequest) => Promise<ResendVerificationResponse>;
}

const API_PREFIX = '/api';

export function createApiClient(config: ApiClientConfig): ApiClient {
  const baseUrl = config.baseUrl.replace(/\/+$/, ''); // trim trailing slashes
  const fetcher = config.fetchImpl ?? fetch;

  const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');
    addAuthHeader(headers, config.getToken?.());

    const response = await fetcher(`${baseUrl}${API_PREFIX}${path}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for refresh token
    });

    const url = `${baseUrl}${API_PREFIX}${path}`;
    const data = (await response.json().catch((parseError: unknown) => {
      // eslint-disable-next-line no-console
      console.warn(
        `[ApiClient] Failed to parse JSON response from ${options?.method ?? 'GET'} ${url} (status: ${response.status.toString()})`,
        parseError,
      );
      return {};
    })) as { message?: string };

    if (!response.ok) {
      const statusText = data.message ?? `HTTP ${response.status.toString()}`;
      throw new Error(statusText);
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
    async getCurrentUser(): Promise<UserResponse> {
      return request<UserResponse>('/users/me');
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
  };
}
