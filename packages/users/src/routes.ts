// packages/users/src/routes.ts
/**
 * User Routes
 *
 * Route definitions for users module.
 * All routes require authentication.
 *
 * Uses the generic router pattern from @abe-stack/http.
 * Route handlers accept HandlerContext (Record<string, unknown>) from the
 * generic router and narrow it to UsersModuleDeps at the call boundary.
 *
 * @module routes
 */

import {
  createRouteMap,
  protectedRoute,
  type HandlerContext,
  type RouteResult,
} from '@abe-stack/http';

import { handleListUsers, handleMe } from './handlers';

import type { UsersRequest } from './types';
import type { CursorPaginatedResult, User } from '@abe-stack/core';
import type { FastifyRequest } from 'fastify';

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * User route map with all user management endpoints.
 *
 * Routes:
 * - `users/me` (GET, user) - Get current user's profile
 * - `users/list` (GET, admin) - List all users with cursor pagination
 */
export const userRoutes = createRouteMap([
  [
    'users/me',
    protectedRoute<undefined, User | { message: string }>(
      'GET',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
      ): Promise<RouteResult<User | { message: string }>> => {
        return handleMe(ctx, req as unknown as UsersRequest);
      },
      'user',
    ),
  ],

  // Paginated endpoint using cursor-based pagination
  [
    'users/list',
    protectedRoute<undefined, CursorPaginatedResult<User> | { message: string }>(
      'GET',
      (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
      ): Promise<RouteResult<CursorPaginatedResult<User> | { message: string }>> => {
        return handleListUsers(ctx, req as unknown as UsersRequest);
      },
      'admin', // Only admins can list users
    ),
  ],
]);
