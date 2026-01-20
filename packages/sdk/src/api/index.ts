// packages/sdk/src/api/index.ts
/**
 * API Client Module
 *
 * This module provides two API client implementations:
 *
 * ## 1. createApiClient (Standalone Client)
 * - Simple fetch-based client for direct API calls
 * - Use when you don't need React Query caching/state
 * - Good for: server-side code, background tasks, simple scripts
 *
 * @example
 * ```ts
 * import { createApiClient } from '@abe-stack/sdk';
 *
 * const api = createApiClient({
 *   baseUrl: 'http://localhost:3000',
 *   getToken: () => localStorage.getItem('token'),
 * });
 *
 * const user = await api.getCurrentUser();
 * ```
 *
 * ## 2. createReactQueryClient (React Query Integration)
 * - Type-safe client based on ts-rest contract
 * - Full React Query integration (caching, mutations, queries)
 * - Use when building React applications with data fetching
 *
 * @example
 * ```tsx
 * import { createReactQueryClient } from '@abe-stack/sdk';
 *
 * const api = createReactQueryClient({
 *   baseUrl: 'http://localhost:3000',
 *   getToken: () => useAuthStore.getState().token,
 *   onUnauthorized: () => useAuthStore.getState().logout(),
 * });
 *
 * // In a component:
 * const { data, isLoading } = api.auth.getCurrentUser.useQuery();
 * ```
 *
 * ## Which to use?
 * - React app with data fetching -> createReactQueryClient
 * - Non-React or simple direct calls -> createApiClient
 * - Both can coexist in the same app if needed
 */

export { createApiClient } from './client';
export type { ApiClient, ApiClientConfig } from './client';

export { createReactQueryClient } from './react-query';
export type { CreateApiOptions, ReactQueryClientInstance } from './react-query';

export type {
  ApiClientOptions,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UserResponse,
} from './types';
