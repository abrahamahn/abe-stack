// apps/server/src/config/database.config.ts
/**
 * Database Configuration
 *
 * Supports two providers:
 * - postgresql: Production-ready PostgreSQL via Drizzle ORM
 * - json: Simple JSON file storage for development/prototyping (no external dependencies)
 */

export type DatabaseProvider = 'postgresql' | 'json';

export interface PostgresConfig {
  provider: 'postgresql';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionString?: string;
  maxConnections: number;
  portFallbacks: number[];
}

export interface JsonDatabaseConfig {
  provider: 'json';
  filePath: string;
  /** Write to disk on every change (default: true) */
  persistOnWrite: boolean;
}

export type DatabaseConfig = PostgresConfig | JsonDatabaseConfig;

export function loadDatabaseConfig(env: Record<string, string | undefined>): DatabaseConfig {
  const provider = (env.DATABASE_PROVIDER || 'postgresql') as DatabaseProvider;

  if (provider === 'json') {
    return {
      provider: 'json',
      filePath: env.JSON_DB_PATH || '.data/db.json',
      persistOnWrite: env.JSON_DB_PERSIST_ON_WRITE !== 'false',
    };
  }

  const defaultPort = 5432;

  return {
    provider: 'postgresql',
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
  if (config.provider === 'json') {
    // JSON database doesn't use connection strings
    return '';
  }

  if (config.connectionString) {
    return config.connectionString;
  }
  return `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
}

/**
 * Type guard for PostgreSQL config
 */
export function isPostgresConfig(config: DatabaseConfig): config is PostgresConfig {
  return config.provider === 'postgresql';
}

/**
 * Type guard for JSON database config
 */
export function isJsonDatabaseConfig(config: DatabaseConfig): config is JsonDatabaseConfig {
  return config.provider === 'json';
}
