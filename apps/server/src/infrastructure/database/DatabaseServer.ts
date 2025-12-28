import { injectable, inject } from "inversify";
import postgres, { type Sql } from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { DatabaseConfigProvider } from "@/server/infrastructure/config/domain/DatabaseConfig";
import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

import {
  IDatabaseServer,
  ConnectionStats,
  QueryOptions,
  TransactionOptions,
  QueryBuilder,
  DbClient,
  DbQueryResult,
  DbQueryResultRow,
} from "./IDatabaseServer";

type PoolMetrics = {
  totalCount?: number;
  idleCount?: number;
  waitingCount?: number;
  activeCount?: number;
};

const DEFAULT_TRANSACTION_OPTIONS: Required<TransactionOptions> = {
  maxRetries: 0,
  retryDelay: 100,
  retryDelayMultiplier: 1.5,
  maxRetryDelay: 5000,
  isolationLevel: "READ COMMITTED",
  timeout: 0,
  shouldRetry: (error: unknown): boolean => {
    if (error instanceof Error) {
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
      return /deadlock|serialize|timeout|connection|retry|temporarily unavailable/i.test(
        error.message
      );
    }
    return false;
  },
};

@injectable()
export class DatabaseServer implements IDatabaseServer {
  private sql: Sql | null = null;
  private connected = false;
  private logger: ReturnType<ILoggerService["createLogger"]>;
  private databaseConfig: ReturnType<DatabaseConfigProvider["getConfig"]>;

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
    @inject(TYPES.DatabaseConfig) configProvider: DatabaseConfigProvider
  ) {
    this.logger = loggerService.createLogger("DatabaseServer");
    this.databaseConfig = configProvider.getConfig();
  }

  async initialize(skipConnectionTest = false): Promise<void> {
    if (this.sql) return;

    try {
      this.logger.info("Initializing database connection", {
        host: this.databaseConfig.host,
        port: this.databaseConfig.port,
        database: this.databaseConfig.database,
        user: this.databaseConfig.user,
      });
    } catch {
      // ignore logger errors
    }

    try {
      this.sql = postgres({
        host: this.databaseConfig.host,
        port: this.databaseConfig.port,
        database: this.databaseConfig.database,
        username: this.databaseConfig.user,
        password: this.databaseConfig.password,
        max: this.databaseConfig.maxConnections,
        idle_timeout: this.databaseConfig.idleTimeout,
        connect_timeout: this.databaseConfig.connectionTimeout,
        ssl: this.databaseConfig.ssl,
      });

      // initialize drizzle to keep parity with prior intent
      drizzle(this.sql);

      if (!skipConnectionTest) {
        await this.sql`select 1`;
        try {
          this.logger.info("Database connection successful");
        } catch {
          // ignore logger errors
        }
      }

      this.connected = true;
    } catch (error) {
      try {
        this.logger.error("Failed to initialize database connection", { error });
      } catch {
        // ignore logger errors
      }
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async close(): Promise<void> {
    if (!this.sql) return;
    try {
      this.logger.info("Closing database connection");
    } catch {
      // ignore logger errors
    }

    try {
      await this.sql.end({ timeout: 1 });
    } catch (error) {
      try {
        this.logger.error("Error closing database connection", {
          error: error instanceof Error ? error.message : String(error),
        });
      } catch {
        // ignore
      }
      throw error;
    } finally {
      this.sql = null;
      this.connected = false;
    }
  }

  async connect(): Promise<DbClient> {
    await this.ensureInitialized(true);
    if (!this.sql) {
      throw new Error("Database client is not initialized");
    }

    const client: DbClient = {
      query: async <T = DbQueryResultRow>(text: string, params?: unknown[]) => {
        const rows = await this.sql!.unsafe(text, params);
        return { rows: rows as T[], rowCount: (rows as unknown[]).length };
      },
    };

    return client;
  }

  async query<T extends DbQueryResultRow = DbQueryResultRow>(
    text: string,
    params: unknown[] = [],
    options: QueryOptions = {}
  ): Promise<DbQueryResult<T>> {
    try {
      await this.ensureInitialized();
      const { maxRetries = 2, tag = this.extractQueryTag(text) } = options;
      const startTime = Date.now();
      let attempt = 0;
      const maxAttempts = maxRetries + 1;

      while (attempt < maxAttempts) {
        try {
          attempt++;
          if (!this.sql) throw new DatabaseError("Database client not initialized");

          const queryPromise = this.sql.unsafe(text, params) as Promise<
            T[] & { count?: number }
          >;
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(
                new DatabaseError(
                  `Query timeout after ${this.databaseConfig.statementTimeout}ms: ${text.substring(0, 100)}...`
                )
              );
            }, this.databaseConfig.statementTimeout);
          });

          const rows = await Promise.race([queryPromise, timeoutPromise]);

          const queryTime = Date.now() - startTime;
          this.metrics.queryCount++;
          this.metrics.queryTimes.push({ time: queryTime, tag });
          if (tag) {
            const tagTimes = this.metrics.taggedQueryTimes.get(tag) || [];
            tagTimes.push(queryTime);
            this.metrics.taggedQueryTimes.set(tag, tagTimes);
          }
          this.trimMetrics();

          return { rows, rowCount: (rows as unknown[]).length };
        } catch (error) {
          this.metrics.queryFailCount++;
          const shouldRetry = attempt < maxAttempts && this.shouldRetryQuery(error);

          try {
            if (shouldRetry) {
              this.logger.warn(
                `Database query failed, retrying (${attempt}/${maxRetries})`,
                { error, query: text, params }
              );
            } else {
              this.logger.error("Database query failed", { error, query: text, params });
            }
          } catch {
            // ignore logger errors
          }

          if (!shouldRetry) {
            throw this.formatError(error, `Query failed: ${text}`);
          }

          const delay = Math.min(100 * Math.pow(1.5, attempt - 1), 5000);
          await this.delay(delay);
        }
      }

      throw new DatabaseError(`Query failed after ${maxAttempts} attempts: ${text}`);
    } catch (error) {
      throw this.formatError(error, `Query failed: ${text}`);
    }
  }

  async withClient<T>(callback: (client: DbClient) => Promise<T>): Promise<T> {
    const client = await this.connect();
    try {
      return await callback(client);
    } finally {
      // postgres-js doesn't require explicit release per query client
    }
  }

  async withTransaction<T>(
    callback: (client: DbClient) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    if (!this.sql) throw new DatabaseError("Database client not initialized");
    const {
      maxRetries = DEFAULT_TRANSACTION_OPTIONS.maxRetries,
      retryDelay = DEFAULT_TRANSACTION_OPTIONS.retryDelay,
      retryDelayMultiplier = DEFAULT_TRANSACTION_OPTIONS.retryDelayMultiplier,
      maxRetryDelay = DEFAULT_TRANSACTION_OPTIONS.maxRetryDelay,
      isolationLevel = DEFAULT_TRANSACTION_OPTIONS.isolationLevel,
      timeout = DEFAULT_TRANSACTION_OPTIONS.timeout,
      shouldRetry = DEFAULT_TRANSACTION_OPTIONS.shouldRetry,
    } = options;

    let attempt = 0;
    const maxAttempts = maxRetries + 1;

    while (attempt < maxAttempts) {
      const txStart = Date.now();
      try {
        attempt++;
        await this.sql.unsafe("BEGIN");

        if (isolationLevel) {
          await this.sql.unsafe(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
        }
        if (timeout > 0) {
          await this.sql.unsafe(`SET LOCAL statement_timeout = ${timeout}`);
        }

        const result = await callback({
          query: async <T = DbQueryResultRow>(text: string, params?: unknown[]) => {
            const rows = await this.sql!.unsafe(text, params);
            return { rows: rows as T[], rowCount: (rows as unknown[]).length };
          },
        });

        await this.sql.unsafe("COMMIT");

        try {
          this.logger.info("Transaction completed", {
            durationMs: Date.now() - txStart,
          });
        } catch {
          // ignore
        }

        return result;
      } catch (error) {
        try {
          await this.sql.unsafe("ROLLBACK");
        } catch {
          // ignore rollback error
        }

        const canRetry = attempt < maxAttempts && shouldRetry(error);
        if (!canRetry) {
          throw this.formatError(error, "Transaction failed");
        }

        const delayMs = Math.min(
          retryDelay * Math.pow(retryDelayMultiplier, attempt - 1),
          maxRetryDelay
        );
        await this.delay(delayMs);
      }
    }

    throw new DatabaseError("Transaction failed after retries");
  }

  async getStats(reset = false): Promise<ConnectionStats> {
    const poolMetrics: PoolMetrics = {
      totalCount: this.metrics.acquireCount,
      idleCount: 0,
      waitingCount: 0,
      activeCount: this.metrics.queryCount,
    };

    const stats: ConnectionStats = {
      totalCount: poolMetrics.totalCount || 0,
      idleCount: poolMetrics.idleCount || 0,
      activeCount: poolMetrics.activeCount || 0,
      waitingCount: poolMetrics.waitingCount || 0,
      maxConnections: this.databaseConfig.maxConnections,
      utilization:
        this.databaseConfig.maxConnections > 0
          ? (poolMetrics.activeCount || 0) / this.databaseConfig.maxConnections
          : 0,
      acquireCount: this.metrics.acquireCount,
      acquireFailCount: this.metrics.acquireFailCount,
      avgAcquireTime:
        this.metrics.acquireTimes.length > 0
          ? this.metrics.acquireTimes.reduce((a, b) => a + b, 0) /
            this.metrics.acquireTimes.length
          : undefined,
      maxAcquireTime: this.metrics.acquireTimes.length
        ? Math.max(...this.metrics.acquireTimes)
        : undefined,
      queryCount: this.metrics.queryCount,
      queryFailCount: this.metrics.queryFailCount,
      avgQueryTime:
        this.metrics.queryTimes.length > 0
          ? this.metrics.queryTimes.reduce((a, b) => a + b.time, 0) /
            this.metrics.queryTimes.length
          : undefined,
      maxQueryTime: this.metrics.queryTimes.length
        ? Math.max(...this.metrics.queryTimes.map((t) => t.time))
        : undefined,
    };

    if (reset) {
      this.resetMetrics();
    }

    return stats;
  }

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

  async reset(): Promise<void> {
    await this.close();
    this.resetMetrics();
    await this.initialize(true);
  }

  createQueryBuilder(_tableName: string): QueryBuilder {
    throw new Error("QueryBuilder not implemented for drizzle/postgres-js yet.");
  }

  private async ensureInitialized(skipConnectionTest = false): Promise<void> {
    if (!this.sql) {
      await this.initialize(skipConnectionTest);
    }
  }

  private shouldRetryQuery(error: unknown): boolean {
    return DEFAULT_TRANSACTION_OPTIONS.shouldRetry(error);
  }

  private extractQueryTag(text: string): string | undefined {
    const match = text.match(/--\s*tag:\s*([a-zA-Z0-9_-]+)/);
    return match ? match[1] : undefined;
  }

  private trimMetrics(): void {
    const maxLength = 1000;
    if (this.metrics.acquireTimes.length > maxLength) {
      this.metrics.acquireTimes = this.metrics.acquireTimes.slice(-maxLength);
    }
    if (this.metrics.queryTimes.length > maxLength) {
      this.metrics.queryTimes = this.metrics.queryTimes.slice(-maxLength);
    }
    for (const [key, value] of this.metrics.taggedQueryTimes.entries()) {
      if (value.length > maxLength) {
        this.metrics.taggedQueryTimes.set(key, value.slice(-maxLength));
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private formatError(error: unknown, message: string): Error {
    if (error instanceof Error) {
      return new DatabaseError(`${message}: ${error.message}`);
    }
    return new DatabaseError(`${message}: ${String(error)}`);
  }
}

export class DatabaseError extends Error {}
