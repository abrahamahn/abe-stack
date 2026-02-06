// packages/shared/src/domain/users/users.schemas.ts

/**
 * @file User Schemas
 * @description Schemas and types for user profiles, sessions, and settings.
 * @module Domain/Users
 */

import { emailSchema, isoDateTimeSchema, passwordSchema } from '../../contracts/common';
import {
  createSchema,
  parseBoolean,
  parseNullable,
  parseNumber,
  parseOptional,
  parseString,
} from '../../contracts/schema';
import { userIdSchema } from '../../types/ids';
import { appRoleSchema } from '../../types/roles';

import type { Schema } from '../../contracts/types';
import type { UserId } from '../../types/ids';
import type { AppRole } from '../../types/roles';

// ============================================================================
// Shared Types & Re-exports
// ============================================================================

export { userIdSchema };
export type { UserId } from '../../types/ids';

// Re-export AppRole from core types
export { APP_ROLES, appRoleSchema, type AppRole } from '../../types/roles';

// Re-export error response
export { errorResponseSchema, type ErrorResponse } from '../../contracts/common';

// ============================================================================
// Types
// ============================================================================

/** Full user entity */
export interface User {
  id: UserId;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: AppRole;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Update profile request */
export interface UpdateProfileRequest {
  name?: string | null | undefined;
  email?: string | undefined;
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
    name: parseNullable(obj['name'], (v) => parseString(v, 'name')),
    avatarUrl: parseNullable(obj['avatarUrl'], (v) => parseString(v, 'avatarUrl', { url: true })),
    role: appRoleSchema.parse(obj['role']),
    isVerified: parseBoolean(obj['isVerified'], 'isVerified'),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
    updatedAt: isoDateTimeSchema.parse(obj['updatedAt']),
  };
});

export const updateProfileRequestSchema: Schema<UpdateProfileRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      name:
        obj['name'] === undefined
          ? undefined
          : parseNullable(obj['name'], (v) => parseString(v, 'name', { min: 2, max: 100 })),
      email: parseOptional(obj['email'], (v) => emailSchema.parse(v)),
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
