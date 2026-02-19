// main/shared/src/core/users/users.schemas.ts

/**
 * @file User Schemas
 * @description Schemas and types for user profiles, sessions, and settings.
 * @module Core/Users
 */

import {
  createSchema,
  parseBoolean,
  parseNullable,
  parseNullableOptional,
  parseNumber,
  parseOptional,
  parseString,
} from '../../primitives/schema';
import { userIdSchema } from '../../primitives/schema/ids';
import { cursorPaginatedResultSchema } from '../../system/pagination/pagination';
import { appRoleSchema } from '../auth/roles';
import { APP_ROLES } from '../constants/auth';
import { emailSchema, isoDateTimeSchema, passwordSchema } from '../schemas';

import type { Schema } from '../../primitives/schema';
import type { UserId } from '../../primitives/schema/ids';
import type { AppRole } from '../auth/roles';

// ============================================================================
// Shared Types & Re-exports
// ============================================================================

export { userIdSchema };
export type { UserId };

// Re-export AppRole from core types (plus legacy aliases)
export { APP_ROLES, appRoleSchema, type AppRole };
export const USER_ROLES = APP_ROLES;
export const userRoleSchema = appRoleSchema;
export type UserRole = AppRole;

// ============================================================================
// Types
// ============================================================================

/** Full user entity (API-facing, ISO date strings) */
export interface User {
  /** User's unique identifier (branded) */
  id: UserId;
  /** User's email address */
  email: string;
  /** User's unique username — null for users without one (e.g. new OAuth users) */
  username: string | null;
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
  /** User's bio/about text */
  bio?: string | null | undefined;
  /** User's city */
  city?: string | null | undefined;
  /** User's state/province */
  state?: string | null | undefined;
  /** User's country */
  country?: string | null | undefined;
  /** User's preferred language */
  language?: string | null | undefined;
  /** User's website URL */
  website?: string | null | undefined;
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
  bio?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  country?: string | null | undefined;
  language?: string | null | undefined;
  website?: string | null | undefined;
}

/** Profile completeness response */
export interface ProfileCompletenessResponse {
  /** Percentage of profile fields that are filled (0-100) */
  percentage: number;
  /** List of field names that are not yet filled */
  missingFields: string[];
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

/** Avatar upload request body after multipart parser normalization */
export interface AvatarUploadRequest {
  buffer: Uint8Array;
  mimetype: string;
  size?: number | undefined;
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

/** Active session count response */
export interface SessionCountResponse {
  count: number;
}

/** Cursor-paginated users list response */
export interface UsersListResponse {
  data: User[];
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
}

// ============================================================================
// User & Profile Schemas
// ============================================================================

export const userSchema: Schema<User> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: userIdSchema.parse(obj['id']),
    email: emailSchema.parse(obj['email']),
    username: parseNullable(obj['username'], (v) => parseString(v, 'username')),
    firstName: parseString(obj['firstName'], 'firstName'),
    lastName: parseString(obj['lastName'], 'lastName'),
    avatarUrl: parseNullable(obj['avatarUrl'], (v) => parseString(v, 'avatarUrl', { url: true })),
    role: appRoleSchema.parse(obj['role']),
    emailVerified: parseBoolean(obj['emailVerified'], 'emailVerified'),
    phone: parseNullable(obj['phone'], (v) => parseString(v, 'phone')),
    phoneVerified: parseNullable(obj['phoneVerified'], (v) => parseBoolean(v, 'phoneVerified')),
    dateOfBirth: parseNullable(obj['dateOfBirth'], (v) => parseString(v, 'dateOfBirth')),
    gender: parseNullable(obj['gender'], (v) => parseString(v, 'gender')),
    bio: parseNullableOptional(obj['bio'], (v) => parseString(v, 'bio')),
    city: parseNullableOptional(obj['city'], (v) => parseString(v, 'city')),
    state: parseNullableOptional(obj['state'], (v) => parseString(v, 'state')),
    country: parseNullableOptional(obj['country'], (v) => parseString(v, 'country')),
    language: parseNullableOptional(obj['language'], (v) => parseString(v, 'language')),
    website: parseNullableOptional(obj['website'], (v) => parseString(v, 'website')),
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
      bio: parseNullableOptional(obj['bio'], (v) => parseString(v, 'bio', { max: 500 })),
      city: parseNullableOptional(obj['city'], (v) => parseString(v, 'city', { max: 100 })),
      state: parseNullableOptional(obj['state'], (v) => parseString(v, 'state', { max: 100 })),
      country: parseNullableOptional(obj['country'], (v) =>
        parseString(v, 'country', { max: 100 }),
      ),
      language: parseNullableOptional(obj['language'], (v) =>
        parseString(v, 'language', { max: 100 }),
      ),
      website: parseNullableOptional(obj['website'], (v) =>
        parseString(v, 'website', { url: true }),
      ),
    };
  },
);

export const profileCompletenessResponseSchema: Schema<ProfileCompletenessResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      percentage: parseNumber(obj['percentage'], 'percentage'),
      missingFields: Array.isArray(obj['missingFields'])
        ? obj['missingFields'].map((item: unknown) => parseString(item, 'missingFields[]'))
        : ((): never => {
            throw new Error('missingFields must be an array');
          })(),
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

export const avatarUploadRequestSchema: Schema<AvatarUploadRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const buffer = obj['buffer'];
    if (!(buffer instanceof Uint8Array)) {
      throw new Error('buffer must be a Uint8Array');
    }

    return {
      buffer,
      mimetype: parseString(obj['mimetype'], 'mimetype', { min: 1 }),
      size: parseOptional(obj['size'], (v) => parseNumber(v, 'size', { int: true, min: 0 })),
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

export const sessionCountResponseSchema: Schema<SessionCountResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      count: parseNumber(obj['count'], 'count', { int: true, min: 0 }),
    };
  },
);

export const usersListResponseSchema: Schema<UsersListResponse> =
  cursorPaginatedResultSchema(userSchema);
