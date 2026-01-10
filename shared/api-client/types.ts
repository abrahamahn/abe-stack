// Re-export types from shared
export type { LoginRequest, RegisterRequest, AuthResponse, UserResponse } from '../contracts';

export interface ApiClientOptions {
  baseUrl?: string; // host origin, no /api suffix
  fetchImpl?: typeof fetch;
}
