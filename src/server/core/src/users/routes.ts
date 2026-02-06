// backend/core/src/users/routes.ts
/**
 * User Routes
 *
 * Route definitions for users module.
 * All routes require authentication.
 *
 * Uses the generic router pattern from @abe-stack/db.
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
} from '@abe-stack/db';

import { handleListUsers, handleMe } from './handlers';

import type { UsersRequest } from './types';
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
export const userRoutes: RouteMap = createRouteMap([
  [
    'users/me',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        return handleMe(ctx, req as unknown as UsersRequest);
      },
      'user',
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
      'admin', // Only admins can list users
    ),
  ],
]);
