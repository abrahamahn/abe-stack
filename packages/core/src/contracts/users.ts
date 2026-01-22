// packages/core/src/contracts/users.ts
/**
 * Users Contract
 *
 * User-related types, schemas, and API contract definitions.
 */

import { z } from 'zod';

import { emailSchema, errorResponseSchema, uuidSchema } from './common';

import type { Contract } from './types';


// ============================================================================
// User Role
// ============================================================================

export const userRoleSchema = z.enum(['user', 'admin', 'moderator']);
export type UserRole = z.infer<typeof userRoleSchema>;

// ============================================================================
// User Schema
// ============================================================================

export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string().nullable(),
  role: userRoleSchema,
  createdAt: z.iso.datetime(),
});

export type User = z.infer<typeof userSchema>;

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
