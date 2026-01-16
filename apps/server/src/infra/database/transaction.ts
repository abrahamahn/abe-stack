// apps/server/src/infra/database/transaction.ts
import type { DbClient } from '@database/client';

/**
 * Execute a callback within a database transaction
 * If the callback throws an error, the transaction is rolled back
 * If the callback succeeds, the transaction is committed
 *
 * @example
 * ```typescript
 * const result = await withTransaction(db, async (tx) => {
 *   const user = await tx.insert(users).values({...}).returning();
 *   const token = await tx.insert(refreshTokens).values({...});
 *   return user;
 * });
 * ```
 *
 * @param db - Database client
 * @param callback - Async function to execute within transaction
 * @returns Promise<T> - Result of the callback
 * @throws Error if transaction fails
 */
export async function withTransaction<T>(
  db: DbClient,
  callback: (tx: DbClient) => Promise<T>,
): Promise<T> {
  return await db.transaction(async (tx) => {
    return await callback(tx as DbClient);
  });
}

/**
 * Type guard to check if we're already in a transaction
 * Drizzle transactions are passed as the same type, so this helps document intent
 */
export function isInTransaction(_db: DbClient): boolean {
  // Drizzle doesn't expose a direct way to check, but we can use this for documentation
  // In practice, nested transactions will use savepoints automatically
  return true; // Always safe to call withTransaction - it handles nesting
}
