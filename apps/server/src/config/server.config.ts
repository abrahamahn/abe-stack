// apps/server/src/config/server.config.ts
/**
 * HTTP Server Configuration
 */

import type { LogLevel } from '@abe-stack/core';

export type { LogLevel };

export interface ServerConfig {
  host: string;
  port: number;
  portFallbacks: number[];
  cors: {
    origin: string;
    credentials: boolean;
    methods: string[];
  };
  trustProxy: boolean;
  logLevel: LogLevel;
  /** Base URL for the frontend app (used in email links) */
  appBaseUrl: string;
  /** Base URL for the API server */
  apiBaseUrl: string;
}

export function loadServerConfig(env: Record<string, string | undefined>): ServerConfig {
  const defaultPort = 8080;
  const port = parseInt(env.API_PORT || env.PORT || String(defaultPort), 10);
  const appPort = parseInt(env.APP_PORT || '5173', 10);

  return {
    host: env.HOST || '0.0.0.0',
    port,
    portFallbacks: [defaultPort, defaultPort + 1, defaultPort + 2, defaultPort + 3],
    cors: {
      origin: env.CORS_ORIGIN || `http://localhost:${String(appPort)}`,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    },
    trustProxy: env.TRUST_PROXY === 'true',
    logLevel: (env.LOG_LEVEL || 'info') as LogLevel,
    appBaseUrl: env.APP_BASE_URL || `http://localhost:${String(appPort)}`,
    apiBaseUrl: env.API_BASE_URL || `http://localhost:${String(port)}`,
  };
}
