// apps/server/src/modules/admin/service.ts
/**
 * Admin Service
 *
 * Pure business logic for administrative operations.
 * No HTTP awareness - returns domain objects or throws errors.
 */

import { unlockAccount as infraUnlockAccount, users, type DbClient } from '@infrastructure';
import { UserNotFoundError } from '@shared';
import { eq } from 'drizzle-orm';

export { UserNotFoundError };

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
    throw new UserNotFoundError(`User not found: ${email}`);
  }

  // Unlock the account
  await infraUnlockAccount(db, email, adminUserId, ipAddress, userAgent);

  return { email };
}
