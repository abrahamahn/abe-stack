import { injectable, inject } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

import type {
  DbClient,
  DbQueryResult,
  IDatabaseServer,
} from "./IDatabaseServer";

export type TransactionCallback<T> = (client: DbClient) => Promise<T>;

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
 * TransactionService provides methods for executing database operations within transactions
 * with proper error handling and connection management.
 */
@injectable()
export class TransactionService {
  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.DatabaseService) private databaseServer: IDatabaseServer,
  ) {}

  /**
   * Execute a callback within a transaction with configurable options
   *
   * @param callback Function to execute within the transaction
   * @param options Transaction configuration options
   * @returns Result of the callback
   * @throws Error if transaction fails
   */
  async execute<T>(
    callback: TransactionCallback<T>,
    options: TransactionOptions = {},
  ): Promise<T> {
    return this.databaseServer.withTransaction(async (client) => {
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
      }
    });
  }

  /**
   * Execute multiple operations within a single transaction
   *
   * @param operations Array of operations to perform
   * @param options Transaction configuration options
   * @returns Array of results from each operation
   * @throws Error if any operation fails
   */
  async multiOperationTransaction<T>(
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
  async readTransaction<T>(
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
  async executeBatch(
    queries: Array<{ text: string; values?: unknown[] }>,
    options: TransactionOptions = {},
  ): Promise<DbQueryResult[]> {
    return this.execute(async (client) => {
      const results: DbQueryResult[] = [];

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
  async createSavepoint(client: DbClient, name: string): Promise<void> {
    await client.query(`SAVEPOINT ${name}`);
  }

  /**
   * Rollback to a savepoint within a transaction
   *
   * @param client Active transaction client
   * @param name Savepoint name
   */
  async rollbackToSavepoint(client: DbClient, name: string): Promise<void> {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }

  /**
   * Release a savepoint within a transaction
   *
   * @param client Active transaction client
   * @param name Savepoint name
   */
  async releaseSavepoint(client: DbClient, name: string): Promise<void> {
    await client.query(`RELEASE SAVEPOINT ${name}`);
  }

  /**
   * Simple wrapper for executing a function within a transaction
   * @param operation Function to execute within transaction
   * @returns Result of the operation
   */
  async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
    return this.databaseServer.withTransaction(operation);
  }
}
