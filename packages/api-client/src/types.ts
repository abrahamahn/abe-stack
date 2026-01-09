// packages/api-client/src/types.ts
// Re-export types from shared
export type { LoginRequest, RegisterRequest, AuthResponse, UserResponse } from '@abe-stack/shared';

export interface ApiClientOptions {
  baseUrl?: string; // host origin, no /api suffix
  fetchImpl?: typeof fetch;
}
