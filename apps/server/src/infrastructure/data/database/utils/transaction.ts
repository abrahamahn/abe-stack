// apps/server/src/infrastructure/data/database/utils/transaction.ts
/**
 * Transaction Utilities
 *
 * Helper functions for database transactions using raw SQL.
 */

import type { RawDb, TransactionOptions } from '@abe-stack/db';

/**
 * Execute a callback within a database transaction
 * If the callback throws an error, the transaction is rolled back
 * If the callback succeeds, the transaction is committed
 *
 * @example
 * ```typescript
 * const result = await withTransaction(db, async (tx) => {
 *   const user = await tx.queryOne<User>(insert(USERS_TABLE).values({...}).returningAll().toSql());
 *   const token = await tx.queryOne<Token>(insert(TOKENS_TABLE).values({...}).returningAll().toSql());
 *   return user;
 * });
 * ```
 *
 * @param db - Raw database client
 * @param callback - Async function to execute within transaction
 * @param options - Optional transaction options (isolation level, read-only)
 * @returns Promise<T> - Result of the callback
 * @throws Error if transaction fails
 */
export async function withTransaction<T>(
  db: RawDb,
  callback: (tx: RawDb) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  return await db.transaction(callback, options);
}

/**
 * Type guard to check if we're already in a transaction
 * (For documentation purposes - nested transactions use savepoints)
 */
export function isInTransaction(_db: RawDb): boolean {
  // Raw SQL client handles nested transactions with savepoints
  return true;
}
