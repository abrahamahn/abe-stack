// main/shared/src/contracts/contract.users.ts
/**
 * User Contracts
 *
 * API Contract definitions for User management (Profile, Sessions, Avatar).
 * @module Domain/Users
 */

import {
  accountLifecycleResponseSchema,
  deactivateAccountRequestSchema,
  deleteAccountRequestSchema,
} from '../core/users/lifecycle.schemas';
import {
  updateUsernameRequestSchema,
  updateUsernameResponseSchema,
} from '../core/users/username.schemas';
import {
  avatarDeleteResponseSchema,
  avatarUploadRequestSchema,
  avatarUploadResponseSchema,
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  profileCompletenessResponseSchema,
  revokeAllSessionsResponseSchema,
  revokeSessionResponseSchema,
  sessionCountResponseSchema,
  sessionsListResponseSchema,
  updateProfileRequestSchema,
  userSchema,
  usersListResponseSchema,
} from '../core/users/users.schemas';
import { errorResponseSchema, successResponseSchema } from '../system/http';

import type { Contract } from '../primitives/api';

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
      200: userSchema,
      401: errorResponseSchema,
    },
    summary: 'Get current user profile',
  },

  updateProfile: {
    method: 'PATCH' as const,
    path: '/api/users/me/update',
    body: updateProfileRequestSchema,
    responses: {
      200: successResponseSchema(userSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Update current user profile',
  },

  profileCompleteness: {
    method: 'GET' as const,
    path: '/api/users/me/profile-completeness',
    responses: {
      200: successResponseSchema(profileCompletenessResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Get profile completeness percentage and missing fields',
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
    method: 'PUT' as const,
    path: '/api/users/me/avatar',
    body: avatarUploadRequestSchema,
    responses: {
      200: successResponseSchema(avatarUploadResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Upload user avatar',
  },

  deleteAvatar: {
    method: 'POST' as const,
    path: '/api/users/me/avatar/delete',
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

  sessionCount: {
    method: 'GET' as const,
    path: '/api/users/me/sessions/count',
    responses: {
      200: successResponseSchema(sessionCountResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Get active session count',
  },

  listUsers: {
    method: 'GET' as const,
    path: '/api/users/list',
    responses: {
      200: successResponseSchema(usersListResponseSchema),
      400: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'List users (cursor paginated, admin only)',
  },

  updateUsername: {
    method: 'PATCH' as const,
    path: '/api/users/me/username',
    body: updateUsernameRequestSchema,
    responses: {
      200: successResponseSchema(updateUsernameResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
      429: errorResponseSchema,
    },
    summary: 'Update username (cooldown enforced)',
  },

  deactivateAccount: {
    method: 'POST' as const,
    path: '/api/users/me/deactivate',
    body: deactivateAccountRequestSchema,
    responses: {
      200: successResponseSchema(accountLifecycleResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Deactivate account',
  },

  deleteAccount: {
    method: 'POST' as const,
    path: '/api/users/me/delete',
    body: deleteAccountRequestSchema,
    responses: {
      200: successResponseSchema(accountLifecycleResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Request account deletion',
  },

  reactivateAccount: {
    method: 'POST' as const,
    path: '/api/users/me/reactivate',
    responses: {
      200: successResponseSchema(accountLifecycleResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Reactivate account',
  },
} satisfies Contract;
