// apps/server/src/modules/users/routes.ts
/**
 * User Routes
 *
 * Route definitions for users module.
 * All routes require authentication.
 */

import { protectedRoute, type RouteMap, type RouteResult } from '@infra/router';

import { handleMe } from './handlers';

import type { UserResponse } from '@abe-stack/core';
import type { AppContext, RequestWithCookies } from '@shared';

// ============================================================================
// Route Definitions
// ============================================================================

export const userRoutes: RouteMap = {
  'users/me': protectedRoute<undefined, UserResponse | { message: string }>(
    'GET',
    async (
      ctx: AppContext,
      _body: undefined,
      req: RequestWithCookies,
    ): Promise<RouteResult<UserResponse | { message: string }>> => {
      return handleMe(ctx, req);
    },
    'user',
  ),
};
