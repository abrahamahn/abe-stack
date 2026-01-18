// apps/server/src/modules/admin/routes.ts
/**
 * Admin Routes
 *
 * Route definitions for admin module.
 * All routes require admin role.
 */

import { unlockAccountRequestSchema } from '@abe-stack/core';
import { protectedRoute, type RouteMap, type RouteResult } from '@infra/router';

import { handleAdminUnlock } from './handlers';

import type { UnlockAccountRequest, UnlockAccountResponse } from '@abe-stack/core';
import type { AppContext, RequestWithCookies } from '@shared';

// ============================================================================
// Route Definitions
// ============================================================================

export const adminRoutes: RouteMap = {
  'admin/auth/unlock': protectedRoute<
    UnlockAccountRequest,
    UnlockAccountResponse | { message: string }
  >(
    'POST',
    async (
      ctx: AppContext,
      body: UnlockAccountRequest,
      req: RequestWithCookies,
    ): Promise<RouteResult<UnlockAccountResponse | { message: string }>> => {
      return handleAdminUnlock(ctx, body, req);
    },
    'admin',
    unlockAccountRequestSchema,
  ),
};
