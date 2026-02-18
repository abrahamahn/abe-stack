// main/server/db/src/client.ts
/**
 * Raw PostgreSQL Client Wrapper
 *
 * Provides a type-safe interface over the postgres driver with support for:
 * - Parameterized queries (SQL injection safe)
 * - Transactions with automatic commit/rollback
 * - Query result typing
 * - Connection pooling
 *
 * @example
 * const db = createRawDb('postgres://localhost/mydb');
 * const users = await db.query<User>(select('users').where(eq('active', true)));
 */

import postgres, {
  type Options,
  type ParameterOrJSON,
  type Sql,
  type TransactionSql,
} from 'postgres';

export interface QueryResult {
  readonly text: string;
  readonly values: readonly unknown[];
}

// ============================================================================
// Types
// ============================================================================

/**
 * Database client configuration
 */
export interface DbConfig {
  /** PostgreSQL connection string */
  connectionString: string;
  /** Maximum connections in pool (default: 10) */
  maxConnections?: number;
  /** Idle connection timeout in ms (default: 30000) */
  idleTimeout?: number;
  /** Connection timeout in ms (default: 10000) */
  connectTimeout?: number;
  /** Enable SSL (default: auto-detect from connection string) */
  ssl?: boolean | 'require' | 'prefer';
}

/**
 * Query options
 */
export interface QueryOptions {
  /** Query timeout in ms */
  timeout?: number;
}

/**
 * Transaction isolation levels
 */
export type IsolationLevel =
  | 'read uncommitted'
  | 'read committed'
  | 'repeatable read'
  | 'serializable';

/**
 * Transaction options
 */
export interface TransactionOptions {
  /** Isolation level (default: read committed) */
  isolationLevel?: IsolationLevel;
  /** Read-only transaction */
  readOnly?: boolean;
  /** Deferrable (only with serializable) */
  deferrable?: boolean;
}

/**
 * Session context for Row-Level Security
 */
export interface SessionContext {
  userId?: string;
  tenantId?: string;
  role?: string;
}

/**
 * Raw database client interface
 */
export interface RawDb {
  /**
   * Execute a query and return all rows
   * @example const users = await db.query<User>(select('users').toSql());
   */
  query<T = Record<string, unknown>>(query: QueryResult, options?: QueryOptions): Promise<T[]>;

  /**
   * Execute a query and return the first row or null
   * @example const user = await db.queryOne<User>(select('users').where(eq('id', id)).toSql());
   */
  queryOne<T = Record<string, unknown>>(
    query: QueryResult,
    options?: QueryOptions,
  ): Promise<T | null>;

  /**
   * Execute a query without returning rows (INSERT/UPDATE/DELETE)
   * Returns the number of affected rows
   * @example const count = await db.execute(deleteFrom('sessions').where(lt('expires_at', now)).toSql());
   */
  execute(query: QueryResult, options?: QueryOptions): Promise<number>;

  /**
   * Execute a raw SQL string (use with caution)
   * @example await db.raw('VACUUM ANALYZE users');
   */
  raw<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<T[]>;

  /**
   * Execute a callback within a transaction
   * Automatically commits on success, rolls back on error
   * @example
   * await db.transaction(async (tx) => {
   *   const user = await tx.queryOne<User>(select('users').where(eq('id', id)).forUpdate().toSql());
   *   await tx.execute(update('users').set({ balance: user.balance - 100 }).where(eq('id', id)).toSql());
   * });
   */
  transaction<T>(callback: (tx: RawDb) => Promise<T>, options?: TransactionOptions): Promise<T>;

  /**
   * Create a session-scoped database client for Row-Level Security.
   * Scoped clients execute queries within a local task that sets session variables.
   */
  withSession(session: SessionContext): RawDb;

  /**
   * Check if the database connection is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Close all connections in the pool
   */
  close(): Promise<void>;

  /**
   * Get the underlying postgres client (for advanced use cases)
   */
  getClient(): Sql;
}

// Internal type for the postgres client (either main or transaction)
type PostgresClient = Sql | TransactionSql;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Create a raw database client
 * @example const db = createRawDb({ connectionString: 'postgres://localhost/mydb' });
 */
export function createRawDb(config: DbConfig | string): RawDb {
  const dbConfig: DbConfig = typeof config === 'string' ? { connectionString: config } : config;

  const postgresOptions: Partial<Options<Record<string, never>>> = {};
  postgresOptions.max = dbConfig.maxConnections ?? 10;
  postgresOptions.idle_timeout = dbConfig.idleTimeout ?? 30000;
  postgresOptions.connect_timeout = dbConfig.connectTimeout ?? 10000;
  if (dbConfig.ssl !== undefined) {
    postgresOptions.ssl = dbConfig.ssl;
  }

  const sql = postgres(dbConfig.connectionString, postgresOptions);

  // The postgres client exposes begin() on the main Sql instance only.
  return createDbFromSql(sql);
}

/**
 * Create a RawDb interface from an existing postgres client
 * Useful for creating transaction clients
 */
function createDbFromSql(sql: PostgresClient, session?: SessionContext): RawDb {
  // Helper to execute unsafe queries with proper typing
  const unsafeQuery = async <T>(text: string, values: readonly unknown[]): Promise<T[]> => {
    // If a session is present, wrap the query in a transaction to set local RLS variables.
    // This ensures SET LOCAL variables are isolated to the connection and reset after.
    if (session && (session.userId || session.tenantId)) {
      return (sql as Sql).begin(async (tx: any) => {
        if (session.userId)
          await tx.unsafe(`SET LOCAL app.user_id = ${tx.escapeLiteral(session.userId)}`);
        if (session.tenantId)
          await tx.unsafe(`SET LOCAL app.tenant_id = ${tx.escapeLiteral(session.tenantId)}`);
        if (session.role) await tx.unsafe(`SET LOCAL app.role = ${tx.escapeLiteral(session.role)}`);
        const r = await tx.unsafe(text, [...values] as ParameterOrJSON<never>[]);
        return r as unknown as T[];
      }) as unknown as Promise<T[]>;
    }

    // The postgres driver's unsafe() accepts (query, args) where args is an array
    const result = await sql.unsafe(text, [...values] as ParameterOrJSON<never>[]);
    return result as unknown as T[];
  };

  return {
    async query<T = Record<string, unknown>>(
      query: QueryResult,
      _options?: QueryOptions,
    ): Promise<T[]> {
      return unsafeQuery<T>(query.text, query.values);
    },

    async queryOne<T = Record<string, unknown>>(
      query: QueryResult,
      _options?: QueryOptions,
    ): Promise<T | null> {
      const result = await unsafeQuery<T>(query.text, query.values);
      return result[0] ?? null;
    },

    async execute(query: QueryResult, _options?: QueryOptions): Promise<number> {
      // Direct execution without the unsafeQuery wrapper if we want to bypass the session
      // check for counts/etc? No, we want session for everything.
      // For execute we need the count. unsafeQuery returns T[].
      // But unsafeQuery internally calls tx.unsafe which returns a result with .count.
      // However, we are casting it to T[].

      // Let's fix unsafeQuery to be more flexible or just handle it here.
      if (session && (session.userId || session.tenantId)) {
        return (sql as Sql).begin(async (tx: any) => {
          if (session.userId)
            await tx.unsafe(`SET LOCAL app.user_id = ${tx.escapeLiteral(session.userId)}`);
          if (session.tenantId)
            await tx.unsafe(`SET LOCAL app.tenant_id = ${tx.escapeLiteral(session.tenantId)}`);
          if (session.role)
            await tx.unsafe(`SET LOCAL app.role = ${tx.escapeLiteral(session.role)}`);
          const r = await tx.unsafe(query.text, [...query.values] as ParameterOrJSON<never>[]);
          return r.count;
        });
      }

      const res = await sql.unsafe(query.text, [...query.values] as ParameterOrJSON<never>[]);
      return res.count;
    },

    async raw<T = Record<string, unknown>>(sqlText: string, values: unknown[] = []): Promise<T[]> {
      return unsafeQuery<T>(sqlText, values);
    },

    async transaction<T>(
      callback: (tx: RawDb) => Promise<T>,
      options?: TransactionOptions,
    ): Promise<T> {
      const isolationLevel = options?.isolationLevel ?? 'read committed';
      const readOnly = options?.readOnly;
      const deferrable = options?.deferrable;

      const isolationClause = `isolation level ${isolationLevel}`;
      const client = sql as Sql;
      const beginFn = (client as unknown as { begin?: unknown }).begin;
      const savepointFn = (client as unknown as { savepoint?: unknown }).savepoint;

      const runCallback = async (tx: TransactionSql | Sql): Promise<T> => {
        const txOptions: string[] = [];
        if (readOnly === true) {
          txOptions.push('READ ONLY');
        } else if (readOnly === false) {
          txOptions.push('READ WRITE');
        }
        if (deferrable === true) {
          txOptions.push('DEFERRABLE');
        } else if (deferrable === false) {
          txOptions.push('NOT DEFERRABLE');
        }
        if (txOptions.length > 0) {
          await tx.unsafe(`SET TRANSACTION ${txOptions.join(' ')}`);
        }

        // Propagate current session to the new transaction client
        const txDb = createDbFromSql(tx, session);
        return callback(txDb);
      };

      if (typeof beginFn === 'function') {
        const result = client.begin(isolationClause, runCallback);
        return (await result) as T;
      }

      if (typeof savepointFn === 'function') {
        // Nested transactions: postgres uses savepoints and does not support SET TRANSACTION.
        const result = (
          client as unknown as { savepoint: (cb: (tx: TransactionSql) => Promise<T>) => Promise<T> }
        ).savepoint(async (tx) => {
          const txDb = createDbFromSql(tx, session);
          return callback(txDb);
        });
        return (await result) as T;
      }

      throw new Error('Database client does not support transactions');
    },

    withSession(s: SessionContext): RawDb {
      // Return a new client with the session merged (if already in one) or set
      return createDbFromSql(sql, { ...session, ...s });
    },

    async healthCheck(): Promise<boolean> {
      try {
        const mainSql = sql as Sql;
        await mainSql`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    },

    async close(): Promise<void> {
      const mainSql = sql as Sql;
      await mainSql.end();
    },

    getClient(): Sql {
      return sql as Sql;
    },
  };
}

// ============================================================================
// Connection String Utilities
// ============================================================================

/**
 * Build a connection string from environment variables
 */
export function buildConnectionString(
  env: Record<string, string | undefined> = process.env,
): string {
  if (env['DATABASE_URL'] !== undefined && env['DATABASE_URL'] !== '') {
    return env['DATABASE_URL'];
  }

  const user = env['POSTGRES_USER'] ?? env['DB_USER'] ?? 'postgres';
  const password = env['POSTGRES_PASSWORD'] ?? env['DB_PASSWORD'] ?? '';
  const host = env['POSTGRES_HOST'] ?? env['DB_HOST'] ?? 'localhost';
  const port = env['POSTGRES_PORT'] ?? env['DB_PORT'] ?? '5432';
  const database = env['POSTGRES_DB'] ?? env['DB_NAME'] ?? 'abe_stack_dev';

  const auth = password !== '' ? `${user}:${password}` : user;
  return `postgres://${auth}@${host}:${port}/${database}`;
}

/**
 * Test if a database is reachable
 */
export async function canReachDatabase(connectionString: string): Promise<boolean> {
  const testOptions: Partial<Options<Record<string, never>>> = {};
  testOptions.max = 1;
  testOptions.idle_timeout = 1000;
  testOptions.connect_timeout = 1000;

  const testClient = postgres(connectionString, testOptions);

  try {
    await testClient`SELECT 1`;
    await testClient.end({ timeout: 1 });
    return true;
  } catch {
    await testClient.end({ timeout: 1 }).catch(() => undefined);
    return false;
  }
}

/**
 * Find a reachable database from a list of ports
 */
export async function resolveConnectionStringWithFallback(
  env: Record<string, string | undefined> = process.env,
  fallbackPorts: number[] = [5432, 5433, 5434],
): Promise<string> {
  if (env['DATABASE_URL'] !== undefined && env['DATABASE_URL'] !== '') {
    return env['DATABASE_URL'];
  }

  const tryPorts = [Number(env['POSTGRES_PORT'] ?? env['DB_PORT'] ?? NaN), ...fallbackPorts].filter(
    (p) => !isNaN(p),
  );

  const uniquePorts = [...new Set(tryPorts)];

  for (const port of uniquePorts) {
    const envCopy: Record<string, string | undefined> = { ...env };
    envCopy['POSTGRES_PORT'] = String(port);
    envCopy['DB_PORT'] = String(port);
    const connectionString = buildConnectionString(envCopy);

    if (await canReachDatabase(connectionString)) {
      return connectionString;
    }
  }

  throw new Error(`Unable to connect to Postgres on ports: ${uniquePorts.join(', ')}`);
}

// ============================================================================
// DbClient type alias and singleton factory
// ============================================================================

/** Database client type alias for RawDb */
export type DbClient = RawDb;

type GlobalWithDb = typeof globalThis & { rawDb?: RawDb };

/**
 * Create a raw SQL database client (singleton in development for HMR)
 */
export function createDbClient(connectionString: string): RawDb {
  if (process.env['NODE_ENV'] !== 'production') {
    const globalWithDb = globalThis as GlobalWithDb;

    globalWithDb.rawDb ??= createRawDb({
      connectionString,
      maxConnections: Number(process.env['DB_MAX_CONNECTIONS'] ?? 10),
      idleTimeout: Number(process.env['DB_IDLE_TIMEOUT'] ?? 30000),
      connectTimeout: Number(process.env['DB_CONNECT_TIMEOUT'] ?? 10000),
    });

    return globalWithDb.rawDb;
  }

  return createRawDb({
    connectionString,
    maxConnections: Number(process.env['DB_MAX_CONNECTIONS'] ?? 10),
    idleTimeout: Number(process.env['DB_IDLE_TIMEOUT'] ?? 30000),
    connectTimeout: Number(process.env['DB_CONNECT_TIMEOUT'] ?? 10000),
  });
}
