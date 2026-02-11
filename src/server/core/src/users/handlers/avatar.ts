// src/server/core/src/users/handlers/avatar.ts
/**
 * Profile Service
 *
 * Business logic for user profile operations.
 * Handles profile updates, password changes, and avatar management.
 *
 * @module handlers/avatar
 */

import { createHash } from 'node:crypto';

import {
  ALLOWED_IMAGE_TYPES as ALLOWED_AVATAR_TYPES,
  BadRequestError,
  MAX_IMAGE_SIZE as MAX_AVATAR_SIZE,
  NotFoundError,
  validatePassword,
  WeakPasswordError,
} from '@abe-stack/shared';

import { logActivity } from '../../activities';
import { hashPassword, revokeAllUserTokens, verifyPassword } from '../../auth';
import { ERROR_MESSAGES } from '../types';

import type { UsersAuthConfig, UsersModuleDeps, UsersRequest } from '../types';
import type { DbClient, Repositories } from '@abe-stack/db';
import type { HandlerContext, RouteResult } from '@abe-stack/server-engine';
import type { UserRole } from '@abe-stack/shared';
import type { FastifyRequest } from 'fastify';

/**
 * Storage service interface for file operations.
 * Abstracts over different storage backends (S3, local, etc).
 */
export interface StorageProvider {
  /**
   * Upload a file to storage.
   * @param key - Storage key/path for the file
   * @param buffer - File contents as Buffer
   * @param mimeType - MIME type of the file
   * @returns The storage key where the file was stored
   */
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>;

  /**
   * Get a signed URL for accessing a stored file.
   * @param key - Storage key/path of the file
   * @returns Signed URL that grants temporary access to the file
   */
  getSignedUrl(key: string): Promise<string>;
}

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
  /** User's unique username */
  username: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** URL or storage key to user's avatar image */
  avatarUrl: string | null;
  /** User's role (user, admin, moderator) */
  role: UserRole;
  /** Date when the user was created */
  createdAt: Date;
}

/**
 * Data for updating a user's profile.
 * Only includes fields that users can self-update.
 * All fields are optional — omitted fields remain unchanged.
 * Nullable fields can be set to null to clear them.
 */
export interface UpdateProfileData {
  /** New username */
  username?: string;
  /** New first name */
  firstName?: string;
  /** New last name */
  lastName?: string;
  /** Phone number (nullable) */
  phone?: string | null;
  /** Date of birth as ISO date string (nullable) */
  dateOfBirth?: string | null;
  /** Gender (nullable) */
  gender?: string | null;
  /** Bio/about text (nullable) */
  bio?: string | null;
  /** City (nullable) */
  city?: string | null;
  /** State/province (nullable) */
  state?: string | null;
  /** Country (nullable) */
  country?: string | null;
  /** Preferred language (nullable) */
  language?: string | null;
  /** Website URL (nullable) */
  website?: string | null;
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

  // Build update payload from provided fields
  const updatePayload: Record<string, unknown> = {};
  if ('username' in data) {
    // Check username uniqueness if changing
    if (data.username !== user.username) {
      const existing = await repos.users.findByUsername(data.username);
      if (existing !== null && existing.id !== userId) {
        throw new BadRequestError('Username is already taken', 'USERNAME_TAKEN');
      }
    }
    updatePayload['username'] = data.username;
  }
  if ('firstName' in data) updatePayload['firstName'] = data.firstName;
  if ('lastName' in data) updatePayload['lastName'] = data.lastName;
  if ('phone' in data) updatePayload['phone'] = data.phone;
  if ('dateOfBirth' in data) updatePayload['dateOfBirth'] = data.dateOfBirth;
  if ('gender' in data) updatePayload['gender'] = data.gender;
  if ('bio' in data) updatePayload['bio'] = data.bio;
  if ('city' in data) updatePayload['city'] = data.city;
  if ('state' in data) updatePayload['state'] = data.state;
  if ('country' in data) updatePayload['country'] = data.country;
  if ('language' in data) updatePayload['language'] = data.language;
  if ('website' in data) updatePayload['website'] = data.website;

  // Only update if there are changes
  if (Object.keys(updatePayload).length > 0) {
    const updated = await repos.users.update(userId, updatePayload);
    if (updated === null) {
      throw new Error('Failed to update user profile');
    }

    // Fire-and-forget activity log
    logActivity(repos.activities, {
      actorId: userId,
      actorType: 'user',
      action: 'user.profile.updated',
      resourceType: 'user',
      resourceId: userId,
      metadata: { fields: Object.keys(updatePayload) },
    }).catch(() => {});

    return {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      firstName: updated.firstName,
      lastName: updated.lastName,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      createdAt: updated.createdAt,
    };
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
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
  db: DbClient,
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

  // Validate new password strength against user's personal info
  const passwordValidation = await validatePassword(newPassword, [
    user.email,
    user.username,
    user.firstName,
    user.lastName,
  ]);
  if (!passwordValidation.isValid) {
    throw new WeakPasswordError({ errors: passwordValidation.errors });
  }

  // Hash and update
  const newHash = await hashPassword(newPassword, authConfig.argon2);
  await repos.users.update(userId, { passwordHash: newHash });
  await revokeAllUserTokens(db, userId);
}

// ============================================================================
// Avatar Management
// ============================================================================

// ============================================================================
// Avatar Fallback Chain
// ============================================================================

/**
 * Get the avatar URL for a user with fallback chain:
 * 1. Custom uploaded avatar (stored in storage)
 * 2. Gravatar (based on email hash)
 * 3. Initials-based avatar (generated from name)
 */
export function getAvatarFallbackUrl(email: string, _firstName: string, _lastName: string): string {
  // Use Gravatar with initials fallback as default
  const gravatarUrl = getGravatarUrl(email, 80, 'blank');
  // If Gravatar returns blank, the UI can fall back to initials
  return gravatarUrl;
}

/**
 * Generate a Gravatar URL from an email address.
 * Uses MD5 hash of the lowercased, trimmed email.
 */
export function getGravatarUrl(
  email: string,
  size = 80,
  defaultImg: 'blank' | 'identicon' | 'mp' | '404' = 'identicon',
): string {
  const hash = createHash('md5').update(email.trim().toLowerCase()).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?s=${String(size)}&d=${defaultImg}`;
}

/**
 * Generate an initials-based avatar URL using UI Avatars service.
 */
export function getInitialsAvatarUrl(firstName: string, lastName: string, size = 80): string {
  const name = encodeURIComponent(`${firstName} ${lastName}`.trim());
  return `https://ui-avatars.com/api/?name=${name}&size=${String(size)}&background=random&bold=true`;
}

/**
 * Append a cache-busting query parameter to an avatar URL.
 */
export function cacheBustAvatarUrl(url: string, version: number | Date): string {
  const v = version instanceof Date ? String(version.getTime()) : String(version);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${v}`;
}

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

  // Fire-and-forget activity log
  logActivity(repos.activities, {
    actorId: userId,
    actorType: 'user',
    action: 'user.avatar.uploaded',
    resourceType: 'user',
    resourceId: userId,
    metadata: { mimeType: file.mimetype },
  }).catch(() => {});

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

  // Fire-and-forget activity log
  logActivity(repos.activities, {
    actorId: userId,
    actorType: 'user',
    action: 'user.avatar.deleted',
    resourceType: 'user',
    resourceId: userId,
  }).catch(() => {});
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

// ============================================================================
// Context Bridge
// ============================================================================

/**
 * Narrow HandlerContext to UsersModuleDeps.
 *
 * @param ctx - Generic handler context from router
 * @returns Narrowed UsersModuleDeps
 * @complexity O(1)
 */
function asUsersDeps(ctx: HandlerContext): UsersModuleDeps {
  return ctx as unknown as UsersModuleDeps;
}

// ============================================================================
// HTTP Handlers
// ============================================================================

/**
 * Handle avatar upload.
 * Expects pre-parsed multipart body with buffer/mimetype/size.
 *
 * PUT /api/users/me/avatar
 *
 * @param ctx - Handler context (narrowed to UsersModuleDeps)
 * @param body - Parsed multipart file data
 * @param req - Fastify request with authenticated user
 * @returns 200 with avatarUrl, or error response
 * @complexity O(1) - single upload + database update
 */
export async function handleUploadAvatar(
  ctx: HandlerContext,
  body: unknown,
  req: FastifyRequest,
): Promise<RouteResult> {
  const deps = asUsersDeps(ctx);
  const request = req as unknown as UsersRequest;

  if (request.user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const fileData = body as
      | {
          buffer?: Buffer | Uint8Array;
          mimetype?: string;
          size?: number;
        }
      | null
      | undefined;

    if (fileData?.buffer === undefined || fileData.mimetype === undefined) {
      return { status: 400, body: { message: 'No file uploaded' } };
    }

    const buffer = Buffer.isBuffer(fileData.buffer)
      ? fileData.buffer
      : Buffer.from(fileData.buffer);

    const storage = deps.storage as unknown as StorageProvider;
    const avatarUrl = await uploadAvatar(deps.repos, storage, request.user.userId, {
      buffer,
      mimetype: fileData.mimetype,
      size: fileData.size ?? buffer.length,
    });

    return { status: 200, body: { avatarUrl } };
  } catch (error) {
    if (error instanceof BadRequestError) {
      return { status: 400, body: { message: error.message } };
    }
    if (error instanceof NotFoundError) {
      return { status: 404, body: { message: error.message } };
    }
    deps.log.error(
      error instanceof Error ? error : new Error(String(error)),
      'Failed to upload avatar',
    );
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Handle avatar deletion.
 *
 * DELETE /api/users/me/avatar
 *
 * @param ctx - Handler context (narrowed to UsersModuleDeps)
 * @param _body - Unused request body
 * @param req - Fastify request with authenticated user
 * @returns 200 on success, or error response
 * @complexity O(1) - single database lookup and update
 */
export async function handleDeleteAvatar(
  ctx: HandlerContext,
  _body: undefined,
  req: FastifyRequest,
): Promise<RouteResult> {
  const deps = asUsersDeps(ctx);
  const request = req as unknown as UsersRequest;

  if (request.user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const storage = deps.storage as unknown as StorageProvider;
    await deleteAvatar(deps.repos, storage, request.user.userId);
    return { status: 200, body: { message: 'Avatar deleted' } };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { status: 404, body: { message: error.message } };
    }
    deps.log.error(
      error instanceof Error ? error : new Error(String(error)),
      'Failed to delete avatar',
    );
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
