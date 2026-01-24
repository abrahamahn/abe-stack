// apps/server/src/modules/users/service.ts
/**
 * User Service
 *
 * Pure business logic for user operations.
 * No HTTP awareness - returns domain objects or throws errors.
 */

import type { CursorPaginationOptions, UserRole } from '@abe-stack/core';
import type { UserRepository } from '@abe-stack/db';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
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
export async function getUserById(userRepo: UserRepository, userId: string): Promise<User | null> {
  const user = await userRepo.findById(userId);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/**
 * Get a paginated list of users
 */
export async function listUsers(
  userRepo: UserRepository,
  options: CursorPaginationOptions,
): Promise<ListUsersResult> {
  const { limit, cursor, sortOrder } = options;

  const result = await userRepo.list({
    limit,
    cursor,
    direction: sortOrder,
    sortBy: 'created_at',
  });

  return {
    users: result.items.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      createdAt: user.createdAt,
    })),
    nextCursor: result.nextCursor,
    hasNext: result.nextCursor !== null,
  };
}
