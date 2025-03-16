// src/server/database/transactionManager.ts
import { PoolClient } from 'pg';

import { DatabaseConnectionManager } from './config';

export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

export class TransactionManager {
  /**
   * Execute a callback within a transaction
   * @param callback Function to execute within the transaction
   * @returns Result of the callback
   */
  static async execute<T>(callback: TransactionCallback<T>): Promise<T> {
    const client = await DatabaseConnectionManager.getPool().connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple operations within a single transaction
   * @param operations Array of operations to perform
   * @returns Array of results from each operation
   */
  static async multiOperationTransaction<T>(
    operations: Array<TransactionCallback<T>>
  ): Promise<T[]> {
    return this.execute(async (client) => {
      const results: T[] = [];
      for (const operation of operations) {
        results.push(await operation(client));
      }
      return results;
    });
  }

  /**
   * Execute a read-only transaction
   * @param callback Function to execute within the transaction
   * @returns Result of the callback
   */
  static async readTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    const client = await DatabaseConnectionManager.getPool().connect();
    
    try {
      await client.query('BEGIN TRANSACTION READ ONLY');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default TransactionManager;