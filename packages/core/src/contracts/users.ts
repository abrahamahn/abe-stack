// packages/core/src/contracts/users.ts
/**
 * Users Contract
 *
 * User-related types, schemas, and API contract definitions.
 */

import { emailSchema, errorResponseSchema, uuidSchema } from './common';
import { createSchema, type Contract, type Schema } from './types';

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
  role: UserRole;
  createdAt: string;
}

export const userSchema: Schema<User> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid user data');
  }
  const obj = data as Record<string, unknown>;

  const id = uuidSchema.parse(obj.id);
  const email = emailSchema.parse(obj.email);
  const role = userRoleSchema.parse(obj.role);

  // Validate name (nullable)
  let name: string | null = null;
  if (obj.name !== null && obj.name !== undefined) {
    if (typeof obj.name !== 'string') {
      throw new Error('Name must be a string or null');
    }
    name = obj.name;
  }

  // Validate createdAt as ISO datetime string (must include time component)
  if (typeof obj.createdAt !== 'string') {
    throw new Error('createdAt must be an ISO datetime string');
  }
  // ISO datetime format: YYYY-MM-DDTHH:mm:ss.sssZ or similar with time component
  const isoDatetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  if (!isoDatetimeRegex.test(obj.createdAt)) {
    throw new Error('createdAt must be an ISO datetime string with time component');
  }
  const createdAt = obj.createdAt;

  return { id, email, name, role, createdAt };
});

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
} satisfies Contract;
