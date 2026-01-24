// apps/server/src/infrastructure/data/database/utils/optimistic-lock.ts
/**
 * Optimistic Concurrency Control Utilities
 *
 * Adopted from Chet-stack's version-based conflict detection.
 * Enables collaborative editing without pessimistic locks.
 *
 * How it works:
 * 1. Client fetches record with version N
 * 2. Client sends update with expectedVersion: N
 * 3. Server only applies update if current version = N
 * 4. If version mismatch, return 409 Conflict
 * 5. Client refetches and retries (or shows conflict UI)
 */

import {
  update,
  select,
  and,
  eq,
  USERS_TABLE,
  USER_COLUMNS,
  toCamelCase,
  toSnakeCase,
  type RawDb,
  type User,
} from '@abe-stack/db';

/**
 * Error thrown when optimistic lock fails (version mismatch)
 * Maps to HTTP 409 Conflict
 */
export class OptimisticLockError extends Error {
  readonly statusCode = 409;
  readonly currentVersion: number;

  constructor(currentVersion: number, message = 'Record was modified by another request') {
    super(message);
    this.name = 'OptimisticLockError';
    this.currentVersion = currentVersion;
  }
}

/**
 * Update a user record with optimistic locking
 *
 * @param db - Database client
 * @param id - User ID
 * @param data - Fields to update (version is auto-incremented)
 * @param expectedVersion - Version the client expects
 * @returns Updated user record
 * @throws OptimisticLockError if version mismatch
 *
 * @example
 * const user = await updateUserWithVersion(db, userId, { name: 'New Name' }, 3);
 * // If version wasn't 3, throws OptimisticLockError
 */
export async function updateUserWithVersion(
  db: RawDb,
  id: string,
  data: Partial<Omit<User, 'id' | 'version' | 'createdAt' | 'updatedAt'>>,
  expectedVersion: number,
): Promise<User> {
  // Convert data to snake_case and add version increment
  const snakeData = toSnakeCase(data as Record<string, unknown>, USER_COLUMNS);

  // Build the update query with version increment
  const updateData = {
    ...snakeData,
    version: { expression: 'version + 1' },
    updated_at: { expression: 'now()' },
  } as Record<string, unknown>;

  const result = await db.queryOne<Record<string, unknown>>(
    update(USERS_TABLE)
      .set(updateData)
      .where(and(eq('id', id), eq('version', expectedVersion)))
      .returningAll()
      .toSql(),
  );

  if (!result) {
    // Version mismatch - fetch current version for error response
    const current = await db.queryOne<{ version: number }>(
      select(USERS_TABLE).columns('version').where(eq('id', id)).limit(1).toSql(),
    );

    if (!current) {
      throw new Error('Record not found');
    }

    throw new OptimisticLockError(current.version);
  }

  return toCamelCase<User>(result, USER_COLUMNS as Record<string, string>);
}

/**
 * Type guard to check if an error is an OptimisticLockError
 */
export function isOptimisticLockError(error: unknown): error is OptimisticLockError {
  return error instanceof OptimisticLockError;
}
