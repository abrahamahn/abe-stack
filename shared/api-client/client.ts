import { addAuthHeader } from '../utils';

import type {
  AuthResponse,
  LoginRequest,
  LogoutResponse,
  RefreshResponse,
  RegisterRequest,
  UserResponse,
} from '../contracts';

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

export interface ApiClient {
  login: (data: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  refresh: () => Promise<RefreshResponse>;
  logout: () => Promise<LogoutResponse>;
  getCurrentUser: () => Promise<UserResponse>;
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

    const data = (await response.json().catch(() => ({}))) as { message?: string };

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
    async register(data: RegisterRequest): Promise<AuthResponse> {
      return request<AuthResponse>('/auth/register', {
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
  };
}
