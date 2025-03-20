// src/database/transactionManager.ts
import { Pool, PoolClient, QueryResult } from "pg";

import { DatabaseConnectionManager } from "@database/config";

import { Logger } from "../../services/dev/logger/LoggerService";

export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

export enum IsolationLevel {
  READ_UNCOMMITTED = "READ UNCOMMITTED",
  READ_COMMITTED = "READ COMMITTED",
  REPEATABLE_READ = "REPEATABLE READ",
  SERIALIZABLE = "SERIALIZABLE",
}

export interface TransactionOptions {
  isolation?: IsolationLevel;
  readOnly?: boolean;
  deferrable?: boolean;
  timeout?: number; // in milliseconds
}

/**
 * TransactionManager provides methods for executing database operations within transactions
 * with proper error handling and connection management.
 */
export class TransactionManager {
  private static logger = new Logger("TransactionManager");

  /**
   * Execute a callback within a transaction with configurable options
   *
   * @param callback Function to execute within the transaction
   * @param options Transaction configuration options
   * @returns Result of the callback
   * @throws Error if transaction fails
   */
  static async execute<T>(
    callback: TransactionCallback<T>,
    options: TransactionOptions = {},
  ): Promise<T> {
    const pool = DatabaseConnectionManager.getPool();
    if (!(pool instanceof Pool)) {
      this.logger.warn(
        "Not using a real PostgreSQL pool - transaction support is limited",
      );
      return callback(pool as unknown as PoolClient);
    }

    const client = await pool.connect();

    try {
      // Set statement timeout if specified
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
      }

      // Start transaction with appropriate isolation level
      let beginStatement = "BEGIN";

      if (options.isolation) {
        beginStatement += ` ISOLATION LEVEL ${options.isolation}`;
      }

      if (options.readOnly) {
        beginStatement += " READ ONLY";
      }

      if (
        options.deferrable &&
        options.isolation === IsolationLevel.SERIALIZABLE
      ) {
        beginStatement += " DEFERRABLE";
      }

      await client.query(beginStatement);

      // Execute the callback within the transaction
      const result = await callback(client);
      await client.query("COMMIT");

      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
        this.logger.error("Transaction rolled back due to error", { error });
      } catch (rollbackError) {
        this.logger.error("Failed to rollback transaction", {
          originalError: error,
          rollbackError,
        });
      }

      throw error;
    } finally {
      // Reset statement timeout to default if it was changed
      if (options.timeout) {
        try {
          await client.query("SET statement_timeout TO DEFAULT");
        } catch (error) {
          this.logger.warn("Failed to reset statement timeout", { error });
        }
      }

      client.release();
    }
  }

  /**
   * Execute multiple operations within a single transaction
   *
   * @param operations Array of operations to perform
   * @param options Transaction configuration options
   * @returns Array of results from each operation
   * @throws Error if any operation fails
   */
  static async multiOperationTransaction<T>(
    operations: Array<TransactionCallback<T>>,
    options: TransactionOptions = {},
  ): Promise<T[]> {
    return this.execute(async (client) => {
      const results: T[] = [];

      for (const operation of operations) {
        try {
          results.push(await operation(client));
        } catch (error) {
          this.logger.error(
            "Operation failed within multi-operation transaction",
            { error },
          );
          throw error;
        }
      }

      return results;
    }, options);
  }

  /**
   * Execute a read-only transaction
   *
   * @param callback Function to execute within the transaction
   * @param isolation Optional isolation level
   * @returns Result of the callback
   * @throws Error if transaction fails
   */
  static async readTransaction<T>(
    callback: TransactionCallback<T>,
    isolation: IsolationLevel = IsolationLevel.READ_COMMITTED,
  ): Promise<T> {
    return this.execute(callback, {
      isolation,
      readOnly: true,
    });
  }

  /**
   * Execute a batch of SQL queries within a transaction
   *
   * @param queries Array of SQL queries to execute
   * @param options Transaction configuration options
   * @returns Array of query results
   * @throws Error if any query fails
   */
  static async executeBatch(
    queries: Array<{ text: string; values?: unknown[] }>,
    options: TransactionOptions = {},
  ): Promise<QueryResult[]> {
    return this.execute(async (client) => {
      const results: QueryResult[] = [];

      for (const query of queries) {
        const result = await client.query(query.text, query.values);
        results.push(result);
      }

      return results;
    }, options);
  }

  /**
   * Create a savepoint within a transaction
   *
   * @param client Active transaction client
   * @param name Savepoint name
   */
  static async createSavepoint(
    client: PoolClient,
    name: string,
  ): Promise<void> {
    await client.query(`SAVEPOINT ${name}`);
  }

  /**
   * Rollback to a savepoint within a transaction
   *
   * @param client Active transaction client
   * @param name Savepoint name
   */
  static async rollbackToSavepoint(
    client: PoolClient,
    name: string,
  ): Promise<void> {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }

  /**
   * Release a savepoint within a transaction
   *
   * @param client Active transaction client
   * @param name Savepoint name
   */
  static async releaseSavepoint(
    client: PoolClient,
    name: string,
  ): Promise<void> {
    await client.query(`RELEASE SAVEPOINT ${name}`);
  }
}

export default TransactionManager;
