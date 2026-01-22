// packages/sdk/src/api/index.ts
/**
 * API Client Module
 *
 * Provides a fetch-based API client for direct API calls.
 */

export { createApiClient } from './client';
export type { ApiClient, ApiClientConfig } from './client';

export type { ApiClientOptions, AuthResponse, LoginRequest, RegisterRequest, User } from './types';
