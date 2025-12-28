import { apiContract } from '@abe-stack/shared';
import { initClient } from '@ts-rest/core';

import type { LoginRequest, RegisterRequest, AuthResponse, UserResponse } from '@abe-stack/shared';

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
}

type ApiError = { message?: string };

export interface ApiClient {
  login: (data: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  getCurrentUser: () => Promise<UserResponse>;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const client = initClient(apiContract, {
    baseUrl: config.baseUrl,
    baseHeaders: {
      Authorization: () => {
        const token = config.getToken?.();
        return token ? `Bearer ${token}` : '';
      },
    },
  });

  const getMessage = (body: unknown, fallback: string): string => {
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const msg = (body as { message?: unknown }).message;
      if (typeof msg === 'string') {
        return msg;
      }
    }
    return fallback;
  };

  return {
    async login(data: LoginRequest): Promise<AuthResponse> {
      const res = (await client.auth.login({ body: data })) as {
        status: 200 | 400 | 401 | 500;
        body: AuthResponse | ApiError;
      };
      if (res.status === 200) return res.body;
      throw new Error(getMessage(res.body, 'Login failed'));
    },
    async register(data: RegisterRequest): Promise<AuthResponse> {
      const res = (await client.auth.register({ body: data })) as {
        status: 201 | 400 | 409 | 500;
        body: AuthResponse | ApiError;
      };
      if (res.status === 201) return res.body;
      throw new Error(getMessage(res.body, 'Registration failed'));
    },
    async getCurrentUser(): Promise<UserResponse> {
      const res = (await client.users.me()) as {
        status: 200 | 401 | 404 | 500;
        body: UserResponse | ApiError;
      };
      if (res.status === 200) return res.body;
      throw new Error(getMessage(res.body, 'Unable to fetch user'));
    },
  };
}
