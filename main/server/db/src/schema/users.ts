// main/server/db/src/schema/users.ts
/**
 * Users Schema Types
 *
 * Explicit TypeScript interfaces for users and refresh_tokens tables.
 * These replace Drizzle's inferred types with explicit definitions.
 *
 * @see 0000_init.sql - Original users table
 * @see 0012_user_profile.sql - Profile expansion (username, firstName/lastName, profile fields)
 */

import type { UserRole } from '@abe-stack/shared';
export type { UserRole };

// ============================================================================
// Table Names
// ============================================================================

export const USERS_TABLE = 'users';
export const REFRESH_TOKENS_TABLE = 'refresh_tokens';

// ============================================================================
// User Types
// ============================================================================

/**
 * User roles - matches core UserRole type
 */
// export type UserRole = 'user' | 'admin' | 'moderator'; // Imported from kernel

/**
 * User record from database (SELECT result).
 *
 * @see 0012_user_profile.sql for profile expansion fields
 */
export interface User {
  id: string;
  email: string;
  canonicalEmail: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: UserRole;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  lockedUntil: Date | null;
  lockReason: string | null;
  failedLoginAttempts: number;
  totpSecret: string | null;
  totpEnabled: boolean;
  phone: string | null;
  phoneVerified: boolean | null;
  dateOfBirth: Date | null;
  gender: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bio: string | null;
  language: string | null;
  website: string | null;
  lastUsernameChange: Date | null;
  deactivatedAt: Date | null;
  deletedAt: Date | null;
  deletionGracePeriodEnds: Date | null;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/**
 * Data for creating a new user (INSERT).
 * id, createdAt, updatedAt, version are auto-generated.
 */
export interface NewUser {
  id?: string;
  email: string;
  canonicalEmail: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  role?: UserRole;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  lockedUntil?: Date | null;
  lockReason?: string | null;
  failedLoginAttempts?: number;
  totpSecret?: string | null;
  totpEnabled?: boolean;
  phone?: string | null;
  phoneVerified?: boolean | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  bio?: string | null;
  language?: string | null;
  website?: string | null;
  lastUsernameChange?: Date | null;
  deactivatedAt?: Date | null;
  deletedAt?: Date | null;
  deletionGracePeriodEnds?: Date | null;
  tokenVersion?: number;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

/**
 * Data for updating a user (UPDATE).
 * All fields optional except those managed by triggers.
 */
export interface UpdateUser {
  email?: string;
  canonicalEmail?: string;
  username?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  role?: UserRole;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  lockedUntil?: Date | null;
  lockReason?: string | null;
  failedLoginAttempts?: number;
  totpSecret?: string | null;
  totpEnabled?: boolean;
  phone?: string | null;
  phoneVerified?: boolean | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  bio?: string | null;
  language?: string | null;
  website?: string | null;
  lastUsernameChange?: Date | null;
  deactivatedAt?: Date | null;
  deletedAt?: Date | null;
  deletionGracePeriodEnds?: Date | null;
  tokenVersion?: number;
  updatedAt?: Date;
  version?: number;
}

// ============================================================================
// Refresh Token Types
// ============================================================================

/**
 * Refresh token record from database (SELECT result)
 */
export interface RefreshToken {
  id: string;
  userId: string;
  familyId: string | null;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Data for creating a new refresh token (INSERT)
 */
export interface NewRefreshToken {
  id?: string;
  userId: string;
  familyId?: string | null;
  token: string;
  expiresAt: Date;
  createdAt?: Date;
}

// ============================================================================
// Column Name Mappings (snake_case for SQL, camelCase for TS)
// ============================================================================

/**
 * Column mappings for users table.
 * Maps camelCase TypeScript property names to snake_case SQL column names.
 */
export const USER_COLUMNS = {
  id: 'id',
  email: 'email',
  canonicalEmail: 'canonical_email',
  username: 'username',
  passwordHash: 'password_hash',
  firstName: 'first_name',
  lastName: 'last_name',
  avatarUrl: 'avatar_url',
  role: 'role',
  emailVerified: 'email_verified',
  emailVerifiedAt: 'email_verified_at',
  lockedUntil: 'locked_until',
  lockReason: 'lock_reason',
  failedLoginAttempts: 'failed_login_attempts',
  totpSecret: 'totp_secret',
  totpEnabled: 'totp_enabled',
  phone: 'phone',
  phoneVerified: 'phone_verified',
  dateOfBirth: 'date_of_birth',
  gender: 'gender',
  city: 'city',
  state: 'state',
  country: 'country',
  bio: 'bio',
  language: 'language',
  website: 'website',
  lastUsernameChange: 'last_username_change',
  deactivatedAt: 'deactivated_at',
  deletedAt: 'deleted_at',
  deletionGracePeriodEnds: 'deletion_grace_period_ends',
  tokenVersion: 'token_version',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  version: 'version',
} as const;

/**
 * Column mappings for refresh_tokens table
 */
export const REFRESH_TOKEN_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  familyId: 'family_id',
  token: 'token',
  expiresAt: 'expires_at',
  createdAt: 'created_at',
} as const;
