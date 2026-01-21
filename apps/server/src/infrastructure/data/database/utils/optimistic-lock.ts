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

import { users } from '@database/schema';
import { and, eq, sql } from 'drizzle-orm';

import type { DbClient } from '@database/client';
import type { User } from '@database/schema';

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
  db: DbClient,
  id: string,
  data: Partial<Omit<User, 'id' | 'version' | 'createdAt' | 'updatedAt'>>,
  expectedVersion: number,
): Promise<User> {
  // First, try the optimistic update
  const result = await db
    .update(users)
    .set({
      ...data,
      version: sql`${users.version} + 1`,
      updatedAt: sql`now()`,
    })
    .where(and(eq(users.id, id), eq(users.version, expectedVersion)))
    .returning();

  const updated = result[0];
  if (!updated) {
    // Version mismatch - fetch current version for error response
    const current = await db
      .select({ version: users.version })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (current.length === 0) {
      throw new Error('Record not found');
    }

    throw new OptimisticLockError(current[0]?.version ?? 0);
  }

  return updated;
}

/**
 * Type guard to check if an error is an OptimisticLockError
 */
export function isOptimisticLockError(error: unknown): error is OptimisticLockError {
  return error instanceof OptimisticLockError;
}
