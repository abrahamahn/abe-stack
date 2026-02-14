// main/server/core/src/users/service.ts
/**
 * User Service
 *
 * Pure business logic for user operations.
 * No HTTP awareness - returns domain objects or throws errors.
 *
 * @module service
 */

import { toISODateOnly } from '@abe-stack/shared';

import type { UserRepository } from '../../../db/src';
import type { CursorPaginationOptions } from '@abe-stack/shared';
import type { AppRole as UserRole } from '@abe-stack/shared/domain';

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
  /** User's unique username */
  username: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** URL to user's avatar image */
  avatarUrl: string | null;
  /** User's role (user, admin, moderator) */
  role: UserRole;
  /** Whether user's email is verified */
  emailVerified: boolean;
  /** User's phone number */
  phone: string | null;
  /** Whether phone is verified */
  phoneVerified: boolean | null;
  /** Date of birth (ISO date string) */
  dateOfBirth: string | null;
  /** Gender (free text) */
  gender: string | null;
  /** User's bio/about text */
  bio: string | null;
  /** User's city */
  city: string | null;
  /** User's state/province */
  state: string | null;
  /** User's country */
  country: string | null;
  /** User's preferred language */
  language: string | null;
  /** User's website URL */
  website: string | null;
  /** Date when the user was created */
  createdAt: Date;
  /** Date when the user was last updated */
  updatedAt: Date;
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
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    emailVerified: user.emailVerified,
    phone: user.phone ?? null,
    phoneVerified: user.phoneVerified,
    dateOfBirth: toISODateOnly(user.dateOfBirth),
    gender: user.gender ?? null,
    bio: user.bio ?? null,
    city: user.city ?? null,
    state: user.state ?? null,
    country: user.country ?? null,
    language: user.language ?? null,
    website: user.website ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
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
  const { limit, sortOrder } = options;

  // UserRepository uses offset pagination with listWithFilters
  // Convert cursor to page number (simplified - cursor is page number as string)
  const page =
    options.cursor !== undefined && options.cursor !== '' ? parseInt(options.cursor, 10) : 1;

  const result = await userRepo.listWithFilters({
    page,
    limit,
    sortBy: 'created_at',
    sortOrder,
  });

  // Convert offset pagination result to cursor format
  const nextCursor = result.hasNext ? String(page + 1) : null;

  return {
    users: result.data.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      emailVerified: user.emailVerified,
      phone: user.phone ?? null,
      phoneVerified: user.phoneVerified,
      dateOfBirth: toISODateOnly(user.dateOfBirth),
      gender: user.gender ?? null,
      bio: user.bio ?? null,
      city: user.city ?? null,
      state: user.state ?? null,
      country: user.country ?? null,
      language: user.language ?? null,
      website: user.website ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
    nextCursor,
    hasNext: result.hasNext,
  };
}
