// src/apps/web/src/config.ts
/**
 * Centralized client configuration.
 *
 * All environment variables and app-level constants in one place.
 */

import { MS_PER_DAY, MS_PER_MINUTE, MS_PER_SECOND } from '@abe-stack/shared';

// ============================================================================
// Environment Variables
// ============================================================================

type EnvVars = {
  MODE: string;
  DEV: boolean;
  PROD: boolean;
  [key: string]: string | boolean | undefined;
};

const env: EnvVars = import.meta.env as EnvVars;

// ============================================================================
// Types
// ============================================================================

export type ClientConfig = {
  /** Environment mode (development, production, test) */
  mode: string;

  /** Is development environment */
  isDev: boolean;

  /** Is production environment */
  isProd: boolean;

  /** API base URL */
  apiUrl: string;

  /** Token refresh interval in ms */
  tokenRefreshInterval: number;

  /** UI version string */
  uiVersion: string;

  /** Query cache persistence configuration */
  queryPersistence: {
    maxAge: number; // in milliseconds
    throttleTime: number; // in milliseconds
  };

  // Future additions:
  // wsUrl: string;
};

// ============================================================================
// Factory (for testing)
// ============================================================================

export function createClientConfig(): ClientConfig {
  const viteApiUrl = env['VITE_API_URL'] as string | undefined;
  return {
    mode: env.MODE,
    isDev: env.DEV,
    isProd: env.PROD,
    // Empty string = relative URLs, proxied by Vite in dev, same-origin in prod
    apiUrl: (viteApiUrl ?? '').replace(/\/+$/, ''),
    tokenRefreshInterval: 13 * MS_PER_MINUTE,
    uiVersion: '1.1.0',
    queryPersistence: {
      maxAge: MS_PER_DAY,
      throttleTime: MS_PER_SECOND,
    },
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

/** Default client config - use this in app code */
export const clientConfig = createClientConfig();

/** @deprecated Use `clientConfig` instead */
export const config = clientConfig;
