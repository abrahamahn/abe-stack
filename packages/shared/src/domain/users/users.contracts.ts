// shared/src/domain/users/users.contracts.ts

/**
 * @file User Contracts
 * @description API Contract definitions for User management (Profile, Sessions, Avatar).
 * @module Domain/Users
 */

import { errorResponseSchema, successResponseSchema } from '../../core/schemas';

import {
  avatarDeleteResponseSchema,
  avatarUploadResponseSchema,
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  revokeAllSessionsResponseSchema,
  revokeSessionResponseSchema,
  sessionsListResponseSchema,
  updateProfileRequestSchema,
  userSchema,
} from './users.schemas';

import type { Contract } from '../../core/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const usersContract = {
  // --------------------------------------------------------------------------
  // Profile Management
  // --------------------------------------------------------------------------
  me: {
    method: 'GET' as const,
    path: '/api/users/me',
    responses: {
      200: successResponseSchema(userSchema),
      401: errorResponseSchema,
    },
    summary: 'Get current user profile',
  },

  updateProfile: {
    method: 'PATCH' as const,
    path: '/api/users/me',
    body: updateProfileRequestSchema,
    responses: {
      200: successResponseSchema(userSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Update current user profile',
  },

  changePassword: {
    method: 'POST' as const,
    path: '/api/users/me/password',
    body: changePasswordRequestSchema,
    responses: {
      200: successResponseSchema(changePasswordResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Change user password',
  },

  // --------------------------------------------------------------------------
  // Avatar
  // --------------------------------------------------------------------------
  uploadAvatar: {
    method: 'POST' as const,
    path: '/api/users/me/avatar',
    responses: {
      200: successResponseSchema(avatarUploadResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Upload user avatar',
  },

  deleteAvatar: {
    method: 'DELETE' as const,
    path: '/api/users/me/avatar',
    responses: {
      200: successResponseSchema(avatarDeleteResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Delete user avatar',
  },

  // --------------------------------------------------------------------------
  // Session Management
  // --------------------------------------------------------------------------
  listSessions: {
    method: 'GET' as const,
    path: '/api/users/me/sessions',
    responses: {
      200: successResponseSchema(sessionsListResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'List user sessions',
  },

  revokeSession: {
    method: 'DELETE' as const,
    path: '/api/users/me/sessions/:id',
    responses: {
      200: successResponseSchema(revokeSessionResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Revoke a specific session',
  },

  revokeAllSessions: {
    method: 'POST' as const,
    path: '/api/users/me/sessions/revoke-all',
    responses: {
      200: successResponseSchema(revokeAllSessionsResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Revoke all sessions except current',
  },
} satisfies Contract;
