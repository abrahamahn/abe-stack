// src/client/api/src/api/instance.ts
import { createApiClient } from './client';

import type { ApiClient, ApiClientConfig } from './client';

let globalClient: ApiClient | null = null;
let currentConfig: ApiClientConfig | null = null;

/**
 * Get or initialize the global API client instance.
 * If config is provided, it will re-initialize the client if the config has changed.
 */
export function getApiClient(config?: ApiClientConfig): ApiClient {
  const hasConfig = config !== undefined;

  if (globalClient === null || (hasConfig && hasConfigChanged(config))) {
    if (!hasConfig && globalClient === null) {
      throw new Error('API client must be initialized with a config before first use.');
    }
    if (hasConfig) {
      globalClient = createApiClient(config);
      currentConfig = config;
    }
  }

  if (globalClient === null) {
    throw new Error('API client must be initialized with a config before first use.');
  }
  return globalClient;
}

/**
 * Check if the provided config differs from the current one.
 */
function hasConfigChanged(newConfig: ApiClientConfig): boolean {
  if (currentConfig === null) return true;
  return (
    newConfig.baseUrl !== currentConfig.baseUrl ||
    newConfig.getToken !== currentConfig.getToken ||
    newConfig.fetchImpl !== currentConfig.fetchImpl ||
    newConfig.onTosRequired !== currentConfig.onTosRequired
  );
}

/**
 * Clear the global client instance (useful for testing or switching environments).
 */
export function clearApiClient(): void {
  globalClient = null;
  currentConfig = null;
}
