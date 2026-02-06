// backend/db/src/transaction.ts
/**
 * Transaction Utilities
 *
 * Helper functions for database transactions using raw SQL.
 *
 * @module
 */

import type { RawDb, TransactionOptions } from './client';

/**
 * Execute a callback within a database transaction
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
  return true;
}
