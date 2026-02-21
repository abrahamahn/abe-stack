// main/apps/server/src/config/infra/server.ts
import { CORS_CONFIG } from '@bslt/shared';
import { RATE_LIMIT_DEFAULTS, SERVER_PORT_FALLBACKS, getList } from '@bslt/shared/config';

import type { FullEnv, LogLevel, ServerConfig } from '@bslt/shared/config';

/**
 * Loads the core HTTP server configuration.
 * Handles ports, CORS, and basic infrastructure settings.
 */
/**
 * Load HTTP Server Configuration.
 *
 * Handles:
 * - **Port Resolution**: Checks `API_PORT` -> `PORT` -> Default (8080).
 * - **CORS**: Configures allowed origins for cross-domain requests.
 * - **Discovery**: Resolves public base URLs for the App (Frontend) and API.
 * - **Operational**: Sets trust proxy (for load balancers) and log levels.
 */
export function loadServerConfig(env: FullEnv): ServerConfig {
  const isProd = env.NODE_ENV === 'production';

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
          : `http://localhost:${String(port)}`;

  return {
    host: env.HOST !== '' ? env.HOST : '0.0.0.0',
    port,
    // Used by the starter logic to find an open port if the default is taken
    portFallbacks: [...SERVER_PORT_FALLBACKS],

    cors: {
      // Support multiple origins (e.g., Web + Desktop + Admin)
      origin:
        env.CORS_ORIGINS !== undefined && env.CORS_ORIGINS !== ''
          ? getList(env.CORS_ORIGINS)
          : env.CORS_ORIGIN !== undefined && env.CORS_ORIGIN !== ''
            ? getList(env.CORS_ORIGIN)
            : [appBaseUrl],
      credentials: true,
      methods: [...CORS_CONFIG.ALLOWED_METHODS],
    },

    // Operational Settings
    trustProxy: env.TRUST_PROXY === 'true' || (env.TRUST_PROXY === undefined && isProd),
    logLevel: env.LOG_LEVEL as LogLevel,
    maintenanceMode: env.MAINTENANCE_MODE === 'true',

    // Identity/Discovery
    appBaseUrl,
    apiBaseUrl,

    // Audit retention (0 = unlimited)
    auditRetentionDays: env.AUDIT_RETENTION_DAYS ?? 90,

    // Global Rate Limiting (Infrastructure layer)
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS ?? RATE_LIMIT_DEFAULTS.GLOBAL_WINDOW_MS,
      max:
        env.RATE_LIMIT_MAX ??
        (isProd ? RATE_LIMIT_DEFAULTS.GLOBAL_MAX_PROD : RATE_LIMIT_DEFAULTS.GLOBAL_MAX_DEV),
    },

    // Logging behavior
    logging: {
      clientErrorLevel: env.LOG_CLIENT_ERROR_LEVEL ?? 'warn',
      requestContext: env.LOG_REQUEST_CONTEXT !== 'false',
      prettyJson: env.LOG_PRETTY_JSON !== undefined ? env.LOG_PRETTY_JSON === 'true' : !isProd,
    },
  };
}
