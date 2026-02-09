// src/server/core/src/admin/userService.ts
/**
 * Admin User Service
 *
 * Business logic for administrative user operations.
 * All operations require admin privileges (enforced at route level).
 */

import { UserNotFoundError } from '@abe-stack/shared';

import type {
  AdminUserListFilters as DbAdminUserListFilters,
  User as DbUser,
  UserRepository,
} from '@abe-stack/db';
import type {
  AdminUser,
  AdminUserListFilters,
  AdminUserListResponse,
  UserRole,
  UserStatus,
} from '@abe-stack/shared';

// ============================================================================
// Type Conversion Helpers
// ============================================================================

/**
 * Convert database User to AdminUser (API response format)
 */
function toAdminUser(user: DbUser): AdminUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    lockedUntil: user.lockedUntil?.toISOString() ?? null,
    failedLoginAttempts: user.failedLoginAttempts,
    phone: user.phone ?? null,
    phoneVerified: user.phoneVerified ?? false,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * Map frontend sortBy fields to database column names
 */
function mapSortByToColumn(
  sortBy?: string,
): 'email' | 'username' | 'first_name' | 'last_name' | 'created_at' | 'updated_at' {
  switch (sortBy) {
    case 'email':
      return 'email';
    case 'username':
      return 'username';
    case 'firstName':
      return 'first_name';
    case 'lastName':
      return 'last_name';
    case 'createdAt':
      return 'created_at';
    case 'updatedAt':
      return 'updated_at';
    case undefined:
    default:
      return 'created_at';
  }
}

// ============================================================================
// Admin User Service Functions
// ============================================================================

/**
 * List users with filtering and pagination
 */
export async function listUsers(
  userRepo: UserRepository,
  filters: AdminUserListFilters,
): Promise<AdminUserListResponse> {
  // Build db-specific filters with snake_case sortBy
  const dbFilters: DbAdminUserListFilters = {
    sortBy: mapSortByToColumn(filters.sortBy),
    sortOrder: filters.sortOrder ?? 'desc',
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
  };
  if (filters.search !== undefined) {
    dbFilters.search = filters.search;
  }
  if (filters.role !== undefined) {
    dbFilters.role = filters.role;
  }
  if (filters.status !== undefined) {
    dbFilters.status = filters.status;
  }
  const result = await userRepo.listWithFilters(dbFilters);

  return {
    data: result.items.map(toAdminUser),
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
    hasNext: result.hasNext,
    hasPrev: result.hasPrev,
  };
}

/**
 * Get a single user by ID
 */
export async function getUserById(userRepo: UserRepository, userId: string): Promise<AdminUser> {
  const user = await userRepo.findById(userId);
  if (user === null) {
    throw new UserNotFoundError(`User not found: ${userId}`);
  }
  return toAdminUser(user);
}

/**
 * Update user details (firstName, lastName, role)
 *
 * @param userRepo - User repository instance
 * @param userId - ID of the user to update
 * @param data - Fields to update (firstName, lastName, role)
 * @returns Updated AdminUser
 * @throws {UserNotFoundError} If user not found
 * @complexity O(1)
 */
export async function updateUser(
  userRepo: UserRepository,
  userId: string,
  data: { firstName?: string; lastName?: string; role?: UserRole },
): Promise<AdminUser> {
  // First check if user exists
  const existingUser = await userRepo.findById(userId);
  if (existingUser === null) {
    throw new UserNotFoundError(`User not found: ${userId}`);
  }

  // Build update data
  const updateData: { firstName?: string; lastName?: string; role?: UserRole } = {};
  if ('firstName' in data) {
    updateData.firstName = data.firstName;
  }
  if ('lastName' in data) {
    updateData.lastName = data.lastName;
  }
  if (data.role !== undefined) {
    updateData.role = data.role;
  }

  // Update user
  const updatedUser = await userRepo.update(userId, updateData);
  if (updatedUser === null) {
    throw new Error('Failed to update user');
  }

  return toAdminUser(updatedUser);
}

/**
 * Lock a user account
 * @param durationMinutes - If not provided, locks indefinitely
 */
export async function lockUser(
  userRepo: UserRepository,
  userId: string,
  _reason: string,
  durationMinutes?: number,
): Promise<AdminUser> {
  // First check if user exists
  const existingUser = await userRepo.findById(userId);
  if (existingUser === null) {
    throw new UserNotFoundError(`User not found: ${userId}`);
  }

  // Calculate lock until date
  let lockedUntil: Date;
  if (durationMinutes !== undefined) {
    lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
  } else {
    // Lock indefinitely (far future date)
    lockedUntil = new Date('2099-12-31T23:59:59.999Z');
  }

  // Lock the account
  await userRepo.lockAccount(userId, lockedUntil);

  // Return updated user
  const updatedUser = await userRepo.findById(userId);
  if (updatedUser === null) {
    throw new Error('Failed to retrieve updated user');
  }

  return toAdminUser(updatedUser);
}

/**
 * Unlock a user account
 */
export async function unlockUser(
  userRepo: UserRepository,
  userId: string,
  _reason: string,
): Promise<AdminUser> {
  // First check if user exists
  const existingUser = await userRepo.findById(userId);
  if (existingUser === null) {
    throw new UserNotFoundError(`User not found: ${userId}`);
  }

  // Unlock the account
  await userRepo.unlockAccount(userId);

  // Return updated user
  const updatedUser = await userRepo.findById(userId);
  if (updatedUser === null) {
    throw new Error('Failed to retrieve updated user');
  }

  return toAdminUser(updatedUser);
}

/**
 * Get user status based on their account state
 */
export function getUserStatus(user: AdminUser): UserStatus {
  const now = new Date();

  // Check if locked
  if (user.lockedUntil !== null && new Date(user.lockedUntil) > now) {
    return 'locked';
  }

  // Check if unverified
  if (!user.emailVerified) {
    return 'unverified';
  }

  return 'active';
}
