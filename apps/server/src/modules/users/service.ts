// apps/server/src/modules/users/service.ts
/**
 * User Service
 *
 * Pure business logic for user operations.
 * No HTTP awareness - returns domain objects or throws errors.
 */

import { users, type DbClient } from '@infra';
import { eq } from 'drizzle-orm';

import type { UserRole } from '@abe-stack/core';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
}

/**
 * Get a user by their ID
 * Returns null if user not found
 */
export async function getUserById(db: DbClient, userId: string): Promise<User | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}
