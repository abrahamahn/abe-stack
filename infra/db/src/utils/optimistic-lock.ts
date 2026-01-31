// infra/db/src/utils/optimistic-lock.ts
/**
 * Optimistic Concurrency Control Utilities
 */

import {
  USERS_TABLE,
  USER_COLUMNS,
  and,
  eq,
  select,
  toCamelCase,
  toSnakeCase,
  update,
  type RawDb,
  type User,
} from '../index';

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

  const result = await db.queryOne<Record<string, unknown>>(
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
 */
export function isOptimisticLockError(error: unknown): error is OptimisticLockError {
  return error instanceof OptimisticLockError;
}
