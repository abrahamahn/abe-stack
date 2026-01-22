// apps/server/src/modules/users/routes.ts
/**
 * User Routes
 *
 * Route definitions for users module.
 * All routes require authentication.
 */

import { protectedRoute, type RouteMap, type RouteResult } from '@router';

import { handleListUsers, handleMe } from './handlers';

import type { CursorPaginatedResult, User } from '@abe-stack/core';
import type { AppContext, RequestWithCookies } from '@shared';

// ============================================================================
// Route Definitions
// ============================================================================

export const userRoutes: RouteMap = {
  'users/me': protectedRoute<undefined, User | { message: string }>(
    'GET',
    async (
      ctx: AppContext,
      _body: undefined,
      req: RequestWithCookies,
    ): Promise<RouteResult<User | { message: string }>> => {
      return handleMe(ctx, req);
    },
    'user',
  ),

  // Example paginated endpoint using cursor-based pagination
  'users/list': protectedRoute<undefined, CursorPaginatedResult<User> | { message: string }>(
    'GET',
    (
      ctx: AppContext,
      _body: undefined,
      req: RequestWithCookies,
    ): Promise<RouteResult<CursorPaginatedResult<User> | { message: string }>> => {
      return handleListUsers(ctx, req);
    },
    'admin', // Only admins can list users
  ),
};
