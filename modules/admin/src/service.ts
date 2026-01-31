// modules/admin/src/service.ts
/**
 * Admin Service
 *
 * Pure business logic for administrative operations.
 * No HTTP awareness - returns domain objects or throws errors.
 */

import { UserNotFoundError } from '@abe-stack/core';
import { eq, select, USERS_TABLE } from '@abe-stack/db';

import { unlockAccount as infraUnlockAccount } from '../../../modules/auth/src';

import type { DbClient } from '@abe-stack/db';

export { UserNotFoundError };

/**
 * Unlock a user account
 * Returns true if successful, throws if user not found
 */
export async function unlockUserAccount(
  db: DbClient,
  email: string,
  adminUserId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ email: string }> {
  // Check if the target user exists
  const targetUser = await db.queryOne<{ id: string }>(
    select(USERS_TABLE).columns('id').where(eq('email', email)).limit(1).toSql(),
  );

  if (targetUser === null) {
    throw new UserNotFoundError(`User not found: ${email}`);
  }

  // Unlock the account
  await infraUnlockAccount(db, email, adminUserId, reason, ipAddress, userAgent);

  return { email };
}
