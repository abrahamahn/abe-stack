// apps/server/src/config/database.config.ts
/**
 * Database Configuration
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionString?: string;
  maxConnections: number;
  portFallbacks: number[];
}

export function loadDatabaseConfig(env: Record<string, string | undefined>): DatabaseConfig {
  const defaultPort = 5432;

  return {
    host: env.POSTGRES_HOST || 'localhost',
    port: parseInt(env.POSTGRES_PORT || String(defaultPort), 10),
    database: env.POSTGRES_DB || 'abe_stack_dev',
    user: env.POSTGRES_USER || 'postgres',
    password: env.POSTGRES_PASSWORD || '',
    connectionString: env.DATABASE_URL,
    maxConnections: parseInt(env.DB_MAX_CONNECTIONS || '10', 10),
    portFallbacks: [defaultPort, defaultPort + 1, defaultPort + 2],
  };
}

export function buildConnectionString(config: DatabaseConfig): string {
  if (config.connectionString) {
    return config.connectionString;
  }
  return `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
}
