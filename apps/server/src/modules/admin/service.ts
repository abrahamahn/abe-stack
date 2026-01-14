// apps/server/src/modules/admin/service.ts
/**
 * Admin Service
 *
 * Pure business logic for administrative operations.
 * No HTTP awareness - returns domain objects or throws errors.
 */

import { eq } from 'drizzle-orm';

import { unlockAccount as infraUnlockAccount, users, type DbClient } from '../../infra';

/**
 * Unlock a user account
 * Returns true if successful, throws if user not found
 */
export async function unlockUserAccount(
  db: DbClient,
  email: string,
  adminUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ email: string }> {
  // Check if the target user exists
  const targetUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!targetUser) {
    throw new UserNotFoundError(email);
  }

  // Unlock the account
  await infraUnlockAccount(db, email, adminUserId, ipAddress, userAgent);

  return { email };
}

/**
 * Error thrown when user is not found
 */
export class UserNotFoundError extends Error {
  constructor(public readonly email: string) {
    super(`User not found: ${email}`);
    this.name = 'UserNotFoundError';
  }
}
