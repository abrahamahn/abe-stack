// apps/server/src/modules/users/service.ts
/**
 * User Service
 *
 * Pure business logic for user operations.
 * No HTTP awareness - returns domain objects or throws errors.
 */

import { users, type DbClient } from '@infrastructure';
import { and, asc, desc, gt, lt, or, type SQL } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

import type { CursorPaginationOptions, UserRole } from '@abe-stack/core';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
}

export interface ListUsersResult {
  users: User[];
  nextCursor: string | null;
  hasNext: boolean;
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

/**
 * Get a paginated list of users
 */
export async function listUsers(
  db: DbClient,
  options: CursorPaginationOptions,
): Promise<ListUsersResult> {
  const { limit, cursor, sortOrder } = options;
  const orderDirection = sortOrder === 'asc' ? asc : desc;
  const comparisonOp = sortOrder === 'asc' ? gt : lt;

  let where: SQL | undefined;
  if (cursor) {
    const parts = cursor.split('_');
    const createdAt = parts[0];
    const id = parts[1];
    if (createdAt && id) {
      const createdAtDate = new Date(createdAt);
      where = or(
        comparisonOp(users.createdAt, createdAtDate),
        and(eq(users.createdAt, createdAtDate), comparisonOp(users.id, id)),
      );
    }
  }

  const userList = await db.query.users.findMany({
    where,
    orderBy: [orderDirection(users.createdAt), orderDirection(users.id)],
    limit: limit + 1,
  });

  const hasNext = userList.length > limit;
  if (hasNext) {
    userList.pop();
  }

  const lastUser = userList[userList.length - 1];
  const nextCursor = hasNext && lastUser
    ? `${lastUser.createdAt.toISOString()}_${lastUser.id}`
    : null;

  return {
    users: userList,
    nextCursor,
    hasNext,
  };
}
