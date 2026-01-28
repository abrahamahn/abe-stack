// apps/server/src/modules/users/profile.service.ts
/**
 * Profile Service
 *
 * Business logic for user profile operations.
 * Handles profile updates, password changes, and avatar management.
 */

import {
  BadRequestError,
  NotFoundError,
  validatePassword,
  WeakPasswordError,
  type UserRole,
} from '@abe-stack/core';
import { hashPassword, verifyPassword } from '@auth/utils';

import type { AuthConfig } from '@/config';
import type { Repositories, StorageProvider } from '@/infrastructure';

// ============================================================================
// Types
// ============================================================================

export interface ProfileUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
}

export interface UpdateProfileData {
  name?: string | null;
}

// ============================================================================
// Profile Update
// ============================================================================

/**
 * Update user profile information
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
 * Change user password
 * Verifies current password and updates to new password
 */
export async function changePassword(
  repos: Repositories,
  authConfig: AuthConfig,
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

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const AVATAR_PATH_PREFIX = 'avatars';

/**
 * Upload user avatar
 * Validates file type and size, uploads to storage, updates user
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
  if (!ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
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
 * Delete user avatar
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
 * Get avatar URL for a user
 * Returns signed URL if user has an avatar, null otherwise
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
