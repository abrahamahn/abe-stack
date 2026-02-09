// src/shared/src/domain/users/users.schemas.ts

/**
 * @file User Schemas
 * @description Schemas and types for user profiles, sessions, and settings.
 * @module Domain/Users
 */

import {
  createSchema,
  parseBoolean,
  parseNullable,
  parseNullableOptional,
  parseNumber,
  parseOptional,
  parseString,
} from '../../core/schema.utils';
import { emailSchema, isoDateTimeSchema, passwordSchema } from '../../core/schemas';
import { userIdSchema } from '../../types/ids';
import { appRoleSchema } from '../../types/roles';

import type { Schema } from '../../core/api';
import type { UserId } from '../../types/ids';
import type { AppRole } from '../../types/roles';

// ============================================================================
// Shared Types & Re-exports
// ============================================================================

export { userIdSchema };
export type { UserId } from '../../types/ids';

// Re-export AppRole from core types (plus legacy aliases)
export {
  APP_ROLES,
  appRoleSchema,
  USER_ROLES,
  userRoleSchema,
  type AppRole,
  type UserRole,
} from '../../types/roles';

// Re-export error response
export { errorResponseSchema } from '../../core/schemas';
export type { ErrorResponse } from '../../core/api';

// ============================================================================
// Types
// ============================================================================

/** Full user entity (API-facing, ISO date strings) */
export interface User {
  /** User's unique identifier (branded) */
  id: UserId;
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
  /** User's role in the system */
  role: AppRole;
  /** Whether user's email is verified */
  emailVerified: boolean;
  /** User's phone number */
  phone: string | null;
  /** Whether user's phone is verified */
  phoneVerified: boolean | null;
  /** User's date of birth as ISO date string */
  dateOfBirth: string | null;
  /** User's gender */
  gender: string | null;
  /** ISO 8601 string of when the user was created */
  createdAt: string;
  /** ISO 8601 string of when the user was last updated */
  updatedAt: string;
}

/** Update profile request */
export interface UpdateProfileRequest {
  firstName?: string | undefined;
  lastName?: string | undefined;
  email?: string | undefined;
  phone?: string | null | undefined;
  dateOfBirth?: string | null | undefined;
  gender?: string | null | undefined;
}

/** Change password request */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Change password response */
export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

/** Avatar upload response */
export interface AvatarUploadResponse {
  avatarUrl: string;
}

/** Avatar delete response */
export interface AvatarDeleteResponse {
  success: boolean;
}

/** Session entity */
export interface Session {
  id: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
  device: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
}

/** Sessions list response */
export interface SessionsListResponse {
  sessions: Session[];
}

/** Revoke session response */
export interface RevokeSessionResponse {
  success: boolean;
}

/** Revoke all sessions response */
export interface RevokeAllSessionsResponse {
  success: boolean;
  revokedCount: number;
}

// ============================================================================
// User & Profile Schemas
// ============================================================================

export const userSchema: Schema<User> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: userIdSchema.parse(obj['id']),
    email: emailSchema.parse(obj['email']),
    username: parseString(obj['username'], 'username'),
    firstName: parseString(obj['firstName'], 'firstName'),
    lastName: parseString(obj['lastName'], 'lastName'),
    avatarUrl: parseNullable(obj['avatarUrl'], (v) => parseString(v, 'avatarUrl', { url: true })),
    role: appRoleSchema.parse(obj['role']),
    emailVerified: parseBoolean(obj['emailVerified'], 'emailVerified'),
    phone: parseNullable(obj['phone'], (v) => parseString(v, 'phone')),
    phoneVerified: parseNullable(obj['phoneVerified'], (v) => parseBoolean(v, 'phoneVerified')),
    dateOfBirth: parseNullable(obj['dateOfBirth'], (v) => parseString(v, 'dateOfBirth')),
    gender: parseNullable(obj['gender'], (v) => parseString(v, 'gender')),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
    updatedAt: isoDateTimeSchema.parse(obj['updatedAt']),
  };
});

export const updateProfileRequestSchema: Schema<UpdateProfileRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      firstName: parseOptional(obj['firstName'], (v) =>
        parseString(v, 'firstName', { min: 1, max: 100 }),
      ),
      lastName: parseOptional(obj['lastName'], (v) =>
        parseString(v, 'lastName', { min: 1, max: 100 }),
      ),
      email: parseOptional(obj['email'], (v) => emailSchema.parse(v)),
      phone: parseNullableOptional(obj['phone'], (v) => parseString(v, 'phone')),
      dateOfBirth: parseNullableOptional(obj['dateOfBirth'], (v) => parseString(v, 'dateOfBirth')),
      gender: parseNullableOptional(obj['gender'], (v) => parseString(v, 'gender')),
    };
  },
);

// ============================================================================
// Security & Password Schemas
// ============================================================================

export const changePasswordRequestSchema: Schema<ChangePasswordRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      currentPassword: parseString(obj['currentPassword'], 'currentPassword', { min: 1 }),
      newPassword: passwordSchema.parse(obj['newPassword']),
    };
  },
);

export const changePasswordResponseSchema: Schema<ChangePasswordResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      success: parseBoolean(obj['success'], 'success'),
      message: parseString(obj['message'], 'message'),
    };
  },
);

// ============================================================================
// Avatar Schemas
// ============================================================================

export const avatarUploadResponseSchema: Schema<AvatarUploadResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      avatarUrl: parseString(obj['avatarUrl'], 'avatarUrl'),
    };
  },
);

export const avatarDeleteResponseSchema: Schema<AvatarDeleteResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      success: parseBoolean(obj['success'], 'success'),
    };
  },
);

// ============================================================================
// Session Schemas
// ============================================================================

export const sessionSchema: Schema<Session> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: parseString(obj['id'], 'id', { uuid: true }),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
    expiresAt: isoDateTimeSchema.parse(obj['expiresAt']),
    lastUsedAt: isoDateTimeSchema.parse(obj['lastUsedAt']),
    device: parseNullable(obj['device'], (v) => parseString(v, 'device')),
    ipAddress: parseNullable(obj['ipAddress'], (v) => parseString(v, 'ipAddress')),
    userAgent: parseNullable(obj['userAgent'], (v) => parseString(v, 'userAgent')),
    isCurrent: parseBoolean(obj['isCurrent'], 'isCurrent'),
  };
});

export const sessionsListResponseSchema: Schema<SessionsListResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    if (!Array.isArray(obj['sessions'])) {
      throw new Error('sessions must be an array');
    }
    const sessions = obj['sessions'].map((item: unknown) => sessionSchema.parse(item));

    return { sessions };
  },
);

export const revokeSessionResponseSchema: Schema<RevokeSessionResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      success: parseBoolean(obj['success'], 'success'),
    };
  },
);

export const revokeAllSessionsResponseSchema: Schema<RevokeAllSessionsResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      success: parseBoolean(obj['success'], 'success'),
      revokedCount: parseNumber(obj['revokedCount'], 'revokedCount'),
    };
  },
);
