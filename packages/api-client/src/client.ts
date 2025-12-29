import type { LoginRequest, RegisterRequest, AuthResponse, UserResponse } from '@abe-stack/shared';

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

export interface ApiClient {
  login: (data: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  getCurrentUser: () => Promise<UserResponse>;
}

const API_PREFIX = '/api';

export function createApiClient(config: ApiClientConfig): ApiClient {
  const baseUrl = config.baseUrl.replace(/\/+$/, ''); // trim trailing slashes
  const fetcher = config.fetchImpl ?? fetch;

  const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');

    const token = config.getToken?.();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetcher(`${baseUrl}${API_PREFIX}${path}`, {
      ...options,
      headers,
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
    async getCurrentUser(): Promise<UserResponse> {
      return request<UserResponse>('/users/me');
    },
  };
}
