// infra/src/http/config.ts
import { getList } from '@abe-stack/shared/config';

import type { FullEnv, LogLevel, ServerConfig } from '@abe-stack/shared/config';

/**
 * Load HTTP Server Configuration.
 *
 * Handles:
 * - **Port Resolution**: Checks `API_PORT` -> `PORT` -> Default (8080).
 * - **CORS**: Configures allowed origins for cross-domain requests.
 * - **Discovery**: Resolves public base URLs for the App (Frontend) and API.
 * - **Operational**: Sets trust proxy (for load balancers) and log levels.
 *
 * @param env - Environment variable map
 * @returns Complete server configuration
 * @complexity O(1)
 */
export function loadServerConfig(env: FullEnv): ServerConfig {
  const isProd = env.NODE_ENV === 'production';
  const defaultPort = 8080;

  // Port resolution
  const port = env.API_PORT ?? env.PORT;
  const appPort = env.APP_PORT;

  // URL resolution (flexible naming support)
  const appBaseUrl =
    env.PUBLIC_APP_URL != null && env.PUBLIC_APP_URL !== ''
      ? env.PUBLIC_APP_URL
      : env.APP_URL != null && env.APP_URL !== ''
        ? env.APP_URL
        : env.APP_BASE_URL != null && env.APP_BASE_URL !== ''
          ? env.APP_BASE_URL
          : `http://localhost:${String(appPort)}`;

  const apiBaseUrl =
    env.PUBLIC_API_URL !== undefined && env.PUBLIC_API_URL !== ''
      ? env.PUBLIC_API_URL
      : env.VITE_API_URL !== undefined && env.VITE_API_URL !== ''
        ? env.VITE_API_URL
        : env.API_BASE_URL !== undefined && env.API_BASE_URL !== ''
          ? env.API_BASE_URL
          : `http://localhost:${port}`;

  return {
    host: env.HOST !== '' ? env.HOST : '0.0.0.0',
    port,
    // Used by the starter logic to find an open port if the default is taken
    portFallbacks: [defaultPort, 3000, 5000, 8000],

    cors: {
      // Support multiple origins (e.g., Web + Desktop + Admin)
      origin:
        env.CORS_ORIGINS !== undefined && env.CORS_ORIGINS !== ''
          ? getList(env.CORS_ORIGINS)
          : env.CORS_ORIGIN !== undefined && env.CORS_ORIGIN !== ''
            ? getList(env.CORS_ORIGIN)
            : [appBaseUrl],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    },

    // Operational Settings
    trustProxy: env.TRUST_PROXY === 'true' || (env.TRUST_PROXY === undefined && isProd),
    logLevel: env.LOG_LEVEL as LogLevel,
    maintenanceMode: env.MAINTENANCE_MODE === 'true',

    // Identity/Discovery
    appBaseUrl,
    apiBaseUrl,

    // Global Rate Limiting (Infrastructure layer)
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS ?? 60000,
      max: env.RATE_LIMIT_MAX ?? (isProd ? 100 : 1000),
    },
  };
}
