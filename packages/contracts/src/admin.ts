// packages/contracts/src/admin.ts
/**
 * Admin Contract
 *
 * Admin-related schemas and API contract definitions.
 */

import { emailSchema, errorResponseSchema, uuidSchema } from './common';
import { paginatedResultSchema } from './pagination';
import { createSchema } from './schema';
import { USER_ROLES, userRoleSchema, type UserRole } from './users';

import type { Contract, Schema } from './types';

// ============================================================================
// Admin User Types
// ============================================================================

/**
 * Admin user view - includes additional fields not exposed in regular user endpoints
 */
export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  lockedUntil: string | null;
  failedLoginAttempts: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * User status for filtering
 */
export type UserStatus = 'active' | 'locked' | 'unverified';
export const USER_STATUSES = ['active', 'locked', 'unverified'] as const;

/**
 * Filter options for listing users
 */
export interface AdminUserListFilters {
  search?: string | undefined;
  role?: UserRole | undefined;
  status?: UserStatus | undefined;
  sortBy?: 'email' | 'name' | 'createdAt' | 'updatedAt' | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

// ============================================================================
// Admin User Schemas
// ============================================================================

export const adminUserSchema: Schema<AdminUser> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid admin user data');
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

  // Boolean fields
  if (typeof obj['emailVerified'] !== 'boolean') {
    throw new Error('emailVerified must be a boolean');
  }

  // Nullable datetime strings
  let emailVerifiedAt: string | null = null;
  if (obj['emailVerifiedAt'] !== null && obj['emailVerifiedAt'] !== undefined) {
    if (typeof obj['emailVerifiedAt'] !== 'string') {
      throw new Error('emailVerifiedAt must be a string or null');
    }
    emailVerifiedAt = obj['emailVerifiedAt'];
  }

  let lockedUntil: string | null = null;
  if (obj['lockedUntil'] !== null && obj['lockedUntil'] !== undefined) {
    if (typeof obj['lockedUntil'] !== 'string') {
      throw new Error('lockedUntil must be a string or null');
    }
    lockedUntil = obj['lockedUntil'];
  }

  // Number fields
  if (typeof obj['failedLoginAttempts'] !== 'number' || !Number.isInteger(obj['failedLoginAttempts'])) {
    throw new Error('failedLoginAttempts must be an integer');
  }

  // Required datetime strings
  if (typeof obj['createdAt'] !== 'string') {
    throw new Error('createdAt must be an ISO datetime string');
  }
  if (typeof obj['updatedAt'] !== 'string') {
    throw new Error('updatedAt must be an ISO datetime string');
  }

  return {
    id,
    email,
    name,
    role,
    emailVerified: obj['emailVerified'],
    emailVerifiedAt,
    lockedUntil,
    failedLoginAttempts: obj['failedLoginAttempts'],
    createdAt: obj['createdAt'],
    updatedAt: obj['updatedAt'],
  };
});

export const userStatusSchema: Schema<UserStatus> = createSchema((data: unknown) => {
  if (typeof data !== 'string') {
    throw new Error('Status must be a string');
  }
  if (!USER_STATUSES.includes(data as UserStatus)) {
    throw new Error(`Invalid status. Must be one of: ${USER_STATUSES.join(', ')}`);
  }
  return data as UserStatus;
});

export const adminUserListFiltersSchema: Schema<AdminUserListFilters> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    const filters: AdminUserListFilters = {};

    // Search term (optional)
    if (obj['search'] !== undefined && obj['search'] !== null && obj['search'] !== '') {
      if (typeof obj['search'] !== 'string') {
        throw new Error('search must be a string');
      }
      if (obj['search'].length > 100) {
        throw new Error('search must be at most 100 characters');
      }
      filters.search = obj['search'];
    }

    // Role filter (optional)
    if (obj['role'] !== undefined && obj['role'] !== null && obj['role'] !== '') {
      filters.role = userRoleSchema.parse(obj['role']);
    }

    // Status filter (optional)
    if (obj['status'] !== undefined && obj['status'] !== null && obj['status'] !== '') {
      filters.status = userStatusSchema.parse(obj['status']);
    }

    // Sort field (optional)
    if (obj['sortBy'] !== undefined && obj['sortBy'] !== null) {
      const validSortFields = ['email', 'name', 'createdAt', 'updatedAt'] as const;
      if (
        typeof obj['sortBy'] !== 'string' ||
        !validSortFields.includes(obj['sortBy'] as (typeof validSortFields)[number])
      ) {
        throw new Error(`sortBy must be one of: ${validSortFields.join(', ')}`);
      }
      filters.sortBy = obj['sortBy'] as AdminUserListFilters['sortBy'];
    }

    // Sort order (optional)
    if (obj['sortOrder'] !== undefined && obj['sortOrder'] !== null) {
      if (obj['sortOrder'] !== 'asc' && obj['sortOrder'] !== 'desc') {
        throw new Error('sortOrder must be "asc" or "desc"');
      }
      filters.sortOrder = obj['sortOrder'];
    }

    // Page (optional)
    if (obj['page'] !== undefined && obj['page'] !== null) {
      const page = Number(obj['page']);
      if (!Number.isInteger(page) || page < 1) {
        throw new Error('page must be a positive integer');
      }
      filters.page = page;
    }

    // Limit (optional)
    if (obj['limit'] !== undefined && obj['limit'] !== null) {
      const limit = Number(obj['limit']);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new Error('limit must be an integer between 1 and 100');
      }
      filters.limit = limit;
    }

    return filters;
  },
);

// Paginated admin user list response
export const adminUserListResponseSchema = paginatedResultSchema(adminUserSchema);
export type AdminUserListResponse = ReturnType<typeof adminUserListResponseSchema.parse>;

// ============================================================================
// Update User Request/Response
// ============================================================================

export interface AdminUpdateUserRequest {
  name?: string | null;
  role?: UserRole;
}

export const adminUpdateUserRequestSchema: Schema<AdminUpdateUserRequest> = createSchema(
  (data: unknown) => {
    if (data === null || typeof data !== 'object') {
      throw new Error('Invalid update user request');
    }
    const obj = data as Record<string, unknown>;

    const result: AdminUpdateUserRequest = {};

    // Name (optional, nullable)
    if ('name' in obj) {
      if (obj['name'] === null) {
        result.name = null;
      } else if (typeof obj['name'] === 'string') {
        if (obj['name'].length < 1 || obj['name'].length > 255) {
          throw new Error('Name must be between 1 and 255 characters');
        }
        result.name = obj['name'];
      } else if (obj['name'] !== undefined) {
        throw new Error('Name must be a string or null');
      }
    }

    // Role (optional)
    if (obj['role'] !== undefined && obj['role'] !== null) {
      result.role = userRoleSchema.parse(obj['role']);
    }

    // At least one field must be provided
    if (Object.keys(result).length === 0) {
      throw new Error('At least one field must be provided for update');
    }

    return result;
  },
);

export interface AdminUpdateUserResponse {
  message: string;
  user: AdminUser;
}

export const adminUpdateUserResponseSchema: Schema<AdminUpdateUserResponse> = createSchema(
  (data: unknown) => {
    if (data === null || typeof data !== 'object') {
      throw new Error('Invalid update user response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['message'] !== 'string') {
      throw new Error('Response must have a message');
    }
    return {
      message: obj['message'],
      user: adminUserSchema.parse(obj['user']),
    };
  },
);

// ============================================================================
// Lock/Unlock User
// ============================================================================

export interface AdminLockUserRequest {
  reason: string;
  durationMinutes?: number;
}

export const adminLockUserRequestSchema: Schema<AdminLockUserRequest> = createSchema(
  (data: unknown) => {
    if (data === null || typeof data !== 'object') {
      throw new Error('Invalid lock user request');
    }
    const obj = data as Record<string, unknown>;

    if (typeof obj['reason'] !== 'string') {
      throw new Error('Reason must be a string');
    }
    if (obj['reason'].length < 1) {
      throw new Error('Reason is required');
    }
    if (obj['reason'].length > 500) {
      throw new Error('Reason must be at most 500 characters');
    }

    const result: AdminLockUserRequest = { reason: obj['reason'] };

    // Duration in minutes (optional - if not provided, locks indefinitely)
    if (obj['durationMinutes'] !== undefined && obj['durationMinutes'] !== null) {
      const duration = Number(obj['durationMinutes']);
      if (!Number.isInteger(duration) || duration < 1 || duration > 43200) {
        throw new Error('durationMinutes must be an integer between 1 and 43200 (30 days)');
      }
      result.durationMinutes = duration;
    }

    return result;
  },
);

export interface AdminLockUserResponse {
  message: string;
  user: AdminUser;
}

export const adminLockUserResponseSchema: Schema<AdminLockUserResponse> = createSchema(
  (data: unknown) => {
    if (data === null || typeof data !== 'object') {
      throw new Error('Invalid lock user response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['message'] !== 'string') {
      throw new Error('Response must have a message');
    }
    return {
      message: obj['message'],
      user: adminUserSchema.parse(obj['user']),
    };
  },
);

// ============================================================================
// Unlock Account Request/Response (existing)
// ============================================================================

export interface UnlockAccountRequest {
  email: string;
  reason: string;
}

export const unlockAccountRequestSchema: Schema<UnlockAccountRequest> = createSchema(
  (data: unknown) => {
    if (data === null || typeof data !== 'object') {
      throw new Error('Invalid unlock account request');
    }
    const obj = data as Record<string, unknown>;
    const email = emailSchema.parse(obj['email']);

    if (typeof obj['reason'] !== 'string') {
      throw new Error('Reason must be a string');
    }
    if (obj['reason'].length < 1) {
      throw new Error('Reason is required');
    }
    if (obj['reason'].length > 500) {
      throw new Error('Reason must be at most 500 characters');
    }

    return { email, reason: obj['reason'] };
  },
);

export interface UnlockAccountResponse {
  message: string;
  email: string;
}

export const unlockAccountResponseSchema: Schema<UnlockAccountResponse> = createSchema(
  (data: unknown) => {
    if (data === null || typeof data !== 'object') {
      throw new Error('Invalid unlock account response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['message'] !== 'string') {
      throw new Error('Message must be a string');
    }
    return {
      message: obj['message'],
      email: emailSchema.parse(obj['email']),
    };
  },
);

// ============================================================================
// Admin Contract
// ============================================================================

export const adminContract = {
  // User listing
  listUsers: {
    method: 'GET' as const,
    path: '/api/admin/users',
    query: adminUserListFiltersSchema,
    responses: {
      '200': adminUserListResponseSchema,
      '401': errorResponseSchema,
      '403': errorResponseSchema,
    },
    summary: 'List all users with filtering and pagination (admin only)',
  },

  // Get single user
  getUser: {
    method: 'GET' as const,
    path: '/api/admin/users/:id',
    responses: {
      '200': adminUserSchema,
      '401': errorResponseSchema,
      '403': errorResponseSchema,
      '404': errorResponseSchema,
    },
    summary: 'Get a single user by ID (admin only)',
  },

  // Update user
  updateUser: {
    method: 'PATCH' as const,
    path: '/api/admin/users/:id',
    body: adminUpdateUserRequestSchema,
    responses: {
      '200': adminUpdateUserResponseSchema,
      '400': errorResponseSchema,
      '401': errorResponseSchema,
      '403': errorResponseSchema,
      '404': errorResponseSchema,
    },
    summary: 'Update user details (admin only)',
  },

  // Lock user
  lockUser: {
    method: 'POST' as const,
    path: '/api/admin/users/:id/lock',
    body: adminLockUserRequestSchema,
    responses: {
      '200': adminLockUserResponseSchema,
      '400': errorResponseSchema,
      '401': errorResponseSchema,
      '403': errorResponseSchema,
      '404': errorResponseSchema,
    },
    summary: 'Lock a user account (admin only)',
  },

  // Unlock user
  unlockUser: {
    method: 'POST' as const,
    path: '/api/admin/users/:id/unlock',
    body: unlockAccountRequestSchema,
    responses: {
      '200': adminLockUserResponseSchema,
      '401': errorResponseSchema,
      '403': errorResponseSchema,
      '404': errorResponseSchema,
    },
    summary: 'Unlock a locked user account by ID (admin only)',
  },

  // Legacy unlock (by email)
  unlockAccount: {
    method: 'POST' as const,
    path: '/api/admin/auth/unlock',
    body: unlockAccountRequestSchema,
    responses: {
      '200': unlockAccountResponseSchema,
      '401': errorResponseSchema,
      '403': errorResponseSchema,
      '404': errorResponseSchema,
    },
    summary: 'Unlock a locked user account (admin only)',
  },
} satisfies Contract;

// Re-export USER_ROLES for convenience
export { USER_ROLES };
