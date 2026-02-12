// src/server/core/src/users/routes.ts
/**
 * User Routes
 *
 * Route definitions for users module.
 * All routes require authentication.
 *
 * Uses the generic router pattern from @abe-stack/server-engine.
 * Route handlers accept HandlerContext (Record<string, unknown>) from the
 * generic router and narrow it to UsersModuleDeps at the call boundary.
 *
 * @module routes
 */

import {
  createRouteMap,
  protectedRoute,
  type HandlerContext,
  type RouteMap,
  type RouteResult,
} from '@abe-stack/server-engine';
import {
  changePasswordRequestSchema,
  deactivateAccountRequestSchema,
  deleteAccountRequestSchema,
  NotFoundError,
  updateProfileRequestSchema,
  updateUsernameRequestSchema,
  type ChangePasswordRequest,
  type DeactivateAccountRequest,
  type DeleteAccountRequest,
  type UpdateUsernameRequest,
} from '@abe-stack/shared';

import { REFRESH_COOKIE_NAME } from '../auth';

import {
  getSessionCount,
  handleChangePassword,
  handleDeactivateAccount,
  handleDeleteAvatar,
  handleGetProfileCompleteness,
  handleListUsers,
  handleMe,
  handleReactivateAccount,
  handleRequestDeletion,
  handleUpdateProfile,
  handleUpdateUsername,
  handleUploadAvatar,
  listUserSessions,
  revokeAllSessions,
  revokeSession,
  type UpdateProfileData,
} from './handlers';
import { ERROR_MESSAGES, type UsersModuleDeps, type UsersRequest } from './types';

import type { Repositories } from '@abe-stack/db';
import type { FastifyRequest } from 'fastify';

// ============================================================================
// Context Bridge
// ============================================================================

/**
 * Narrow HandlerContext to UsersModuleDeps.
 * The server composition root ensures the context implements UsersModuleDeps.
 *
 * @param ctx - Generic handler context from router
 * @returns Narrowed UsersModuleDeps
 * @complexity O(1)
 */
function asUsersDeps(ctx: HandlerContext): UsersModuleDeps {
  return ctx as unknown as UsersModuleDeps;
}

// ============================================================================
// Session Helper
// ============================================================================

/**
 * Resolve the current session's token family ID from the refresh token cookie.
 *
 * Reads the `refreshToken` cookie from the request, looks up the token
 * in the database, and returns the associated family ID. Returns undefined
 * if no cookie is present or the token is not found.
 *
 * @param repos - Repository container
 * @param req - Fastify request (with cookies parsed by middleware)
 * @returns The family ID of the current session, or undefined
 * @complexity O(1) — single database lookup
 */
async function resolveCurrentFamilyId(
  repos: Repositories,
  req: FastifyRequest,
): Promise<string | undefined> {
  const cookies = (req as unknown as UsersRequest).cookies;
  const refreshToken = cookies[REFRESH_COOKIE_NAME];

  if (refreshToken === undefined || refreshToken === '') {
    return undefined;
  }

  const tokenRecord = await repos.refreshTokens.findByToken(refreshToken);
  return tokenRecord?.familyId ?? undefined;
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * User route map with all user management endpoints.
 *
 * Routes:
 * - `users/me` (GET, user) — Get current user's profile
 * - `users/list` (GET, admin) — List all users with cursor pagination
 * - `users/me/profile-completeness` (GET, user) — Get profile completeness percentage
 * - `users/me/username` (PATCH, user) — Update current user's username (30-day cooldown)
 * - `users/me/update` (PATCH, user) — Update profile fields (name, bio, location, etc.)
 * - `users/me/password` (POST, user) — Change password (requires current password)
 * - `users/me/avatar` (PUT, user) — Upload avatar (multipart)
 * - `users/me/avatar/delete` (POST, user) — Delete avatar
 * - `users/me/sessions` (GET, user) — List current user's active sessions
 * - `users/me/sessions/count` (GET, user) — Get active session count
 * - `users/me/sessions/:id` (DELETE, user) — Revoke a specific session
 * - `users/me/sessions/revoke-all` (POST, user) — Revoke all sessions except current
 *
 * @complexity O(n) where n = number of routes
 */
export const userRoutes: RouteMap = createRouteMap([
  [
    'users/me',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        return handleMe(ctx, req as unknown as UsersRequest);
      },
      'user',
      undefined,
      { summary: 'Get current user profile', tags: ['Users'] },
    ),
  ],

  // Paginated endpoint using cursor-based pagination
  [
    'users/list',
    protectedRoute(
      'GET',
      (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        return handleListUsers(ctx, req as unknown as UsersRequest);
      },
      'admin',
      undefined,
      { summary: 'List all users', tags: ['Users', 'Admin'] },
    ),
  ],

  // Profile completeness — returns percentage and missing fields
  [
    'users/me/profile-completeness',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        return handleGetProfileCompleteness(ctx, req as unknown as UsersRequest);
      },
      'user',
      undefined,
      { summary: 'Get profile completeness', tags: ['Users'] },
    ),
  ],

  // Username update — PATCH with 30-day cooldown
  [
    'users/me/username',
    protectedRoute(
      'PATCH',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        return handleUpdateUsername(
          ctx,
          body as UpdateUsernameRequest,
          req as unknown as UsersRequest,
        );
      },
      'user',
      updateUsernameRequestSchema,
      { summary: 'Update username', tags: ['Users'] },
    ),
  ],

  // ============================================================================
  // Profile & Password Routes
  // ============================================================================

  // Profile update — PATCH with partial fields
  [
    'users/me/update',
    protectedRoute(
      'PATCH',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        return handleUpdateProfile(ctx, body as UpdateProfileData, req);
      },
      'user',
      updateProfileRequestSchema,
      { summary: 'Update profile', tags: ['Users'] },
    ),
  ],

  // Password change — POST with current + new password
  [
    'users/me/password',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        return handleChangePassword(ctx, body as ChangePasswordRequest, req);
      },
      'user',
      changePasswordRequestSchema,
      { summary: 'Change password', tags: ['Users'] },
    ),
  ],

  // ============================================================================
  // Avatar Routes
  // ============================================================================

  // Avatar upload — PUT with multipart file body
  [
    'users/me/avatar',
    protectedRoute(
      'PUT',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        return handleUploadAvatar(ctx, body, req);
      },
      'user',
      undefined,
      { summary: 'Upload avatar', tags: ['Users'] },
    ),
  ],

  // Avatar delete — DELETE
  [
    'users/me/avatar/delete',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        return handleDeleteAvatar(ctx, _body, req);
      },
      'user',
      undefined,
      { summary: 'Delete avatar', tags: ['Users'] },
    ),
  ],

  // ============================================================================
  // Session Management Routes
  // ============================================================================

  // List all active sessions for the authenticated user
  [
    'users/me/sessions',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asUsersDeps(ctx);
        const request = req as unknown as UsersRequest;

        if (request.user === undefined) {
          return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
        }

        try {
          const currentFamilyId = await resolveCurrentFamilyId(deps.repos, req);
          const sessions = await listUserSessions(deps.repos, request.user.userId, currentFamilyId);

          return { status: 200, body: sessions };
        } catch (error) {
          deps.log.error(
            error instanceof Error ? error : new Error(String(error)),
            'Failed to list sessions',
          );
          return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
        }
      },
      'user',
      undefined,
      { summary: 'List active sessions', tags: ['Users', 'Sessions'] },
    ),
  ],

  // Get active session count for the authenticated user
  [
    'users/me/sessions/count',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asUsersDeps(ctx);
        const request = req as unknown as UsersRequest;

        if (request.user === undefined) {
          return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
        }

        try {
          const count = await getSessionCount(deps.repos, request.user.userId);
          return { status: 200, body: { count } };
        } catch (error) {
          deps.log.error(
            error instanceof Error ? error : new Error(String(error)),
            'Failed to get session count',
          );
          return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
        }
      },
      'user',
      undefined,
      { summary: 'Get session count', tags: ['Users', 'Sessions'] },
    ),
  ],

  // Revoke a specific session by ID
  [
    'users/me/sessions/:id',
    protectedRoute(
      'DELETE',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asUsersDeps(ctx);
        const request = req as unknown as UsersRequest;

        if (request.user === undefined) {
          return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
        }

        const params = req.params as { id: string };

        try {
          const currentFamilyId = await resolveCurrentFamilyId(deps.repos, req);
          await revokeSession(deps.repos, request.user.userId, params.id, currentFamilyId);

          return { status: 200, body: { message: 'Session revoked' } };
        } catch (error) {
          if (error instanceof NotFoundError) {
            return { status: 404, body: { message: error.message } };
          }
          deps.log.error(
            error instanceof Error ? error : new Error(String(error)),
            'Failed to revoke session',
          );
          return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
        }
      },
      'user',
      undefined,
      { summary: 'Revoke session', tags: ['Users', 'Sessions'] },
    ),
  ],

  // Revoke all sessions except the current one
  [
    'users/me/sessions/revoke-all',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asUsersDeps(ctx);
        const request = req as unknown as UsersRequest;

        if (request.user === undefined) {
          return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
        }

        try {
          const currentFamilyId = await resolveCurrentFamilyId(deps.repos, req);
          const revokedCount = await revokeAllSessions(
            deps.repos,
            request.user.userId,
            currentFamilyId,
          );

          return { status: 200, body: { revokedCount } };
        } catch (error) {
          deps.log.error(
            error instanceof Error ? error : new Error(String(error)),
            'Failed to revoke all sessions',
          );
          return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
        }
      },
      'user',
      undefined,
      { summary: 'Revoke all sessions', tags: ['Users', 'Sessions'] },
    ),
  ],

  // ============================================================================
  // Account Lifecycle Routes
  // ============================================================================

  // Deactivate account — preserves data but prevents login
  [
    'users/me/deactivate',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        return handleDeactivateAccount(
          ctx,
          body as DeactivateAccountRequest,
          req as unknown as UsersRequest,
        );
      },
      'user',
      deactivateAccountRequestSchema,
      { summary: 'Deactivate account', tags: ['Users', 'Account Lifecycle'] },
    ),
  ],

  // Request account deletion — initiates 30-day grace period
  [
    'users/me/delete',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        return handleRequestDeletion(
          ctx,
          body as DeleteAccountRequest,
          req as unknown as UsersRequest,
        );
      },
      'user',
      deleteAccountRequestSchema,
      { summary: 'Request account deletion', tags: ['Users', 'Account Lifecycle'] },
    ),
  ],

  // Reactivate account — cancel deactivation or pending deletion
  [
    'users/me/reactivate',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        return handleReactivateAccount(ctx, undefined, req as unknown as UsersRequest);
      },
      'user',
      undefined,
      { summary: 'Reactivate account', tags: ['Users', 'Account Lifecycle'] },
    ),
  ],
]);
