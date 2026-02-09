// src/server/engine/src/queue/writer.ts
/**
 * Write Service
 *
 * Unified write pattern with automatic pubsub publishing.
 * Adopted from Chet-stack's transaction-aware write system.
 *
 * Features:
 * - Atomic transactions with optimistic locking
 * - Automatic version bumping
 * - PubSub integration (publishes after commit)
 * - Extensible hooks for validation and side effects
 */

import { escapeIdentifier, withTransaction } from '@abe-stack/db';
import { SubKeys } from '@abe-stack/shared';

import type {
  AfterWriteHook,
  BeforeValidateHook,
  OperationResult,
  WriteBatch,
  WriteContext,
  WriteError,
  WriteHooks,
  WriteOperation,
  WriteResult,
} from './types';
import type { DbClient } from '@abe-stack/db';
import type { SubscriptionManager } from '@abe-stack/shared';

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Minimal logger interface for write service.
 * Compatible with any structured logger (Fastify, Pino, etc.)
 */
interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string | Error, data?: Record<string, unknown>): void;
}

// ============================================================================
// Write Service
// ============================================================================

export interface WriteServiceOptions {
  db: DbClient;
  pubsub?: SubscriptionManager;
  log?: Logger;
  hooks?: WriteHooks;
}

export class WriteService {
  private readonly db: DbClient;
  private readonly pubsub?: SubscriptionManager;
  private readonly log?: Logger;
  private readonly hooks: WriteHooks;
  private pendingPublish: NodeJS.Immediate | null = null;

  constructor(options: WriteServiceOptions) {
    this.db = options.db;
    if (options.pubsub !== undefined) {
      this.pubsub = options.pubsub;
    }
    if (options.log !== undefined) {
      this.log = options.log;
    }
    this.hooks = options.hooks ?? {};
  }

  /**
   * Release pending setImmediate handles for graceful shutdown.
   * Call this in the application's stop() method to prevent orphaned callbacks.
   */
  close(): void {
    if (this.pendingPublish !== null) {
      clearImmediate(this.pendingPublish);
      this.pendingPublish = null;
    }
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Execute a batch of write operations atomically
   */
  async write<T = unknown>(batch: WriteBatch): Promise<WriteResult<T>> {
    const ctx: WriteContext = {
      txId: batch.txId,
      authorId: batch.authorId,
      timestamp: new Date(),
    };

    this.log?.debug(`Write batch started: ${batch.txId}`, {
      authorId: batch.authorId,
      operationCount: batch.operations.length,
    });

    try {
      // Execute all operations in a transaction
      const results = await withTransaction(this.db, async (tx) => {
        const opResults: OperationResult<T>[] = [];

        for (let i = 0; i < batch.operations.length; i++) {
          let operation = batch.operations[i] as WriteOperation<T>;

          // Run beforeValidate hooks
          for (const hook of this.hooks.beforeValidate ?? []) {
            operation = await (hook as BeforeValidateHook<T>)(operation, ctx);
          }

          // Execute operation
          const result = await this.executeOperation(tx, operation, ctx);
          opResults.push(result);
        }

        return opResults;
      });

      // Publish updates via PubSub (after transaction commit)
      this.publishResults(results, ctx);

      // Run afterWrite hooks (non-blocking)
      void this.runAfterWriteHooks(results, ctx);

      this.log?.debug(`Write batch completed: ${batch.txId}`, {
        successCount: results.length,
      });

      return {
        txId: batch.txId,
        success: true,
        results,
      };
    } catch (error) {
      const writeError = this.normalizeError(error);

      this.log?.warn(`Write batch failed: ${batch.txId}`, {
        errorCode: writeError.code,
        errorMessage: writeError.message,
      });

      return {
        txId: batch.txId,
        success: false,
        results: [],
        error: writeError,
      };
    }
  }

  /**
   * Convenience method for single operation
   */
  async writeOne<T = unknown>(
    authorId: string,
    operation: WriteOperation<T>,
  ): Promise<WriteResult<T>> {
    return this.write<T>({
      txId: crypto.randomUUID(),
      authorId,
      operations: [operation],
    });
  }

  // ==========================================================================
  // Internal
  // ==========================================================================

  private async executeOperation<T>(
    tx: DbClient,
    operation: WriteOperation<T>,
    _ctx: WriteContext,
  ): Promise<OperationResult<T>> {
    switch (operation.type) {
      case 'create':
        return this.executeCreate(tx, operation);
      case 'update':
        return this.executeUpdate(tx, operation);
      case 'delete':
        return this.executeDelete(tx, operation);
      default:
        throw new Error(`Unknown operation type: ${String(operation.type)}`);
    }
  }

  private async executeCreate<T>(
    tx: DbClient,
    operation: WriteOperation<T>,
  ): Promise<OperationResult<T>> {
    const { table, id, data } = operation;

    if (data == null) {
      throw new Error('Create operation requires data');
    }

    // Insert with version 1
    const record: Record<string, unknown> = {
      id,
      ...(data as Record<string, unknown>),
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { columns, placeholders, values } = this.buildParameterizedInsert(record);
    await tx.raw(
      `INSERT INTO ${escapeIdentifier(table)} (${columns}) VALUES (${placeholders})`,
      values,
    );

    return {
      operation,
      record: record as T & { id: string; version: number },
    };
  }

  private async executeUpdate<T>(
    tx: DbClient,
    operation: WriteOperation<T>,
  ): Promise<OperationResult<T>> {
    const { table, id, data, expectedVersion } = operation;

    if (data == null) {
      throw new Error('Update operation requires data');
    }

    const idStr = typeof id === 'string' ? id : String(id);

    // Get current record for previous version (parameterized)
    const currentRows = (await tx.raw<{ version: number }>(
      `SELECT version FROM ${escapeIdentifier(table)} WHERE id = $1`,
      [idStr],
    )) as { version: number }[];
    const currentRow = currentRows[0];
    if (currentRow === undefined) {
      throw this.createError('NOT_FOUND', `Record not found: ${table}/${id}`);
    }

    // Check version if expected
    if (expectedVersion !== undefined && currentRow.version !== expectedVersion) {
      throw this.createError(
        'CONFLICT',
        `Version mismatch: expected ${String(expectedVersion)}, got ${String(currentRow.version)}`,
      );
    }

    // Update with version bump
    const newVersion = currentRow.version + 1;
    const updateData: Record<string, unknown> = {
      ...(data as Record<string, unknown>),
      version: newVersion,
      updated_at: new Date().toISOString(),
    };

    const { setClause, values: updateValues } = this.buildParameterizedUpdate(updateData);

    // WHERE id = $N (and optionally AND version = $N+1)
    const whereParams: unknown[] = [idStr];
    let whereClause = `WHERE id = $${String(updateValues.length + 1)}`;
    if (expectedVersion !== undefined) {
      whereClause += ` AND version = $${String(updateValues.length + 2)}`;
      whereParams.push(expectedVersion);
    }

    const result = (await tx.raw<T & { id: string; version: number }>(
      `UPDATE ${escapeIdentifier(table)} SET ${setClause} ${whereClause} RETURNING *`,
      [...updateValues, ...whereParams],
    )) as (T & { id: string; version: number })[];

    if (result.length === 0) {
      throw this.createError('CONFLICT', 'Concurrent modification detected');
    }

    const row = result[0];
    if (row === undefined) {
      throw this.createError('INTERNAL', 'Update returned no data');
    }

    return {
      operation,
      record: row,
      previousVersion: currentRow.version,
    };
  }

  private async executeDelete<T>(
    tx: DbClient,
    operation: WriteOperation<T>,
  ): Promise<OperationResult<T>> {
    const { table, id, expectedVersion } = operation;

    const idStr = typeof id === 'string' ? id : String(id);

    // Get current version before delete (parameterized)
    const currentRows = (await tx.raw<{ version: number }>(
      `SELECT version FROM ${escapeIdentifier(table)} WHERE id = $1`,
      [idStr],
    )) as { version: number }[];
    const currentRow = currentRows[0];
    if (currentRow === undefined) {
      throw this.createError('NOT_FOUND', `Record not found: ${table}/${id}`);
    }

    // Delete with parameterized version check
    let deleteText = `DELETE FROM ${escapeIdentifier(table)} WHERE id = $1`;
    const deleteValues: unknown[] = [idStr];
    if (expectedVersion !== undefined) {
      deleteText += ` AND version = $2`;
      deleteValues.push(expectedVersion);
    }

    const rowCount = await tx.execute({
      text: deleteText,
      values: deleteValues,
    });

    if (rowCount === 0) {
      throw this.createError('CONFLICT', 'Concurrent modification detected');
    }

    return {
      operation,
      previousVersion: currentRow.version,
    };
  }

  private publishResults<T>(results: OperationResult<T>[], _ctx: WriteContext): void {
    if (this.pubsub === undefined) return;

    // Use setImmediate to not block the response; track handle for cleanup
    this.pendingPublish = setImmediate(() => {
      this.pendingPublish = null;
      for (const result of results) {
        const { operation, record } = result;

        if (record !== undefined && 'version' in record && this.pubsub !== undefined) {
          const pubsubManager = this.pubsub;
          const key = SubKeys.record(operation.table, operation.id);

          pubsubManager.publish(key, -1);
        }
      }
    });
  }

  private async runAfterWriteHooks<T>(
    results: OperationResult<T>[],
    ctx: WriteContext,
  ): Promise<void> {
    for (const result of results) {
      for (const hook of this.hooks.afterWrite ?? []) {
        try {
          await (hook as AfterWriteHook<T>)(result, ctx);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          this.log?.error(`afterWrite hook failed: ${errorMsg}`, {
            operationId: result.operation.id,
          });
        }
      }
    }
  }

  /**
   * Build parameterized INSERT clause from a data record.
   *
   * @param data - Key-value record to insert
   * @returns Columns string, $N placeholders string, and values array
   * @complexity O(n) where n is the number of keys
   */
  private buildParameterizedInsert(data: Record<string, unknown>): {
    columns: string;
    placeholders: string;
    values: unknown[];
  } {
    const keys = Object.keys(data);
    const values: unknown[] = [];
    const columns = keys.map((k) => escapeIdentifier(this.toSnakeCase(k))).join(', ');
    const placeholders = keys
      .map((k) => {
        const val = data[k];
        values.push(val instanceof Date ? val.toISOString() : val);
        return `$${String(values.length)}`;
      })
      .join(', ');
    return { columns, placeholders, values };
  }

  /**
   * Build parameterized UPDATE SET clause from a data record.
   *
   * @param data - Key-value record for the SET clause
   * @returns SET clause string with $N placeholders and values array
   * @complexity O(n) where n is the number of keys
   */
  private buildParameterizedUpdate(data: Record<string, unknown>): {
    setClause: string;
    values: unknown[];
  } {
    const entries = Object.entries(data);
    const values: unknown[] = [];
    const setClause = entries
      .map(([k, v]) => {
        values.push(v instanceof Date ? v.toISOString() : v);
        return `${escapeIdentifier(this.toSnakeCase(k))} = $${String(values.length)}`;
      })
      .join(', ');
    return { setClause, values };
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  private createError(code: WriteError['code'], message: string): Error {
    const error = new Error(message) as Error & { writeError: WriteError };
    error.writeError = { code, message };
    return error;
  }

  private normalizeError(error: unknown): WriteError {
    if (error != null && typeof error === 'object' && 'writeError' in error) {
      return (error as { writeError: WriteError }).writeError;
    }

    if (error instanceof Error) {
      // Check for known error types
      if (error.message.includes('unique constraint')) {
        return { code: 'CONFLICT', message: 'Record already exists' };
      }
      if (error.message.includes('foreign key')) {
        return { code: 'VALIDATION', message: 'Invalid reference' };
      }
      return { code: 'INTERNAL', message: error.message };
    }

    return { code: 'INTERNAL', message: String(error) };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createWriteService(options: WriteServiceOptions): WriteService {
  return new WriteService(options);
}
