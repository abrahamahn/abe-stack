// apps/web/src/config/index.ts
/**
 * Centralized client configuration.
 *
 * All environment variables and app-level constants in one place.
 */

// ============================================================================
// Environment Variables
// ============================================================================

type EnvVars = {
  MODE: string;
  DEV: boolean;
  PROD: boolean;
  VITE_API_URL?: string;
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

  // Future additions:
  // wsUrl: string;
};

// ============================================================================
// Factory (for testing)
// ============================================================================

export function createClientConfig(): ClientConfig {
  return {
    mode: env.MODE,
    isDev: env.DEV,
    isProd: env.PROD,
    // Empty string = relative URLs, proxied by Vite in dev, same-origin in prod
    apiUrl: (env.VITE_API_URL ?? '').replace(/\/+$/, ''),
    tokenRefreshInterval: 13 * 60 * 1000, // 13 minutes
    uiVersion: '1.1.0',
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

/** Default client config - use this in app code */
export const clientConfig = createClientConfig();

/** @deprecated Use `clientConfig` instead */
export const config = clientConfig;
