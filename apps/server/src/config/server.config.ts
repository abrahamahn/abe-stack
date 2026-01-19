// apps/server/src/config/server.config.ts
/**
 * HTTP Server Configuration
 */

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
  logLevel: string;
}

export function loadServerConfig(env: Record<string, string | undefined>): ServerConfig {
  const defaultPort = 8080;

  return {
    host: env.HOST || '0.0.0.0',
    port: parseInt(env.API_PORT || env.PORT || String(defaultPort), 10),
    portFallbacks: [defaultPort, defaultPort + 1, defaultPort + 2, defaultPort + 3],
    cors: {
      origin: env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    },
    trustProxy: env.TRUST_PROXY === 'true',
    logLevel: env.LOG_LEVEL || 'info',
  };
}
