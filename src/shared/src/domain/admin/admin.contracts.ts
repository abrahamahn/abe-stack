// src/shared/src/domain/admin/admin.contracts.ts
/**
 * Admin Contracts
 *
 * API Contract definitions for administrative management.
 * @module Domain/Admin
 */

import { errorResponseSchema, successResponseSchema } from '../../core/schemas';

import {
  adminActionResponseSchema,
  adminLockUserRequestSchema,
  adminUpdateUserRequestSchema,
  adminUserListFiltersSchema,
  adminUserListResponseSchema,
  adminUserSchema,
  unlockAccountRequestSchema,
} from './admin.schemas';

import type { Contract } from '../../core/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const adminContract = {
  /**
   * List all users with filtering and pagination.
   */
  listUsers: {
    method: 'GET' as const,
    path: '/api/admin/users',
    query: adminUserListFiltersSchema,
    responses: {
      200: successResponseSchema(adminUserListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'List all users with filtering and pagination (admin only)',
  },

  /**
   * Get a single user by ID.
   */
  getUser: {
    method: 'GET' as const,
    path: '/api/admin/users/:id',
    responses: {
      200: successResponseSchema(adminUserSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a single user by ID (admin only)',
  },

  /**
   * Update user details.
   */
  updateUser: {
    method: 'PATCH' as const,
    path: '/api/admin/users/:id',
    body: adminUpdateUserRequestSchema,
    responses: {
      200: successResponseSchema(adminActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update user details (admin only)',
  },

  /**
   * Lock a user account.
   */
  lockUser: {
    method: 'POST' as const,
    path: '/api/admin/users/:id/lock',
    body: adminLockUserRequestSchema,
    responses: {
      200: successResponseSchema(adminActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Lock a user account (admin only)',
  },

  /**
   * Unlock a locked user account (by ID).
   */
  unlockUser: {
    method: 'POST' as const,
    path: '/api/admin/users/:id/unlock',
    body: unlockAccountRequestSchema,
    responses: {
      200: successResponseSchema(adminActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Unlock a locked user account by ID (admin only)',
  },

  /**
   * Unlock a locked user account (by email/legacy).
   */
  unlockAccount: {
    method: 'POST' as const,
    path: '/api/admin/auth/unlock',
    body: unlockAccountRequestSchema,
    responses: {
      200: successResponseSchema(adminActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Unlock a locked user account (admin only)',
  },
} satisfies Contract;
