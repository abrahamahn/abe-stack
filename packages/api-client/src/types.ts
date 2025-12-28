// Re-export types from shared
export type { LoginRequest, RegisterRequest, AuthResponse, UserResponse } from '@abe-stack/shared';

export interface ApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}
