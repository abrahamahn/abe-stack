// infra/users/src/service.ts
/**
 * User Service
 *
 * Pure business logic for user operations.
 * No HTTP awareness - returns domain objects or throws errors.
 *
 * @module service
 */

import type { CursorPaginationOptions, UserRole } from '@abe-stack/core';
import type { UserRepository } from '@abe-stack/db';

// ============================================================================
// Types
// ============================================================================

/**
 * Domain user object returned from service functions.
 * Excludes sensitive fields like passwordHash.
 */
export interface User {
  /** User's unique identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string | null;
  /** URL to user's avatar image */
  avatarUrl: string | null;
  /** User's role (user, admin) */
  role: UserRole;
  /** Date when the user was created */
  createdAt: Date;
}

/**
 * Result of listing users with cursor-based pagination.
 */
export interface ListUsersResult {
  /** Array of user objects in the current page */
  users: User[];
  /** Cursor for the next page, or null if no more pages */
  nextCursor: string | null;
  /** Whether there are more pages after this one */
  hasNext: boolean;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get a user by their ID.
 * Returns null if user not found.
 *
 * @param userRepo - User repository instance
 * @param userId - ID of the user to fetch
 * @returns User domain object or null if not found
 * @complexity O(1) - single database lookup
 */
export async function getUserById(userRepo: UserRepository, userId: string): Promise<User | null> {
  const user = await userRepo.findById(userId);

  if (user === null) {
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
 * Get a paginated list of users using cursor-based pagination.
 *
 * @param userRepo - User repository instance
 * @param options - Cursor pagination options (limit, cursor, sortOrder)
 * @returns Paginated list of users with cursor metadata
 * @complexity O(n) where n is the page size (limit)
 */
export async function listUsers(
  userRepo: UserRepository,
  options: CursorPaginationOptions,
): Promise<ListUsersResult> {
  const { limit, cursor, sortOrder } = options;

  // Build list options conditionally to satisfy exactOptionalPropertyTypes
  const listOptions: Parameters<typeof userRepo.list>[0] = {
    limit,
    direction: sortOrder,
    sortBy: 'created_at',
  };
  if (cursor !== undefined) {
    listOptions.cursor = cursor;
  }

  const result = await userRepo.list(listOptions);

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
