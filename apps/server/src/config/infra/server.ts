// apps/server/src/config/infra/server.ts
import { getBool, getInt, getList } from '@abe-stack/core/config/utils';
import type { LogLevel, ServerConfig } from '@abe-stack/core/contracts/config';

/**
 * Loads the core HTTP server configuration.
 * Handles ports, CORS, and basic infrastructure settings.
 */
export function loadServer(env: Record<string, string | undefined>): ServerConfig {
  const isProd = env.NODE_ENV === 'production';
  const defaultPort = 8080;

  // Port resolution (Standard PORT env is used by most cloud providers)
  const port = getInt(env.API_PORT || env.PORT, defaultPort);
  const appPort = getInt(env.APP_PORT, 5173);

  const appBaseUrl = env.APP_BASE_URL || `http://localhost:${appPort}`;
  const apiBaseUrl = env.API_BASE_URL || `http://localhost:${port}`;

  return {
    host: env.HOST || '0.0.0.0',
    port,
    // Used by the starter logic to find an open port if the default is taken
    portFallbacks: [defaultPort, 3000, 5000, 8000],

    cors: {
      // Support multiple origins (e.g., Web + Desktop + Admin)
      origin: env.CORS_ORIGIN ? getList(env.CORS_ORIGIN) : [appBaseUrl],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    },

    // Operational Settings
    trustProxy: getBool(env.TRUST_PROXY) ?? isProd,
    logLevel: (env.LOG_LEVEL || 'info') as LogLevel,
    maintenanceMode: getBool(env.MAINTENANCE_MODE) ?? false,

    // Identity/Discovery
    appBaseUrl,
    apiBaseUrl,

    // Global Rate Limiting (Infrastructure layer)
    rateLimit: {
      windowMs: getInt(env.RATE_LIMIT_WINDOW_MS, 60000),
      max: getInt(env.RATE_LIMIT_MAX, isProd ? 100 : 1000),
    },
  };
}
