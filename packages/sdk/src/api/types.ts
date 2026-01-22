// packages/sdk/src/api/types.ts
// Re-export types from shared
export type { LoginRequest, RegisterRequest, AuthResponse, User } from '@abe-stack/core';

export interface ApiClientOptions {
  baseUrl?: string; // host origin, no /api suffix
  fetchImpl?: typeof fetch;
}
