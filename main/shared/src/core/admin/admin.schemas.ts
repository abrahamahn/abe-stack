// main/shared/src/domain/admin/admin.schemas.ts
/**
 * Admin Schemas
 *
 * Schemas for administrative monitoring and management.
 * @module Domain/Admin
 */

import { appRoleSchema, type AppRole } from '../../types/roles';
import { paginatedResultSchema } from '../../utils/pagination';
import {
  createSchema,
  parseBoolean,
  parseNullable,
  parseNumber,
  parseOptional,
  parseString,
} from '../schema.utils';
import { emailSchema, isoDateTimeSchema, usernameSchema, uuidSchema } from '../schemas';

import type { Schema } from '../../primitives/api';

// ============================================================================
// Types
// ============================================================================

/** User statuses for administrative filtering */
export const USER_STATUSES = ['active', 'locked', 'unverified'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Admin view of a user with additional security metadata */
export interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  lockedUntil: string | null;
  lockReason: string | null;
  failedLoginAttempts: number;
  phone: string | null;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Sorting and filtering for user lists */
export interface AdminUserListFilters {
  search?: string | undefined;
  role?: AppRole | undefined;
  status?: UserStatus | undefined;
  sortBy?: 'email' | 'username' | 'firstName' | 'lastName' | 'createdAt' | 'updatedAt' | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

/** Update user details from admin context */
export interface AdminUpdateUserRequest {
  firstName?: string | undefined;
  lastName?: string | undefined;
  role?: AppRole | undefined;
}

/** Lock user account with reason */
export interface AdminLockUserRequest {
  reason: string;
  durationMinutes?: number | undefined;
}

/** Unlock user account with reason */
export interface UnlockAccountRequest {
  email?: string | undefined;
  reason: string;
}

/** Hard ban a user account with reason */
export interface AdminHardBanRequest {
  reason: string;
}

/** Response for admin hard ban operations */
export interface AdminHardBanResponse {
  message: string;
  gracePeriodEnds: string;
}

/** Suspend a tenant with reason */
export interface AdminSuspendTenantRequest {
  reason: string;
}

/** Standard admin action response */
export interface AdminActionResponse {
  message: string;
  user?: AdminUser | undefined;
}

/** Response for admin user update operations */
export interface AdminUpdateUserResponse {
  message: string;
  user: AdminUser;
}

/** Response for admin lock user operations */
export interface AdminLockUserResponse {
  message: string;
  user: AdminUser;
}

/** Response for unlock account operations */
export interface UnlockAccountResponse {
  message: string;
  email: string;
}

/** Type alias for the admin user list response */
export type AdminUserListResponse = ReturnType<typeof adminUserListResponseSchema.parse>;

// ============================================================================
// Schemas
// ============================================================================

export const userStatusSchema = createSchema((data: unknown) => {
  if (typeof data !== 'string' || !USER_STATUSES.includes(data as UserStatus)) {
    throw new Error(`Invalid user status. Expected one of: ${USER_STATUSES.join(', ')}`);
  }
  return data as UserStatus;
});

export const adminUserSchema: Schema<AdminUser> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    id: uuidSchema.parse(obj['id']),
    email: emailSchema.parse(obj['email']),
    username: usernameSchema.parse(obj['username']),
    firstName: parseString(obj['firstName'], 'firstName'),
    lastName: parseString(obj['lastName'], 'lastName'),
    role: appRoleSchema.parse(obj['role']),
    emailVerified: parseBoolean(obj['emailVerified'], 'emailVerified'),
    emailVerifiedAt: parseNullable(obj['emailVerifiedAt'], (v) => isoDateTimeSchema.parse(v)),
    lockedUntil: parseNullable(obj['lockedUntil'], (v) => isoDateTimeSchema.parse(v)),
    lockReason: parseNullable(obj['lockReason'], (v) => parseString(v, 'lockReason')),
    failedLoginAttempts: parseNumber(obj['failedLoginAttempts'], 'failedLoginAttempts', {
      int: true,
    }),
    phone: parseNullable(obj['phone'], (v) => parseString(v, 'phone')),
    phoneVerified: parseBoolean(obj['phoneVerified'], 'phoneVerified'),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
    updatedAt: isoDateTimeSchema.parse(obj['updatedAt']),
  };
});

export const adminUserListFiltersSchema: Schema<AdminUserListFilters> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      search: parseOptional(obj['search'], (v) => parseString(v, 'search', { max: 100 })),
      role: parseOptional(obj['role'], (v) => appRoleSchema.parse(v)),
      status: parseOptional(obj['status'], (v) => userStatusSchema.parse(v)),
      sortBy: parseOptional(obj['sortBy'], (v) => {
        const valid: ReadonlyArray<AdminUserListFilters['sortBy']> = [
          'email',
          'username',
          'firstName',
          'lastName',
          'createdAt',
          'updatedAt',
        ];
        if (typeof v !== 'string' || !valid.includes(v as AdminUserListFilters['sortBy'])) {
          throw new Error('Invalid sortBy');
        }
        return v as NonNullable<AdminUserListFilters['sortBy']>;
      }),
      sortOrder: parseOptional(obj['sortOrder'], (v) => {
        if (v !== 'asc' && v !== 'desc') throw new Error('Invalid sortOrder');
        return v;
      }),
      page: parseOptional(obj['page'], (v) => parseNumber(v, 'page', { int: true, min: 1 })),
      limit: parseOptional(obj['limit'], (v) =>
        parseNumber(v, 'limit', { int: true, min: 1, max: 100 }),
      ),
    };
  },
);

export const adminUserListResponseSchema = paginatedResultSchema(adminUserSchema);

export const adminUpdateUserRequestSchema: Schema<AdminUpdateUserRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const result: AdminUpdateUserRequest = {};
    if ('firstName' in obj)
      result.firstName = parseString(obj['firstName'], 'firstName', { min: 1, max: 50 });
    if ('lastName' in obj) result.lastName = parseString(obj['lastName'], 'lastName', { max: 50 });
    if ('role' in obj) result.role = appRoleSchema.parse(obj['role']);
    if (Object.keys(result).length === 0) throw new Error('At least one field must be provided');
    return result;
  },
);

export const adminLockUserRequestSchema: Schema<AdminLockUserRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      reason: parseString(obj['reason'], 'reason', { min: 1, max: 500 }),
      durationMinutes: parseOptional(obj['durationMinutes'], (v) =>
        parseNumber(v, 'durationMinutes', { int: true, min: 1, max: 43200 }),
      ),
    };
  },
);

export const unlockAccountRequestSchema: Schema<UnlockAccountRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      email: parseOptional(obj['email'], (v) => emailSchema.parse(v)),
      reason: parseString(obj['reason'], 'reason', { min: 1, max: 500 }),
    };
  },
);

export const adminHardBanRequestSchema: Schema<AdminHardBanRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      reason: parseString(obj['reason'], 'reason', { min: 1, max: 500 }),
    };
  },
);

export const adminHardBanResponseSchema: Schema<AdminHardBanResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      message: parseString(obj['message'], 'message'),
      gracePeriodEnds: isoDateTimeSchema.parse(obj['gracePeriodEnds']),
    };
  },
);

export const adminActionResponseSchema: Schema<AdminActionResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      message: parseString(obj['message'], 'message'),
      user: parseOptional(obj['user'], (v) => adminUserSchema.parse(v)),
    };
  },
);

/**
 * Schema for admin update user response.
 *
 * @complexity O(1)
 */
export const adminUpdateUserResponseSchema: Schema<AdminUpdateUserResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      message: parseString(obj['message'], 'message'),
      user: adminUserSchema.parse(obj['user']),
    };
  },
);

/**
 * Schema for admin lock user response.
 *
 * @complexity O(1)
 */
export const adminLockUserResponseSchema: Schema<AdminLockUserResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      message: parseString(obj['message'], 'message'),
      user: adminUserSchema.parse(obj['user']),
    };
  },
);

/**
 * Schema for unlock account response.
 *
 * @complexity O(1)
 */
export const unlockAccountResponseSchema: Schema<UnlockAccountResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      message: parseString(obj['message'], 'message'),
      email: emailSchema.parse(obj['email']),
    };
  },
);

export const adminSuspendTenantRequestSchema: Schema<AdminSuspendTenantRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      reason: parseString(obj['reason'], 'reason', { min: 1, max: 500 }),
    };
  },
);
