// src/client/api/src/api/index.ts
/**
 * API Client Module
 *
 * Provides a fetch-based API client for direct API calls.
 */

export { createApiClient } from './client';
export type { ApiClient, ApiClientConfig } from './client';
export { clearApiClient, getApiClient } from './instance';
export type { ApiClientOptions } from './types';
