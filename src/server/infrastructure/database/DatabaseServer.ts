import { injectable, inject } from "inversify";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

import { DatabaseConfigProvider } from "@/server/infrastructure/config/domain/DatabaseConfig";
import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

import {
  IDatabaseServer,
  ConnectionStats,
  QueryOptions,
  TransactionOptions,
  QueryBuilder,
} from "./IDatabaseServer";

// Type for pool metrics properties
type PoolMetrics = {
  totalCount?: number;
  idleCount?: number;
  waitingCount?: number;
  activeCount?: number;
};

/**
 * Default transaction retry options
 */
const DEFAULT_TRANSACTION_OPTIONS: Required<TransactionOptions> = {
  maxRetries: 0,
  retryDelay: 100,
  retryDelayMultiplier: 1.5,
  maxRetryDelay: 5000,
  isolationLevel: "READ COMMITTED",
  timeout: 0,
  shouldRetry: (error: unknown): boolean => {
    if (error instanceof Error) {
      // Retry on serialization failure and deadlock errors by code
      const errorCode = (error as { code?: string }).code;
      if (errorCode) {
        return (
          errorCode === "40001" || // serialization_failure
          errorCode === "40P01" || // deadlock_detected
          errorCode === "55P03" || // lock_not_available
          errorCode === "57P01" || // admin_shutdown
          errorCode === "57014" || // query_canceled
          /^08/.test(errorCode) // connection errors
        );
      }

      // Also retry based on error message patterns
      return /deadlock|serialize|timeout|connection|retry|temporarily unavailable/i.test(
        error.message,
      );
    }
    return false;
  },
};

/**
 * Database service that focuses on core database operations
 * Provides connection management, query execution, and transaction support with retries
 */
@injectable()
export class DatabaseServer implements IDatabaseServer {
  private pool: Pool | null = null;
  private connected = false;
  private logger: ReturnType<ILoggerService["createLogger"]>;
  private databaseConfig: ReturnType<DatabaseConfigProvider["getConfig"]>;

  // Metrics tracking
  private metrics = {
    acquireCount: 0,
    acquireFailCount: 0,
    acquireTimes: [] as number[],
    queryCount: 0,
    queryFailCount: 0,
    queryTimes: [] as { time: number; tag?: string }[],
    taggedQueryTimes: new Map<string, number[]>(),
  };

  constructor(
    @inject(TYPES.LoggerService) loggerService: ILoggerService,
    @inject(TYPES.DatabaseConfig) configProvider: DatabaseConfigProvider,
  ) {
    this.logger = loggerService.createLogger("DatabaseServer");
    this.databaseConfig = configProvider.getConfig();
  }

  /**
   * Initialize the database connection
   */
  async initialize(skipConnectionTest = false): Promise<void> {
    if (this.pool) {
      return;
    }

    try {
      try {
        this.logger.info("Initializing database connection", {
          host: this.databaseConfig.host,
          port: this.databaseConfig.port,
          database: this.databaseConfig.database,
          user: this.databaseConfig.user,
        });
      } catch (error) {
        // Silently ignore any logger errors
        console.warn("Logger error:", error);
      }

      // Create connection pool
      this.pool = new Pool({
        host: this.databaseConfig.host,
        port: this.databaseConfig.port,
        database: this.databaseConfig.database,
        user: this.databaseConfig.user,
        password: this.databaseConfig.password,
        max: this.databaseConfig.maxConnections,
        idleTimeoutMillis: this.databaseConfig.idleTimeout,
        connectionTimeoutMillis: this.databaseConfig.connectionTimeout,
        statement_timeout: this.databaseConfig.statementTimeout,
        ssl: this.databaseConfig.ssl,
      });

      // Skip the connection test during testing to avoid actual database connections
      if (!skipConnectionTest && typeof this.pool.connect === "function") {
        // Test the connection
        const client = await this.pool.connect();
        await client.query("SELECT NOW()");
        try {
          this.logger.info("Database connection successful");
        } catch (error) {
          // Silently ignore any logger errors
          console.warn("Logger error:", error);
        }
        client.release();
      }

      // Track acquire times
      if (typeof this.pool.connect === "function") {
        const originalConnect = this.pool.connect.bind(this.pool);
        this.pool.connect = async () => {
          const startTime = Date.now();
          try {
            this.metrics.acquireCount++;
            const client = await originalConnect();
            const acquireTime = Date.now() - startTime;
            this.metrics.acquireTimes.push(acquireTime);
            return client;
          } catch (error) {
            this.metrics.acquireFailCount++;
            try {
              this.logger.error("Failed to acquire database connection", {
                error,
              });
            } catch (error) {
              // Silently ignore any logger errors
              console.warn("Logger error:", error);
            }
            throw error;
          }
        };
      }

      this.connected = true;
    } catch (error) {
      try {
        this.logger.error("Failed to initialize database connection", {
          error,
        });
      } catch (error) {
        // Silently ignore any logger errors
        console.warn("Logger error:", error);
      }
      throw error;
    }
  }

  /**
   * Check if the database is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }

    try {
      try {
        this.logger.info("Closing database connection");
      } catch (error) {
        // Silently ignore any logger errors
        console.warn("Logger error:", error);
      }

      if (this.pool && typeof this.pool.end === "function") {
        await this.pool.end();
      }

      this.pool = null;
      this.connected = false;
      try {
        this.logger.info("Database connection closed");
      } catch (error) {
        // Silently ignore any logger errors
        console.warn("Logger error:", error);
      }
    } catch (error) {
      try {
        this.logger.error("Error closing database connection", {
          error: error instanceof Error ? error.message : String(error),
        });
      } catch (error) {
        // Silently ignore any logger errors
        console.warn("Logger error:", error);
      }
      throw error;
    }
  }

  /**
   * Get a client from the connection pool
   * @returns A promise that resolves with a database client
   */
  async connect(): Promise<PoolClient> {
    await this.ensureInitialized(true);

    if (!this.pool) {
      throw new Error("Database pool is not initialized");
    }

    try {
      return await this.pool.connect();
    } catch (error) {
      return this.handleError(error, "Failed to acquire client from pool");
    }
  }

  /**
   * Execute a SQL query
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
    options: QueryOptions = {},
  ): Promise<QueryResult<T>> {
    try {
      await this.ensureInitialized();

      // Validate parameters
      this.validateQueryParams(params);

      // Normalize options
      const { maxRetries = 2, tag = this.extractQueryTag(text) } = options;

      // Stats tracking
      const startTime = Date.now();
      let attempt = 0;
      const maxAttempts = maxRetries + 1;

      // Execute query with retries
      while (attempt < maxAttempts) {
        try {
          attempt++;

          // Execute query
          if (!this.pool) {
            throw new DatabaseError("Database pool not initialized");
          }

          const query = { text, values: params };
          const result = await this.pool.query<T>(query);

          // Track successful query
          const queryTime = Date.now() - startTime;
          this.metrics.queryCount++;
          this.metrics.queryTimes.push({ time: queryTime, tag });

          // Track by tag if provided
          if (tag) {
            const tagTimes = this.metrics.taggedQueryTimes.get(tag) || [];
            tagTimes.push(queryTime);
            this.metrics.taggedQueryTimes.set(tag, tagTimes);
          }

          // Trim metrics arrays to prevent memory leaks
          this.trimMetrics();

          return result;
        } catch (error) {
          // Track failed query
          this.metrics.queryFailCount++;

          // Check if we should retry
          const shouldRetry =
            attempt < maxAttempts && this.shouldRetryQuery(error);

          // Log the error
          try {
            if (shouldRetry) {
              this.logger.warn(
                `Database query failed, retrying (${attempt}/${maxRetries})`,
                { error, query: text, params },
              );
            } else {
              this.logger.error("Database query failed", {
                error,
                query: text,
                params,
              });
            }
          } catch (logError) {
            // Ignore logger errors
            console.warn("Logger error:", logError);
          }

          // Throw error if we shouldn't retry
          if (!shouldRetry) {
            throw this.formatError(error, `Query failed: ${text}`);
          }

          // Delay before retrying
          const delay = Math.min(
            100 * Math.pow(1.5, attempt - 1),
            5000, // max 5 seconds
          );
          await this.delay(delay);
        }
      }

      // Throw error at the end - this should be unreachable
      // This return is needed to satisfy TypeScript's control flow analysis
      throw new DatabaseError(
        `Query failed after ${maxAttempts} attempts: ${text}`,
      );
    } catch (error) {
      throw this.formatError(error, `Query failed: ${text}`);
    }
  }

  private shouldRetryQuery(error: unknown): boolean {
    if (error instanceof Error) {
      // Extract error code if available
      const errorCode =
        error instanceof Object && "code" in error
          ? (error as { code: string }).code
          : undefined;

      // Retry on specific PostgreSQL error codes
      if (errorCode) {
        // Common retryable PostgreSQL error codes:
        // 40001: serialization_failure
        // 40P01: deadlock_detected
        // 55P03: lock_not_available
        // 57P01: admin_shutdown
        // 08***: connection errors
        // 57014: query_canceled
        if (
          errorCode === "40001" || // serialization_failure
          errorCode === "40P01" || // deadlock_detected
          errorCode === "55P03" || // lock_not_available
          errorCode === "57P01" || // admin_shutdown
          errorCode === "57014" || // query_canceled
          /^08/.test(errorCode) // connection errors
        ) {
          return true;
        }
      }

      // Retry based on error message patterns - case insensitive to catch all variants
      return /connection|deadlock|timeout|serialize|retry|temporarily unavailable/i.test(
        error.message,
      );
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private formatError(error: unknown, context: string): Error {
    // If it's already a DatabaseError, just return it
    if (error instanceof DatabaseError) {
      return error;
    }

    if (error instanceof Error) {
      // Extract Postgres error code if available
      const pgError = error as {
        code?: string;
        query?: string;
        params?: unknown[];
      };

      return new DatabaseError(`${context}: ${error.message}`, {
        code: pgError.code,
        query: pgError.query,
        params: pgError.params,
      });
    }

    // For non-Error objects
    return new DatabaseError(`${context}: ${String(error)}`);
  }

  private handleError(error: unknown, context: string): never {
    const formattedError = this.formatError(error, context);
    try {
      this.logger.error(context, {
        error: formattedError.message,
      });
    } catch (error) {
      // Silently ignore any logger errors
      console.warn("Logger error:", error);
    }
    throw formattedError;
  }

  /**
   * Execute a function with a database client
   *
   * @param callback Function that takes a client and returns a promise
   * @returns Result of the callback function
   * @throws DatabaseError if client acquisition fails
   */
  async withClient<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    await this.ensureInitialized(true);

    // Get client from pool
    let client: PoolClient | null = null;
    try {
      if (!this.pool) {
        throw new DatabaseError("Database pool not initialized");
      }

      // Acquire client from pool
      const startTime = Date.now();
      try {
        client = await this.pool.connect();
        const acquireTime = Date.now() - startTime;
        this.metrics.acquireCount++;
        this.metrics.acquireTimes.push(acquireTime);
      } catch (error) {
        this.metrics.acquireFailCount++;
        throw this.formatError(error, "Failed to acquire database client");
      }

      // Execute callback with client
      return await callback(client);
    } catch (error) {
      throw this.formatError(error, "Database operation failed");
    } finally {
      // Release client back to pool
      if (client) {
        try {
          client.release();
        } catch (error) {
          this.logger.error("Error releasing client", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  /**
   * Execute a function within a transaction
   *
   * @param callback Function that takes a client and returns a promise
   * @param options Transaction options for retry and isolation level
   * @returns Result of the callback function
   * @throws Error if transaction fails
   */
  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const opts = this.mergeTransactionOptions(options);
    let attemptCount = 0;
    let lastError: Error | unknown;
    let delay = opts.retryDelay;

    // Maximum number of attempts is maxRetries + 1 (the initial attempt)
    while (attemptCount <= opts.maxRetries) {
      try {
        return await this.executeTransaction(callback, opts);
      } catch (error) {
        lastError = error;

        // Don't retry if we've reached the max retries
        if (attemptCount >= opts.maxRetries || !opts.shouldRetry(error)) {
          throw this.formatError(error, "Transaction failed");
        }

        // Log retry attempt
        try {
          this.logger.info(
            `Transaction failed, retrying (${attemptCount + 1}/${
              opts.maxRetries + 1
            })`,
            {
              error: error instanceof Error ? error.message : String(error),
              errorCode:
                error instanceof Object && "code" in error
                  ? (error as { code: string }).code
                  : undefined,
              attemptCount,
              maxRetries: opts.maxRetries,
            },
          );
        } catch (logError) {
          // Silently ignore any logger errors
          console.warn("Logger error:", logError);
        }

        // Increase retry delay using exponential backoff
        await this.delay(delay);
        delay = Math.min(delay * opts.retryDelayMultiplier, opts.maxRetryDelay);
        attemptCount++;
      }
    }

    // This should never be reached, but TypeScript needs it
    throw this.formatError(
      lastError || new Error("Transaction failed after all retries"),
      "Transaction failed",
    );
  }

  /**
   * Execute a single transaction attempt
   *
   * @param callback Function that takes a client and returns a promise
   * @param options Transaction options
   * @returns Result of the callback function
   * @throws Error if transaction fails
   */
  private async executeTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options: Required<TransactionOptions>,
  ): Promise<T> {
    return this.withClient(async (client) => {
      try {
        // Set statement timeout if specified
        if (options.timeout > 0) {
          await client.query(`SET statement_timeout = ${options.timeout}`);
        }

        // Begin transaction with isolation level
        let beginCommand = "BEGIN";
        if (options.isolationLevel) {
          beginCommand += ` ISOLATION LEVEL ${options.isolationLevel}`;
        }
        await client.query(beginCommand);

        // Execute callback
        const result = await Promise.race([
          callback(client),
          // Set a timeout if specified
          ...(options.timeout > 0
            ? [
                new Promise<never>((_, reject) =>
                  setTimeout(
                    () => reject(new DatabaseError("Transaction timeout")),
                    options.timeout,
                  ),
                ),
              ]
            : []),
        ]);

        // Commit transaction
        await client.query("COMMIT");
        return result;
      } catch (error) {
        // Rollback transaction
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          this.logger.error("Rollback failed", {
            error: rollbackError,
            originalError: error,
          });
        }
        throw error;
      } finally {
        // Reset statement timeout
        if (options.timeout > 0) {
          try {
            await client.query("SET statement_timeout TO DEFAULT");
          } catch (_error) {
            // Ignore errors on cleanup
          }
        }
      }
    });
  }

  /**
   * Get database connection statistics
   *
   * @param reset Whether to reset statistics after getting them
   * @returns Connection statistics
   */
  getStats(reset: boolean = false): ConnectionStats {
    // Get current pool statistics
    const poolStats = {
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
      activeCount: 0,
    };

    // Get stats from pool if available
    if (this.pool) {
      const metrics = this.pool as unknown as PoolMetrics;
      poolStats.totalCount = metrics.totalCount || 0;
      poolStats.idleCount = metrics.idleCount || 0;
      poolStats.waitingCount = metrics.waitingCount || 0;
      poolStats.activeCount = metrics.activeCount || 0;
    }

    // Calculate averages
    const avgAcquireTime = this.metrics.acquireTimes.length
      ? this.calculateAverage(this.metrics.acquireTimes)
      : undefined;

    const maxAcquireTime = this.metrics.acquireTimes.length
      ? this.calculateMax(this.metrics.acquireTimes)
      : undefined;

    // Calculate average query time across all queries
    const queryTimes = this.metrics.queryTimes.map((item) => item.time);
    const avgQueryTime = queryTimes.length
      ? this.calculateAverage(queryTimes)
      : undefined;

    const maxQueryTime = queryTimes.length
      ? this.calculateMax(queryTimes)
      : undefined;

    // Calculate tagged query times
    const tagStats: Record<string, { avg: number; count: number }> = {};
    this.metrics.taggedQueryTimes.forEach((times, tag) => {
      tagStats[tag] = {
        avg: this.calculateAverage(times),
        count: times.length,
      };
    });

    // Build statistics object
    const stats: ConnectionStats = {
      totalCount: poolStats.totalCount,
      idleCount: poolStats.idleCount,
      activeCount: poolStats.activeCount,
      waitingCount: poolStats.waitingCount,
      utilization: this.databaseConfig.maxConnections
        ? poolStats.activeCount / this.databaseConfig.maxConnections
        : 0,
      maxConnections: this.databaseConfig.maxConnections,
      acquireCount: this.metrics.acquireCount,
      acquireFailCount: this.metrics.acquireFailCount,
      avgAcquireTime,
      maxAcquireTime,
      queryCount: this.metrics.queryCount,
      queryFailCount: this.metrics.queryFailCount,
      avgQueryTime,
      maxQueryTime,
    };

    // Reset metrics if requested
    if (reset) {
      this.resetMetrics();
    }

    return stats;
  }

  /**
   * Reset metrics tracking
   */
  resetMetrics(): void {
    this.metrics = {
      acquireCount: 0,
      acquireFailCount: 0,
      acquireTimes: [],
      queryCount: 0,
      queryFailCount: 0,
      queryTimes: [],
      taggedQueryTimes: new Map(),
    };
  }

  /**
   * Trim metrics arrays to prevent memory leaks
   */
  private trimMetrics(): void {
    // Trim query times array if it's too long
    if (
      this.metrics.queryTimes.length > this.databaseConfig.metricsMaxSamples
    ) {
      this.metrics.queryTimes = this.metrics.queryTimes.slice(
        -this.databaseConfig.metricsMaxSamples,
      );
    }

    // Trim acquire times array if it's too long
    if (
      this.metrics.acquireTimes.length > this.databaseConfig.metricsMaxSamples
    ) {
      this.metrics.acquireTimes = this.metrics.acquireTimes.slice(
        -this.databaseConfig.metricsMaxSamples,
      );
    }

    // Trim tagged query times
    this.metrics.taggedQueryTimes.forEach((times, tag) => {
      if (times.length > this.databaseConfig.metricsMaxSamples) {
        this.metrics.taggedQueryTimes.set(
          tag,
          times.slice(-this.databaseConfig.metricsMaxSamples),
        );
      }
    });
  }

  /**
   * Reset the database connection
   * This is primarily used for testing
   */
  async reset(): Promise<void> {
    try {
      try {
        this.logger.info("Resetting database connection");
      } catch (error) {
        // Silently ignore any logger errors
        console.warn("Logger error:", error);
      }
      this.resetMetrics();
      await this.close();
      await this.initialize();
      try {
        this.logger.info("Database connection reset");
      } catch (error) {
        // Silently ignore any logger errors
        console.warn("Logger error:", error);
      }
    } catch (error) {
      try {
        this.logger.error("Error resetting database connection", {
          error: error instanceof Error ? error.message : String(error),
        });
      } catch (error) {
        // Silently ignore any logger errors
        console.warn("Logger error:", error);
      }
      throw error;
    }
  }

  /**
   * Ensure the database is initialized
   */
  private async ensureInitialized(skipConnectionTest = true): Promise<void> {
    if (!this.pool) {
      await this.initialize(skipConnectionTest);
    }
  }

  /**
   * Calculate average from an array of numbers
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / values.length);
  }

  /**
   * Calculate maximum from an array of numbers
   */
  private calculateMax(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.max(...values);
  }

  /**
   * Merge provided transaction options with defaults
   */
  private mergeTransactionOptions(
    options?: TransactionOptions,
  ): Required<TransactionOptions> {
    if (!options) return DEFAULT_TRANSACTION_OPTIONS;

    return {
      ...DEFAULT_TRANSACTION_OPTIONS,
      ...options,
    };
  }

  /**
   * Extract a meaningful tag from a SQL query if not provided
   */
  private extractQueryTag(sql: string): string | undefined {
    // Extract the first few words to create a tag
    const match = sql
      .trim()
      .match(
        /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\s+(?:INTO|FROM|TABLE)?\s+(?:IF\s+EXISTS\s+)?(?:([a-zA-Z0-9_"]+)\.)?([a-zA-Z0-9_"]+)/i,
      );

    if (match) {
      const [, action, schema, table] = match;
      if (table) {
        return `${action.toUpperCase()}-${schema ? `${schema}.` : ""}${table}`;
      }
    }

    return undefined;
  }

  /**
   * Creates a query builder for the specified table
   * @param tableName Table name
   * @returns Query builder
   */
  createQueryBuilder(tableName: string): QueryBuilder {
    return new QueryBuilderImpl(tableName, this);
  }

  /**
   * Validates query parameters to catch common errors
   * @param params Parameters to validate
   * @throws Error if parameters are invalid
   */
  private validateQueryParams(params: unknown[]): void {
    if (!Array.isArray(params)) {
      throw new TypeError(
        `Query parameters must be an array, got ${typeof params}`,
      );
    }

    // Check for undefined values which cause issues with PostgreSQL
    for (let i = 0; i < params.length; i++) {
      if (params[i] === undefined) {
        throw new TypeError(
          `Query parameter at index ${i} is undefined. Use null for NULL values in SQL.`,
        );
      }
    }

    // Null is usually valid in SQL, so we allow it
  }
}

/**
 * Implementation of the QueryBuilder interface for constructing SQL queries
 */
class QueryBuilderImpl implements QueryBuilder {
  private table: string;
  private db: DatabaseServer;
  private selectCols: string[] = ["*"];
  private whereClauses: { condition: string; params: unknown[] }[] = [];
  private joinClauses: string[] = [];
  private groupByCols: string[] = [];
  private orderByClauses: string[] = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(tableName: string, db: DatabaseServer) {
    this.table = tableName;
    this.db = db;
  }

  /**
   * Specify columns to select
   * @param columns Columns to select
   */
  select(columns: string | string[]): QueryBuilder {
    this.selectCols = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  /**
   * Add a WHERE condition to the query
   * @param condition The SQL condition
   * @param params Parameters for the condition
   */
  where(condition: string, ...params: unknown[]): QueryBuilder {
    // Replace ? placeholders with $1, $2, etc. to match PostgreSQL parameter format
    const parsedCondition = condition.replace(/\?/g, (_match, index) => {
      return `$${index + 1}`;
    });
    this.whereClauses.push({ condition: parsedCondition, params });
    return this;
  }

  /**
   * Add a JOIN clause to the query
   * @param table The table to join
   * @param condition The join condition
   */
  join(table: string, condition: string): QueryBuilder {
    this.joinClauses.push(`JOIN ${table} ON ${condition}`);
    return this;
  }

  /**
   * Add a LEFT JOIN clause to the query
   * @param table The table to join
   * @param condition The join condition
   */
  leftJoin(table: string, condition: string): QueryBuilder {
    this.joinClauses.push(`LEFT JOIN ${table} ON ${condition}`);
    return this;
  }

  /**
   * Add a GROUP BY clause to the query
   * @param columns Columns to group by
   */
  groupBy(columns: string | string[]): QueryBuilder {
    this.groupByCols = this.groupByCols.concat(
      Array.isArray(columns) ? columns : [columns],
    );
    return this;
  }

  /**
   * Add an ORDER BY clause to the query
   * @param column Column to order by
   * @param direction Sort direction
   */
  orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): QueryBuilder {
    this.orderByClauses.push(`${column} ${direction}`);
    return this;
  }

  /**
   * Set a LIMIT on the query
   * @param limit Maximum number of rows to return
   */
  limit(limit: number): QueryBuilder {
    this.limitValue = limit;
    return this;
  }

  /**
   * Set an OFFSET on the query
   * @param offset Number of rows to skip
   */
  offset(offset: number): QueryBuilder {
    this.offsetValue = offset;
    return this;
  }

  /**
   * Execute the SELECT query
   * @param options Query options
   */
  async execute<T extends QueryResultRow = QueryResultRow>(
    options: QueryOptions = {},
  ): Promise<QueryResult<T>> {
    const { sql, params } = this.buildQuery();
    return this.db.query<T>(sql, params, options);
  }

  /**
   * Execute the query and return the first result
   * @param options Query options
   */
  async getOne<T extends QueryResultRow = QueryResultRow>(
    options: QueryOptions = {},
  ): Promise<T | null> {
    const result = await this.limit(1).execute<T>(options);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Execute the query and return all results
   * @param options Query options
   */
  async getMany<T extends QueryResultRow = QueryResultRow>(
    options: QueryOptions = {},
  ): Promise<T[]> {
    const result = await this.execute<T>(options);
    return result.rows;
  }

  /**
   * Count the number of rows matching the query
   * @param options Query options
   */
  async count(options: QueryOptions = {}): Promise<number> {
    // Save current select columns and then override
    const originalSelect = [...this.selectCols];
    this.selectCols = ["COUNT(*) as count"];

    // Remove order by, limit and offset for count queries
    const originalOrderBy = [...this.orderByClauses];
    const originalLimit = this.limitValue;
    const originalOffset = this.offsetValue;
    this.orderByClauses = [];
    this.limitValue = undefined;
    this.offsetValue = undefined;

    try {
      const { sql, params } = this.buildQuery();
      const result = await this.db.query<{ count: string }>(
        sql,
        params,
        options,
      );
      return parseInt(result.rows[0]?.count || "0", 10);
    } finally {
      // Restore original query parts
      this.selectCols = originalSelect;
      this.orderByClauses = originalOrderBy;
      this.limitValue = originalLimit;
      this.offsetValue = originalOffset;
    }
  }

  /**
   * Build the SQL query and parameters
   * @returns The SQL query and parameters
   */
  buildQuery(): { sql: string; params: unknown[] } {
    const parts: string[] = [];
    let allParams: unknown[] = [];
    let paramCounter = 1;

    // SELECT clause
    parts.push(`SELECT ${this.selectCols.join(", ")}`);

    // FROM clause
    parts.push(`FROM ${this.table}`);

    // JOIN clauses
    if (this.joinClauses.length > 0) {
      parts.push(this.joinClauses.join(" "));
    }

    // WHERE clauses
    if (this.whereClauses.length > 0) {
      const whereConditions = this.whereClauses.map(({ condition, params }) => {
        // Add params to the all params array
        allParams = allParams.concat(params);

        // Update the condition to use the correct parameter index
        const updatedCondition = condition.replace(
          /\$\d+/g,
          () => `$${paramCounter++}`,
        );
        return updatedCondition;
      });
      parts.push(`WHERE ${whereConditions.join(" AND ")}`);
    }

    // GROUP BY
    if (this.groupByCols.length > 0) {
      parts.push(`GROUP BY ${this.groupByCols.join(", ")}`);
    }

    // ORDER BY
    if (this.orderByClauses.length > 0) {
      parts.push(`ORDER BY ${this.orderByClauses.join(", ")}`);
    }

    // LIMIT
    if (this.limitValue !== undefined) {
      parts.push(`LIMIT ${this.limitValue}`);
    }

    // OFFSET
    if (this.offsetValue !== undefined) {
      parts.push(`OFFSET ${this.offsetValue}`);
    }

    const sql = parts.join(" ");
    return { sql, params: allParams };
  }

  /**
   * Get the SQL for this query
   */
  getSql(): string {
    return this.buildQuery().sql;
  }
}

// Add a DatabaseError class for improved error handling
export class DatabaseError extends Error {
  code?: string;
  query?: string;
  params?: unknown[];

  constructor(
    message: string,
    options?: { code?: string; query?: string; params?: unknown[] },
  ) {
    super(message);
    this.name = "DatabaseError";
    if (options) {
      this.code = options.code;
      this.query = options.query;
      this.params = options.params;
    }
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}
