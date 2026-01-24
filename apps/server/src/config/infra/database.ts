// apps/server/src/config/infra/database.ts
import type {
  DatabaseConfig,
  DatabaseProvider,
  JsonDatabaseConfig,
  PostgresConfig,
} from '@abe-stack/core/config';
import type { FullEnv } from '@abe-stack/core/config';

/**
 * Load Database Configuration.
 *
 * Supports multiple providers:
 * - **PostgreSQL**: Production-ready relational DB (Default).
 * - **MongoDB**: Document store.
 * - **SQLite**: Lightweight file-based DB (great for testing/prototyping).
 * - **JSON**: Simple file-based persistence for small apps.
 *
 * @param env - Environment variables.
 * @returns Provider-specific configuration.
 */
export function loadDatabaseConfig(env: FullEnv): DatabaseConfig {
  const provider = (env.DATABASE_PROVIDER || 'postgresql') as DatabaseProvider;

  switch (provider) {
    case 'json':
      return {
        provider: 'json',
        filePath: env.JSON_DB_PATH || '.data/db.json',
        persistOnWrite: env.JSON_DB_PERSIST_ON_WRITE !== 'false',
      };

    case 'sqlite':
      return {
        provider: 'sqlite',
        filePath: env.SQLITE_FILE_PATH || '.data/sqlite.db',
        walMode: env.SQLITE_WAL_MODE !== 'false',
        foreignKeys: env.SQLITE_FOREIGN_KEYS !== 'false',
        timeout: env.SQLITE_TIMEOUT_MS ?? 5000,
      };

    case 'mongodb':
      return {
        provider: 'mongodb',
        connectionString:
          env.MONGODB_CONNECTION_STRING ||
          (env.DATABASE_URL?.includes('mongodb')
            ? env.DATABASE_URL
            : 'mongodb://localhost:27017/abe_stack_dev'),
        database: env.MONGODB_DATABASE || env.MONGODB_DB || 'abe_stack_dev',
        options: {
          ssl: env.MONGODB_SSL === 'true',
          connectTimeoutMs: env.MONGODB_CONNECT_TIMEOUT_MS ?? 30000,
          socketTimeoutMs: env.MONGODB_SOCKET_TIMEOUT_MS ?? 30000,
          useUnifiedTopology: env.MONGODB_USE_UNIFIED_TOPOLOGY !== 'false',
        },
      };

    case 'postgresql':
    default:
      const pgDefaultPort = 5432;
      const isPgProd = env.NODE_ENV === 'production';

      return {
        provider: 'postgresql',
        host: env.POSTGRES_HOST || 'localhost',
        port: env.POSTGRES_PORT ?? pgDefaultPort,
        database: env.POSTGRES_DB || 'abe_stack_dev',
        user: env.POSTGRES_USER || 'postgres',
        password: env.POSTGRES_PASSWORD || '',
        connectionString:
          (env.DATABASE_URL?.includes('postgresql') ? env.DATABASE_URL : undefined) ||
          env.POSTGRES_CONNECTION_STRING,
        maxConnections: env.DB_MAX_CONNECTIONS ?? (isPgProd ? 20 : 10),
        portFallbacks: [pgDefaultPort, pgDefaultPort + 1, pgDefaultPort + 2],
        // ssl is usually required for cloud providers in production
        ssl: env.DB_SSL ? env.DB_SSL === 'true' : isPgProd,
      };
  }
}

/**
 * Builds a standardized connection string from discrete config parts.
 *
 * **PostgreSQL Logic**:
 * Constructs `postgresql://user:pass@host:port/db`.
 */
export function buildConnectionString(config: DatabaseConfig): string {
  switch (config.provider) {
    case 'postgresql': {
      if (config.connectionString) return config.connectionString;
      const { user, password, host, port, database } = config;
      if (!host) return '';
      const encodedPassword = encodeURIComponent(password);
      return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;
    }
    case 'mongodb':
      return config.connectionString ?? '';
    default:
      return '';
  }
}

/**
 * Returns a connection string with the password redacted for logging.
 */
export function getSafeConnectionString(config: DatabaseConfig): string {
  const full = buildConnectionString(config);
  return full.replace(/:([^:@]+)@/, ':****@');
}

export const isPostgres = (config: DatabaseConfig): config is PostgresConfig =>
  config.provider === 'postgresql';

export const isJsonDatabase = (config: DatabaseConfig): config is JsonDatabaseConfig =>
  config.provider === 'json';
