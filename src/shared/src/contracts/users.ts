// packages/shared/src/contracts/users.ts
/**
 * Users Contract
 *
 * User-related types, schemas, and API contract definitions.
 */

import { emailSchema, errorResponseSchema, passwordSchema, uuidSchema } from './common';
import { createSchema } from './schema';

import type { Contract, Schema } from './types';

// ============================================================================
// User Role
// ============================================================================

export const USER_ROLES = ['user', 'admin', 'moderator'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const userRoleSchema: Schema<UserRole> = createSchema((data: unknown) => {
  if (typeof data !== 'string') {
    throw new Error('Role must be a string');
  }
  if (!USER_ROLES.includes(data as UserRole)) {
    throw new Error(`Invalid role. Must be one of: ${USER_ROLES.join(', ')}`);
  }
  return data as UserRole;
});

// ============================================================================
// User Schema
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export const userSchema: Schema<User> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid user data');
  }
  const obj = data as Record<string, unknown>;

  const id = uuidSchema.parse(obj['id']);
  const email = emailSchema.parse(obj['email']);
  const role = userRoleSchema.parse(obj['role']);

  // Validate name (nullable)
  let name: string | null = null;
  if (obj['name'] !== null && obj['name'] !== undefined) {
    if (typeof obj['name'] !== 'string') {
      throw new Error('Name must be a string or null');
    }
    name = obj['name'];
  }

  // Validate avatarUrl (nullable)
  let avatarUrl: string | null = null;
  if (obj['avatarUrl'] !== null && obj['avatarUrl'] !== undefined) {
    if (typeof obj['avatarUrl'] !== 'string') {
      throw new Error('avatarUrl must be a string or null');
    }
    avatarUrl = obj['avatarUrl'];
  }

  // Validate createdAt as ISO datetime string (must include time component)
  if (typeof obj['createdAt'] !== 'string') {
    throw new Error('createdAt must be an ISO datetime string');
  }
  // ISO datetime format: YYYY-MM-DDTHH:mm:ss.sssZ or similar with time component
  const isoDatetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  if (!isoDatetimeRegex.test(obj['createdAt'])) {
    throw new Error('createdAt must be an ISO datetime string with time component');
  }
  const createdAt = obj['createdAt'];

  // Validate isVerified (boolean)
  if (typeof obj['isVerified'] !== 'boolean') {
    throw new Error('isVerified must be a boolean');
  }
  const isVerified = obj['isVerified'];

  // Validate updatedAt as ISO datetime string
  if (typeof obj['updatedAt'] !== 'string') {
    throw new Error('updatedAt must be an ISO datetime string');
  }
  if (!isoDatetimeRegex.test(obj['updatedAt'])) {
    throw new Error('updatedAt must be an ISO datetime string with time component');
  }
  const updatedAt = obj['updatedAt'];

  return { id, email, name, avatarUrl, role, isVerified, createdAt, updatedAt };
});

// ============================================================================
// Profile Update Schema
// ============================================================================

export interface UpdateProfileRequest {
  name?: string | null;
}

export const updateProfileRequestSchema: Schema<UpdateProfileRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid update profile request');
    }
    const obj = data as Record<string, unknown>;

    const result: UpdateProfileRequest = {};

    if ('name' in obj) {
      if (obj['name'] !== null && obj['name'] !== undefined) {
        if (typeof obj['name'] !== 'string') {
          throw new Error('Name must be a string or null');
        }
        if (obj['name'].length > 0 && obj['name'].length < 2) {
          throw new Error('Name must be at least 2 characters');
        }
        if (obj['name'].length > 100) {
          throw new Error('Name must be at most 100 characters');
        }
      }
      result.name = obj['name'] as string | null;
    }

    return result;
  },
);

// ============================================================================
// Password Change Schema
// ============================================================================

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const changePasswordRequestSchema: Schema<ChangePasswordRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid change password request');
    }
    const obj = data as Record<string, unknown>;

    if (typeof obj['currentPassword'] !== 'string') {
      throw new Error('Current password is required');
    }
    if (obj['currentPassword'].length === 0) {
      throw new Error('Current password cannot be empty');
    }

    const newPassword = passwordSchema.parse(obj['newPassword']);

    return {
      currentPassword: obj['currentPassword'],
      newPassword,
    };
  },
);

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export const changePasswordResponseSchema: Schema<ChangePasswordResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid change password response');
    }
    const obj = data as Record<string, unknown>;

    if (typeof obj['success'] !== 'boolean') {
      throw new Error('success must be a boolean');
    }
    if (typeof obj['message'] !== 'string') {
      throw new Error('message must be a string');
    }

    return {
      success: obj['success'],
      message: obj['message'],
    };
  },
);

// ============================================================================
// Avatar Schema
// ============================================================================

export interface AvatarUploadResponse {
  avatarUrl: string;
}

export const avatarUploadResponseSchema: Schema<AvatarUploadResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid avatar upload response');
    }
    const obj = data as Record<string, unknown>;

    if (typeof obj['avatarUrl'] !== 'string') {
      throw new Error('avatarUrl must be a string');
    }

    return { avatarUrl: obj['avatarUrl'] };
  },
);

export interface AvatarDeleteResponse {
  success: boolean;
}

export const avatarDeleteResponseSchema: Schema<AvatarDeleteResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid avatar delete response');
    }
    const obj = data as Record<string, unknown>;

    if (typeof obj['success'] !== 'boolean') {
      throw new Error('success must be a boolean');
    }

    return { success: obj['success'] };
  },
);

// ============================================================================
// Session Schema
// ============================================================================

export interface Session {
  id: string;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
}

export const sessionSchema: Schema<Session> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid session data');
  }
  const obj = data as Record<string, unknown>;

  const id = uuidSchema.parse(obj['id']);

  if (typeof obj['createdAt'] !== 'string') {
    throw new Error('createdAt must be an ISO datetime string');
  }
  const isoDatetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  if (!isoDatetimeRegex.test(obj['createdAt'])) {
    throw new Error('createdAt must be an ISO datetime string with time component');
  }

  let ipAddress: string | null = null;
  if (obj['ipAddress'] !== null && obj['ipAddress'] !== undefined) {
    if (typeof obj['ipAddress'] !== 'string') {
      throw new Error('ipAddress must be a string or null');
    }
    ipAddress = obj['ipAddress'];
  }

  let userAgent: string | null = null;
  if (obj['userAgent'] !== null && obj['userAgent'] !== undefined) {
    if (typeof obj['userAgent'] !== 'string') {
      throw new Error('userAgent must be a string or null');
    }
    userAgent = obj['userAgent'];
  }

  if (typeof obj['isCurrent'] !== 'boolean') {
    throw new Error('isCurrent must be a boolean');
  }

  return {
    id,
    createdAt: obj['createdAt'],
    ipAddress,
    userAgent,
    isCurrent: obj['isCurrent'],
  };
});

export interface SessionsListResponse {
  sessions: Session[];
}

export const sessionsListResponseSchema: Schema<SessionsListResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid sessions list response');
    }
    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj['sessions'])) {
      throw new Error('sessions must be an array');
    }

    const sessions = obj['sessions'].map((s) => sessionSchema.parse(s));

    return { sessions };
  },
);

export interface RevokeSessionResponse {
  success: boolean;
}

export const revokeSessionResponseSchema: Schema<RevokeSessionResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid revoke session response');
    }
    const obj = data as Record<string, unknown>;

    if (typeof obj['success'] !== 'boolean') {
      throw new Error('success must be a boolean');
    }

    return { success: obj['success'] };
  },
);

export interface RevokeAllSessionsResponse {
  success: boolean;
  revokedCount: number;
}

export const revokeAllSessionsResponseSchema: Schema<RevokeAllSessionsResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid revoke all sessions response');
    }
    const obj = data as Record<string, unknown>;

    if (typeof obj['success'] !== 'boolean') {
      throw new Error('success must be a boolean');
    }
    if (typeof obj['revokedCount'] !== 'number') {
      throw new Error('revokedCount must be a number');
    }

    return { success: obj['success'], revokedCount: obj['revokedCount'] };
  },
);

// ============================================================================
// Users Contract
// ============================================================================

export const usersContract = {
  me: {
    method: 'GET' as const,
    path: '/api/users/me',
    responses: {
      200: userSchema,
      401: errorResponseSchema,
    },
    summary: 'Get current user profile',
  },
  updateProfile: {
    method: 'PATCH' as const,
    path: '/api/users/me',
    body: updateProfileRequestSchema,
    responses: {
      200: userSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Update current user profile',
  },
  uploadAvatar: {
    method: 'POST' as const,
    path: '/api/users/me/avatar',
    // Note: Body is multipart/form-data, handled specially by handler
    responses: {
      200: avatarUploadResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Upload user avatar',
  },
  deleteAvatar: {
    method: 'DELETE' as const,
    path: '/api/users/me/avatar',
    responses: {
      200: avatarDeleteResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Delete user avatar',
  },
  changePassword: {
    method: 'POST' as const,
    path: '/api/users/me/password',
    body: changePasswordRequestSchema,
    responses: {
      200: changePasswordResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Change user password',
  },
  listSessions: {
    method: 'GET' as const,
    path: '/api/users/me/sessions',
    responses: {
      200: sessionsListResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'List user sessions',
  },
  revokeSession: {
    method: 'DELETE' as const,
    path: '/api/users/me/sessions/:id',
    responses: {
      200: revokeSessionResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Revoke a specific session',
  },
  revokeAllSessions: {
    method: 'POST' as const,
    path: '/api/users/me/sessions/revoke-all',
    responses: {
      200: revokeAllSessionsResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Revoke all sessions except current',
  },
} satisfies Contract;
