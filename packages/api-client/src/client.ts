import type { LoginRequest, RegisterRequest, AuthResponse, UserResponse } from '@abe-stack/shared';

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
}

export class ApiClient {
  constructor(private config: ApiClientConfig) {}

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = this.config.getToken?.();
    const headers = new Headers(options?.headers ?? {});

    headers.set('Content-Type', 'application/json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({ message: 'Request failed' }))) as {
        message?: string;
      };
      throw new Error(error.message || `HTTP ${String(response.status)}`);
    }

    return response.json() as Promise<T>;
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.fetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.fetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // User endpoints
  async getCurrentUser(): Promise<UserResponse> {
    return this.fetch<UserResponse>('/users/me');
  }
}

// Factory function
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
