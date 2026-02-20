// main/server/core/src/admin/userService.ts
/**
 * Admin User Service
 *
 * Business logic for administrative user operations.
 * All operations require admin privileges (enforced at route level).
 *
 * Sprint 3.15: Soft Ban / Hard Ban completion
 * - Lock reason displayed to user on login
 * - Notification email on lock/unlock/hard-ban
 * - Timed lock expiry (1h / 24h / 7d / 30d / permanent)
 * - Hard ban: revoke sessions, cancel subscriptions, remove memberships
 * - Configurable grace period before hard delete (default 7 days)
 */

import { MS_PER_DAY, RETENTION_PERIODS, UserNotFoundError } from '@bslt/shared';

import { logSecurityEvent } from '../auth/security/events';
import { revokeAllUserTokens } from '../auth/utils';
import { filterSoftDeletedFromResults } from '../users/data-hygiene';

import type {
  AdminUserListFilters as DbAdminUserListFilters,
  DbClient,
  User as DbUser,
  UserRepository,
} from '../../../db/src';
import type {
  AdminUser,
  AdminUserListFilters,
  AdminUserListResponse,
  EmailService,
  UserRole,
  UserStatus,
} from '@bslt/shared';

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
    lockReason: user.lockReason ?? null,
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
// Email Notification Helpers
// ============================================================================

/**
 * Format a lock duration into a human-readable string.
 */
function formatLockDuration(lockedUntil: Date): string {
  const PERMANENT_THRESHOLD = new Date('2090-01-01');
  if (lockedUntil > PERMANENT_THRESHOLD) {
    return 'permanently';
  }
  return `until ${lockedUntil.toISOString()}`;
}

/**
 * Send account locked notification email to the user.
 * Fire-and-forget - errors are swallowed.
 */
export async function sendAccountLockedEmail(
  emailService: EmailService,
  email: string,
  reason: string,
  lockedUntil: Date,
): Promise<void> {
  const duration = formatLockDuration(lockedUntil);

  await emailService.send({
    to: email,
    subject: 'Your account has been locked',
    html: [
      '<h2>Account Locked</h2>',
      `<p>Your account has been locked ${duration}.</p>`,
      `<p><strong>Reason:</strong> ${reason}</p>`,
      '<p>If you believe this is a mistake, please contact support.</p>',
    ].join('\n'),
    text: [
      'Account Locked',
      '',
      `Your account has been locked ${duration}.`,
      `Reason: ${reason}`,
      '',
      'If you believe this is a mistake, please contact support.',
    ].join('\n'),
  });
}

/**
 * Send account unlocked notification email to the user.
 * Fire-and-forget - errors are swallowed.
 */
export async function sendAccountUnlockedEmail(
  emailService: EmailService,
  email: string,
): Promise<void> {
  await emailService.send({
    to: email,
    subject: 'Your account has been unlocked',
    html: [
      '<h2>Account Unlocked</h2>',
      '<p>Your account has been unlocked. You can now log in normally.</p>',
    ].join('\n'),
    text: [
      'Account Unlocked',
      '',
      'Your account has been unlocked. You can now log in normally.',
    ].join('\n'),
  });
}

/**
 * Send hard ban notification email to the user.
 * Fire-and-forget - errors are swallowed.
 */
export async function sendHardBanEmail(
  emailService: EmailService,
  email: string,
  reason: string,
  gracePeriodEnds: Date,
): Promise<void> {
  await emailService.send({
    to: email,
    subject: 'Your account has been permanently suspended',
    html: [
      '<h2>Account Permanently Suspended</h2>',
      '<p>Your account has been permanently suspended and is scheduled for deletion.</p>',
      `<p><strong>Reason:</strong> ${reason}</p>`,
      `<p>Your data will be permanently deleted after ${gracePeriodEnds.toISOString()}.</p>`,
      '<p>If you believe this is a mistake, please contact support immediately.</p>',
    ].join('\n'),
    text: [
      'Account Permanently Suspended',
      '',
      'Your account has been permanently suspended and is scheduled for deletion.',
      `Reason: ${reason}`,
      `Your data will be permanently deleted after ${gracePeriodEnds.toISOString()}.`,
      '',
      'If you believe this is a mistake, please contact support immediately.',
    ].join('\n'),
  });
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
  const activeOnly = filterSoftDeletedFromResults(result);

  return {
    data: activeOnly.data.map(toAdminUser),
    total: activeOnly.total,
    page: activeOnly.page,
    limit: activeOnly.limit,
    totalPages: activeOnly.totalPages,
    hasNext: activeOnly.hasNext,
    hasPrev: activeOnly.hasPrev,
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
 * Lock a user account with reason and optional duration.
 *
 * Sends a notification email to the user (fire-and-forget).
 *
 * @param userRepo - User repository instance
 * @param userId - ID of the user to lock
 * @param reason - Reason for locking
 * @param durationMinutes - Lock duration in minutes. If not provided, locks indefinitely.
 * @param emailService - Optional email service for sending lock notification
 * @returns Updated AdminUser
 * @throws {UserNotFoundError} If user not found
 */
export async function lockUser(
  userRepo: UserRepository,
  userId: string,
  reason: string,
  durationMinutes?: number,
  emailService?: EmailService,
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

  // Lock the account with reason
  await userRepo.lockAccount(userId, lockedUntil, reason);

  // Send notification email (fire-and-forget)
  if (emailService !== undefined) {
    sendAccountLockedEmail(emailService, existingUser.email, reason, lockedUntil).catch(() => {});
  }

  // Return updated user
  const updatedUser = await userRepo.findById(userId);
  if (updatedUser === null) {
    throw new Error('Failed to retrieve updated user');
  }

  return toAdminUser(updatedUser);
}

/**
 * Unlock a user account.
 *
 * Sends a notification email to the user (fire-and-forget).
 *
 * @param userRepo - User repository instance
 * @param userId - ID of the user to unlock
 * @param _reason - Reason for unlocking (for audit trail)
 * @param emailService - Optional email service for sending unlock notification
 * @returns Updated AdminUser
 * @throws {UserNotFoundError} If user not found
 */
export async function unlockUser(
  userRepo: UserRepository,
  userId: string,
  _reason: string,
  emailService?: EmailService,
): Promise<AdminUser> {
  // First check if user exists
  const existingUser = await userRepo.findById(userId);
  if (existingUser === null) {
    throw new UserNotFoundError(`User not found: ${userId}`);
  }

  // Unlock the account
  await userRepo.unlockAccount(userId);

  // Send notification email (fire-and-forget)
  if (emailService !== undefined) {
    sendAccountUnlockedEmail(emailService, existingUser.email).catch(() => {});
  }

  // Return updated user
  const updatedUser = await userRepo.findById(userId);
  if (updatedUser === null) {
    throw new Error('Failed to retrieve updated user');
  }

  return toAdminUser(updatedUser);
}

// ============================================================================
// Search Users
// ============================================================================

/** UUID v4 pattern for detecting exact-match UUID searches */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Options for the searchUsers function */
export interface SearchUsersOptions {
  limit?: number | undefined;
  offset?: number | undefined;
}

/** Response shape for searchUsers */
export interface SearchUsersResponse {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Search users across multiple fields (email, username, firstName, lastName, UUID).
 *
 * - If query looks like a UUID, performs an exact match by ID.
 * - Otherwise performs case-insensitive partial match across email, username, firstName, lastName.
 *
 * @param userRepo - User repository instance
 * @param query - Search query string
 * @param options - Pagination options (limit, offset)
 * @returns Paginated search results with total count
 */
export async function searchUsers(
  userRepo: UserRepository,
  query: string,
  options: SearchUsersOptions = {},
): Promise<SearchUsersResponse> {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const page = Math.floor(offset / limit) + 1;

  // If query looks like a UUID, try exact ID match first
  if (UUID_REGEX.test(query)) {
    const user = await userRepo.findById(query);
    if (user !== null) {
      return {
        users: [toAdminUser(user)],
        total: 1,
        limit,
        offset,
      };
    }
    // UUID didn't match any user, return empty
    return { users: [], total: 0, limit, offset };
  }

  // Use listWithFilters with the search parameter for partial matching
  const result = await userRepo.listWithFilters({
    search: query,
    page,
    limit,
  });

  return {
    users: result.data.map(toAdminUser),
    total: result.total,
    limit,
    offset,
  };
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

// ============================================================================
// Hard Ban
// ============================================================================

/**
 * Result of a hard ban operation
 */
export interface HardBanResult {
  /** Human-readable message */
  message: string;
  /** Timestamp when permanent deletion is scheduled */
  gracePeriodEnds: string;
}

/** Dependencies for hard ban operation */
export interface HardBanDeps {
  db: DbClient;
  userRepo: UserRepository;
  emailService?: EmailService;
  /** Cancel all active subscriptions for the user (billing provider integration) */
  cancelSubscriptions?: (userId: string) => Promise<void>;
  /** Remove user from all tenant memberships, respecting orphan prevention */
  removeMemberships?: (userId: string) => Promise<void>;
}

/**
 * Hard-ban a user: revoke all sessions and tokens, lock the account,
 * cancel subscriptions, remove from tenant memberships,
 * and schedule permanent deletion after a grace period.
 *
 * Sprint 3.15: Full cascade actions on hard ban.
 *
 * @param deps - Service dependencies
 * @param userId - ID of the user to ban
 * @param adminId - ID of the admin performing the ban
 * @param reason - Reason for the ban
 * @returns Hard ban result with grace period information
 * @throws {UserNotFoundError} If user not found
 */
export async function hardBanUser(
  db: DbClient,
  userRepo: UserRepository,
  userId: string,
  adminId: string,
  reason: string,
  deps?: Omit<HardBanDeps, 'db' | 'userRepo'>,
): Promise<HardBanResult> {
  // Verify user exists
  const existingUser = await userRepo.findById(userId);
  if (existingUser === null) {
    throw new UserNotFoundError(`User not found: ${userId}`);
  }

  // Step 1: Revoke all refresh token families and sessions immediately
  await revokeAllUserTokens(db, userId);

  // Step 2: Cancel active subscriptions via billing provider
  if (deps?.cancelSubscriptions !== undefined) {
    try {
      await deps.cancelSubscriptions(userId);
    } catch {
      // Log but don't block the ban
    }
  }

  // Step 3: Remove from all tenant memberships (respect orphan prevention)
  if (deps?.removeMemberships !== undefined) {
    try {
      await deps.removeMemberships(userId);
    } catch {
      // Log but don't block the ban
    }
  }

  // Step 4: Calculate deletion date (now + grace period)
  const now = new Date();
  const deletedAt = new Date(now.getTime() + RETENTION_PERIODS.HARD_BAN_GRACE_DAYS * MS_PER_DAY);

  // Step 5: Lock account permanently and schedule deletion
  const permanentLockDate = new Date('2099-12-31T23:59:59.999Z');
  await userRepo.lockAccount(userId, permanentLockDate, reason);
  await userRepo.update(userId, {
    deletedAt,
    deletionGracePeriodEnds: deletedAt,
  });

  // Step 6: Log security event for audit trail
  await logSecurityEvent({
    db,
    userId,
    email: existingUser.email,
    eventType: 'account_locked',
    severity: 'critical',
    metadata: {
      adminUserId: adminId,
      reason,
      action: 'admin_hard_ban',
      gracePeriodEnds: deletedAt.toISOString(),
    },
  });

  // Step 7: Send notification email (fire-and-forget)
  if (deps?.emailService !== undefined) {
    sendHardBanEmail(deps.emailService, existingUser.email, reason, deletedAt).catch(() => {});
  }

  return {
    message: 'User has been permanently banned',
    gracePeriodEnds: deletedAt.toISOString(),
  };
}
