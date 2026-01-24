// apps/server/src/config/infra/server.ts
import { getList } from '@abe-stack/core/config/utils';
import type { LogLevel, ServerConfig } from '@abe-stack/core/contracts/config';
import type { FullEnv } from '@abe-stack/core/contracts/config/environment';

/**
 * Loads the core HTTP server configuration.
 * Handles ports, CORS, and basic infrastructure settings.
 */
export function loadServer(env: FullEnv): ServerConfig {
  const isProd = env.NODE_ENV === 'production';
  const defaultPort = 8080;

  // Port resolution
  const port = env.API_PORT ?? env.PORT ?? defaultPort;
  const appPort = env.APP_PORT ?? 5173;

  // URL resolution (flexible naming support)
  const appBaseUrl =
    env.PUBLIC_APP_URL ||
    env.APP_URL ||
    env.APP_BASE_URL ||
    `http://localhost:${appPort}`;

  const apiBaseUrl =
    env.PUBLIC_API_URL ||
    env.VITE_API_URL || // Support Vite-style naming for API
    env.API_BASE_URL ||
    `http://localhost:${port}`;

  return {
    host: env.HOST || '0.0.0.0',
    port,
    // Used by the starter logic to find an open port if the default is taken
    portFallbacks: [defaultPort, 3000, 5000, 8000],

    cors: {
      // Support multiple origins (e.g., Web + Desktop + Admin)
      origin: env.CORS_ORIGINS
        ? getList(env.CORS_ORIGINS)
        : env.CORS_ORIGIN
          ? getList(env.CORS_ORIGIN)
          : [appBaseUrl],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    },

    // Operational Settings
    trustProxy: env.TRUST_PROXY === 'true' || (env.TRUST_PROXY === undefined && isProd),
    logLevel: (env.LOG_LEVEL || 'info') as LogLevel,
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
