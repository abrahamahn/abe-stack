// packages/core/src/contracts/users.ts
/**
 * Users Contract
 *
 * User-related types, schemas, and API contract definitions.
 */

import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { emailSchema, errorResponseSchema, uuidSchema } from './common';

// ============================================================================
// User Role
// ============================================================================

export const USER_ROLES = ['user', 'admin', 'moderator'] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

// ============================================================================
// User Schema
// ============================================================================

export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string().nullable(),
  role: userRoleSchema,
});

export type User = z.infer<typeof userSchema>;

export const userResponseSchema = userSchema.extend({
  createdAt: z.iso.datetime(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

// ============================================================================
// Users Contract
// ============================================================================

const c = initContract();

export const usersContract = c.router({
  me: {
    method: 'GET',
    path: '/api/users/me',
    responses: {
      200: userResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Get current user profile',
  },
});
