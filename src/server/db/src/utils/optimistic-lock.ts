// src/server/db/src/utils/optimistic-lock.ts
/**
 * Optimistic Concurrency Control Utilities
 *
 * Provides version-based optimistic locking for database records.
 * On version mismatch, throws OptimisticLockError (maps to HTTP 409).
 *
 * @module
 */

import { and, eq, select, update } from '../builder/index';
import { USERS_TABLE, USER_COLUMNS, type User } from '../schema/index';

import { toCamelCase, toSnakeCase } from './database';

import type { RawDb } from '../client';

/**
 * Error thrown when optimistic lock fails (version mismatch)
 * Maps to HTTP 409 Conflict
 */
export class OptimisticLockError extends Error {
  readonly statusCode = 409;
  readonly currentVersion: number;

  /**
   * @param currentVersion - The current version in the database
   * @param message - Human-readable error message
   */
  constructor(currentVersion: number, message = 'Record was modified by another request') {
    super(message);
    this.name = 'OptimisticLockError';
    this.currentVersion = currentVersion;
  }
}

/**
 * Update a user record with optimistic locking
 * @param db - Raw database client
 * @param id - User ID to update
 * @param data - Partial user fields to update
 * @param expectedVersion - The version the caller expects (from their last read)
 * @returns Updated user record
 * @throws OptimisticLockError if version mismatch
 * @throws Error if record not found
 */
export async function updateUserWithVersion(
  db: RawDb,
  id: string,
  data: Partial<Omit<User, 'id' | 'version' | 'createdAt' | 'updatedAt'>>,
  expectedVersion: number,
): Promise<User> {
  const snakeData = toSnakeCase(data as Record<string, unknown>, USER_COLUMNS);

  const updateData = {
    ...snakeData,
    version: { expression: 'version + 1' },
    updated_at: { expression: 'now()' },
  } as Record<string, unknown>;

  const result = await db.queryOne(
    update(USERS_TABLE)
      .set(updateData)
      .where(and(eq('id', id), eq('version', expectedVersion)))
      .returningAll()
      .toSql(),
  );

  if (result == null) {
    const current = await db.queryOne<{ version: number }>(
      select(USERS_TABLE).columns('version').where(eq('id', id)).limit(1).toSql(),
    );

    if (current == null) {
      throw new Error('Record not found');
    }

    throw new OptimisticLockError(current.version);
  }

  return toCamelCase<User>(result, USER_COLUMNS as Record<string, string>);
}

/**
 * Type guard to check if an error is an OptimisticLockError
 * @param error - The error to check
 * @returns True if the error is an OptimisticLockError
 */
export function isOptimisticLockError(error: unknown): error is OptimisticLockError {
  return error instanceof OptimisticLockError;
}
