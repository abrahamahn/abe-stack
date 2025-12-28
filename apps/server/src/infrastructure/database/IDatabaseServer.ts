// Lightweight replacements for pg types to decouple from the pg client.
export interface DbQueryResultRow {
  [column: string]: unknown;
}

export interface DbQueryResult<T = DbQueryResultRow> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query: <T = DbQueryResultRow>(
    text: string,
    params?: unknown[]
  ) => Promise<DbQueryResult<T>>;
  release?: () => void;
}

/**
 * Query options for database operations
 */
export interface QueryOptions {
  /**
   * Query timeout in milliseconds
   */
  timeout?: number;

  /**
   * Tag for query metrics
   */
  tag?: string;

  /**
   * Maximum number of retry attempts for failed queries
   * Default: 2
   */
  maxRetries?: number;
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  /**
   * Maximum number of retry attempts for failed transactions
   * Default: 0 (no retries)
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds between retries
   * Default: 100ms
   */
  retryDelay?: number;

  /**
   * Multiplier for delay between retries (for exponential backoff)
   * Default: 1.5
   */
  retryDelayMultiplier?: number;

  /**
   * Maximum delay in milliseconds between retries
   * Default: 5000ms (5 seconds)
   */
  maxRetryDelay?: number;

  /**
   * Function to determine if a transaction should be retried based on the error
   * Default: retry on serialization failures and deadlock errors
   */
  shouldRetry?: (error: unknown) => boolean;

  /**
   * Optional isolation level for the transaction
   */
  isolationLevel?: "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE";

  /**
   * Optional timeout in milliseconds for the transaction
   */
  timeout?: number;
}

/**
 * Connection statistics for monitoring database pool
 */
export interface ConnectionStats {
  /**
   * Total number of clients in the pool
   */
  totalCount: number;

  /**
   * Number of idle clients
   */
  idleCount: number;

  /**
   * Number of active clients
   */
  activeCount: number;

  /**
   * Number of clients waiting for connection
   */
  waitingCount: number;

  /**
   * Maximum number of clients allowed in the pool
   */
  maxConnections: number;

  /**
   * Current connection utilization (activeCount / maxConnections)
   */
  utilization: number;

  /**
   * Number of successful connection acquisitions
   */
  acquireCount: number;

  /**
   * Number of failed connection acquisitions
   */
  acquireFailCount: number;

  /**
   * Average time in milliseconds to acquire a connection
   */
  avgAcquireTime?: number;

  /**
   * Maximum time in milliseconds to acquire a connection
   */
  maxAcquireTime?: number;

  /**
   * Number of database queries executed
   */
  queryCount: number;

  /**
   * Number of failed database queries
   */
  queryFailCount: number;

  /**
   * Average query execution time in milliseconds
   */
  avgQueryTime?: number;

  /**
   * Maximum query execution time in milliseconds
   */
  maxQueryTime?: number;
}

/**
 * Query builder for constructing complex SQL queries
 */
export interface QueryBuilder {
  /**
   * Specify columns to select
   * @param columns Columns to select
   */
  select(columns: string | string[]): QueryBuilder;

  /**
   * Add a WHERE condition to the query
   * @param condition The SQL condition
   * @param params Parameters for the condition
   */
  where(condition: string, ...params: unknown[]): QueryBuilder;

  /**
   * Add a JOIN clause to the query
   * @param table The table to join
   * @param condition The join condition
   */
  join(table: string, condition: string): QueryBuilder;

  /**
   * Add a LEFT JOIN clause to the query
   * @param table The table to join
   * @param condition The join condition
   */
  leftJoin(table: string, condition: string): QueryBuilder;

  /**
   * Add a GROUP BY clause to the query
   * @param columns Columns to group by
   */
  groupBy(columns: string | string[]): QueryBuilder;

  /**
   * Add an ORDER BY clause to the query
   * @param column Column to order by
   * @param direction Sort direction
   */
  orderBy(column: string, direction?: "ASC" | "DESC"): QueryBuilder;

  /**
   * Set a LIMIT on the query
   * @param limit Maximum number of rows to return
   */
  limit(limit: number): QueryBuilder;

  /**
   * Set an OFFSET on the query
   * @param offset Number of rows to skip
   */
  offset(offset: number): QueryBuilder;

  /**
   * Execute the SELECT query
   * @param options Query options
   */
  execute<T extends DbQueryResultRow = DbQueryResultRow>(
    options?: QueryOptions,
  ): Promise<DbQueryResult<T>>;

  /**
   * Execute the query and return the first result
   * @param options Query options
   */
  getOne<T extends DbQueryResultRow = DbQueryResultRow>(
    options?: QueryOptions,
  ): Promise<T | null>;

  /**
   * Execute the query and return all results
   * @param options Query options
   */
  getMany<T extends DbQueryResultRow = DbQueryResultRow>(
    options?: QueryOptions,
  ): Promise<T[]>;

  /**
   * Count the number of rows matching the query
   * @param options Query options
   */
  count(options?: QueryOptions): Promise<number>;

  /**
   * Get the SQL for this query
   */
  getSql(): string;

  /**
   * Build the SQL query and parameters
   * @returns The SQL query and parameters
   */
  buildQuery(): { sql: string; params: unknown[] };
}

/**
 * Core database service interface
 * Provides database connection management and query execution
 */
export interface IDatabaseServer {
  /**
   * Initialize the database connection
   * @returns A promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;

  /**
   * Check if the database is connected
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean;

  /**
   * Close the database connection
   * @returns A promise that resolves when the connection is closed
   */
  close(): Promise<void>;

  /**
   * Get a client from the connection pool
   * @returns A promise that resolves with a database client
   */
  connect(): Promise<DbClient>;

  /**
   * Execute a SQL query
   * @param text SQL query text
   * @param params Query parameters
   * @param options Query options
   * @returns Query result
   */
  query<T extends DbQueryResultRow = DbQueryResultRow>(
    text: string,
    params?: unknown[],
    options?: QueryOptions,
  ): Promise<DbQueryResult<T>>;

  /**
   * Execute a function with a database client
   * @param callback Function that takes a client and returns a promise
   * @returns Result of the callback function
   */
  withClient<T>(callback: (client: DbClient) => Promise<T>): Promise<T>;

  /**
   * Execute a function within a transaction
   * @param callback Function that takes a client and returns a promise
   * @param options Transaction options for retry and isolation level
   * @returns Result of the callback function
   */
  withTransaction<T>(
    callback: (client: DbClient) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;

  /**
   * Get connection statistics
   * @param reset Whether to reset the metrics after retrieving them
   * @returns Connection statistics
   */
  getStats(reset?: boolean): ConnectionStats;

  /**
   * Reset the connection metrics
   */
  resetMetrics(): void;

  /**
   * Reset the database connection (primarily for testing)
   * @returns A promise that resolves when reset is complete
   */
  reset(): Promise<void>;

  /**
   * Create a query builder for constructing complex SQL queries
   * @param tableName The name of the table to query
   * @returns A QueryBuilder instance
   */
  createQueryBuilder(tableName: string): QueryBuilder;
}
