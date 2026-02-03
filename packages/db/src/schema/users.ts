// packages/db/src/schema/users.ts
/**
 * Users Schema Types
 *
 * Explicit TypeScript interfaces for users and refresh_tokens tables.
 * These replace Drizzle's inferred types with explicit definitions.
 */

import type { UserRole } from './types/roles';
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
 * User record from database (SELECT result)
 */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  lockedUntil: Date | null;
  failedLoginAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/**
 * Data for creating a new user (INSERT)
 * id, createdAt, updatedAt, version are auto-generated
 */
export interface NewUser {
  id?: string;
  email: string;
  passwordHash: string;
  name?: string | null;
  avatarUrl?: string | null;
  role?: UserRole;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  lockedUntil?: Date | null;
  failedLoginAttempts?: number;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

/**
 * Data for updating a user (UPDATE)
 * All fields optional except those managed by triggers
 */
export interface UpdateUser {
  email?: string;
  passwordHash?: string;
  name?: string | null;
  avatarUrl?: string | null;
  role?: UserRole;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  lockedUntil?: Date | null;
  failedLoginAttempts?: number;
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
 * Column mappings for users table
 */
export const USER_COLUMNS = {
  id: 'id',
  email: 'email',
  passwordHash: 'password_hash',
  name: 'name',
  avatarUrl: 'avatar_url',
  role: 'role',
  emailVerified: 'email_verified',
  emailVerifiedAt: 'email_verified_at',
  lockedUntil: 'locked_until',
  failedLoginAttempts: 'failed_login_attempts',
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
