// modules/users/src/handlers/avatar.ts
/**
 * Profile Service
 *
 * Business logic for user profile operations.
 * Handles profile updates, password changes, and avatar management.
 *
 * @module handlers/avatar
 */

import { hashPassword, verifyPassword } from '@abe-stack/auth';
import {
    ALLOWED_IMAGE_TYPES as ALLOWED_AVATAR_TYPES,
    BadRequestError,
    MAX_IMAGE_SIZE as MAX_AVATAR_SIZE,
    NotFoundError,
    validatePassword,
    WeakPasswordError,
} from '@abe-stack/shared';


import type { Repositories, StorageProvider } from '@abe-stack/db';
import type { UserRole } from '@abe-stack/shared';
import type { UsersAuthConfig } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * User profile domain object.
 * Contains publicly safe user fields.
 */
export interface ProfileUser {
  /** User's unique identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string | null;
  /** URL or storage key to user's avatar image */
  avatarUrl: string | null;
  /** User's role (user, admin) */
  role: UserRole;
  /** Date when the user was created */
  createdAt: Date;
}

/**
 * Data for updating a user's profile.
 * Only includes fields that users can self-update.
 */
export interface UpdateProfileData {
  /** New display name (or null to clear, or omit to leave unchanged) */
  name?: string | null;
}

// ============================================================================
// Profile Update
// ============================================================================

/**
 * Update user profile information.
 *
 * @param repos - Repository container
 * @param userId - ID of the user to update
 * @param data - Profile fields to update
 * @returns Updated profile user object
 * @throws NotFoundError if user not found
 * @throws Error if database update fails
 * @complexity O(1) - single database lookup and update
 */
export async function updateProfile(
  repos: Repositories,
  userId: string,
  data: UpdateProfileData,
): Promise<ProfileUser> {
  const user = await repos.users.findById(userId);

  if (user === null) {
    throw new NotFoundError('User not found');
  }

  // Only update if there are changes
  if ('name' in data) {
    const updated = await repos.users.update(userId, { name: data.name });
    if (updated === null) {
      throw new Error('Failed to update user profile');
    }

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      createdAt: updated.createdAt,
    };
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// ============================================================================
// Password Change
// ============================================================================

/**
 * Change user password.
 * Verifies current password and updates to new password.
 *
 * @param repos - Repository container
 * @param authConfig - Auth configuration with argon2 settings
 * @param userId - ID of the user changing their password
 * @param currentPassword - User's current password for verification
 * @param newPassword - New password to set
 * @throws NotFoundError if user not found
 * @throws BadRequestError if current password is incorrect or account has no password
 * @throws WeakPasswordError if new password does not meet strength requirements
 * @complexity O(1) - single database lookup, password hash, and update
 */
export async function changePassword(
  repos: Repositories,
  authConfig: UsersAuthConfig,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await repos.users.findById(userId);

  if (user === null) {
    throw new NotFoundError('User not found');
  }

  // Check if user has a password (not OAuth/magic-link only)
  if (user.passwordHash.startsWith('oauth:') || user.passwordHash.startsWith('magiclink:')) {
    throw new BadRequestError(
      'Cannot change password for accounts without a password. Please use "Set Password" instead.',
    );
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new BadRequestError('Current password is incorrect', 'INVALID_PASSWORD');
  }

  // Validate new password strength
  const passwordValidation = await validatePassword(newPassword, [user.email, user.name ?? '']);
  if (!passwordValidation.isValid) {
    throw new WeakPasswordError({ errors: passwordValidation.errors });
  }

  // Hash and update
  const newHash = await hashPassword(newPassword, authConfig.argon2);
  await repos.users.update(userId, { passwordHash: newHash });
}

// ============================================================================
// Avatar Management
// ============================================================================

/** Storage key prefix for avatar files */
const AVATAR_PATH_PREFIX = 'avatars';


/**
 * Upload user avatar.
 * Validates file type and size, uploads to storage, updates user.
 *
 * @param repos - Repository container
 * @param storage - Storage provider for file upload
 * @param userId - ID of the user uploading an avatar
 * @param file - File data with buffer, mimetype, and size
 * @returns Signed URL to the uploaded avatar
 * @throws NotFoundError if user not found
 * @throws BadRequestError if file type is invalid or file is too large
 * @complexity O(1) - single upload + database update
 */
export async function uploadAvatar(
  repos: Repositories,
  storage: StorageProvider,
  userId: string,
  file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
  },
): Promise<string> {
  const user = await repos.users.findById(userId);

  if (user === null) {
    throw new NotFoundError('User not found');
  }

  // Validate file type
  if (!(ALLOWED_AVATAR_TYPES as readonly string[]).includes(file.mimetype)) {

    throw new BadRequestError(
      `Invalid file type. Allowed types: ${ALLOWED_AVATAR_TYPES.join(', ')}`,
    );
  }

  // Validate file size
  if (file.size > MAX_AVATAR_SIZE) {
    throw new BadRequestError(
      `File too large. Maximum size: ${String(MAX_AVATAR_SIZE / 1024 / 1024)}MB`,
    );
  }

  // Generate storage key
  const extension = file.mimetype.split('/')[1];
  const timestamp = Date.now();
  const key = `${AVATAR_PATH_PREFIX}/${userId}/${String(timestamp)}.${extension ?? 'jpg'}`;

  // Upload to storage
  const storedKey = await storage.upload(key, file.buffer, file.mimetype);

  // Get signed URL for the avatar
  const avatarUrl = await storage.getSignedUrl(storedKey);

  // Update user with new avatar URL (store the key, not the signed URL)
  await repos.users.update(userId, { avatarUrl: storedKey });

  return avatarUrl;
}

/**
 * Delete user avatar.
 * Clears the avatar URL from the user record.
 * Does not immediately delete from storage (deferred cleanup).
 *
 * @param repos - Repository container
 * @param _storage - Storage provider (reserved for future file deletion)
 * @param userId - ID of the user whose avatar to delete
 * @throws NotFoundError if user not found
 * @complexity O(1) - single database lookup and update
 */
export async function deleteAvatar(
  repos: Repositories,
  _storage: StorageProvider,
  userId: string,
): Promise<void> {
  const user = await repos.users.findById(userId);

  if (user === null) {
    throw new NotFoundError('User not found');
  }

  if (user.avatarUrl === null || user.avatarUrl === '') {
    return; // No avatar to delete
  }

  // Note: We don't delete the file from storage immediately to allow for
  // potential recovery. A cleanup job can remove orphaned files later.

  // Clear avatar URL from user
  await repos.users.update(userId, { avatarUrl: null });
}

/**
 * Get avatar URL for a user.
 * Returns signed URL if user has a storage-based avatar, null otherwise.
 *
 * @param repos - Repository container
 * @param storage - Storage provider for signed URL generation
 * @param userId - ID of the user whose avatar URL to get
 * @returns Signed URL string or null if no avatar
 * @complexity O(1) - single database lookup + optional signed URL generation
 */
export async function getAvatarUrl(
  repos: Repositories,
  storage: StorageProvider,
  userId: string,
): Promise<string | null> {
  const user = await repos.users.findById(userId);
  const avatarUrl = user?.avatarUrl;
  if (avatarUrl === null || avatarUrl === undefined || avatarUrl === '') {
    return null;
  }

  // If avatar URL is a storage key (starts with avatars/), generate signed URL
  if (avatarUrl.startsWith(AVATAR_PATH_PREFIX)) {
    return storage.getSignedUrl(avatarUrl);
  }

  // Otherwise return as-is (might be an external URL)
  return avatarUrl;
}
