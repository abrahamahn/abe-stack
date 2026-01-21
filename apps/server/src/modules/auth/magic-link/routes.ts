// apps/server/src/modules/auth/magic-link/routes.ts
/**
 * Magic Link Routes
 *
 * Route definitions for magic link authentication.
 */

import {
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  type AuthResponse,
  type MagicLinkRequest,
  type MagicLinkRequestResponse,
  type MagicLinkVerifyRequest,
} from '@abe-stack/core';
import { publicRoute, type RouteMap, type RouteResult } from '@router';

import { handleMagicLinkRequest, handleMagicLinkVerify } from './handlers';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '@shared';

// ============================================================================
// Route Definitions
// ============================================================================

export const magicLinkRoutes: RouteMap = {
  'auth/magic-link/request': publicRoute<
    MagicLinkRequest,
    MagicLinkRequestResponse | { message: string; code?: string }
  >(
    'POST',
    async (
      ctx: AppContext,
      body: MagicLinkRequest,
      req: RequestWithCookies,
    ): Promise<RouteResult<MagicLinkRequestResponse | { message: string; code?: string }>> => {
      return handleMagicLinkRequest(ctx, body, req);
    },
    magicLinkRequestSchema,
  ),

  'auth/magic-link/verify': publicRoute<
    MagicLinkVerifyRequest,
    AuthResponse | { message: string; code?: string }
  >(
    'POST',
    async (
      ctx: AppContext,
      body: MagicLinkVerifyRequest,
      req: RequestWithCookies,
      reply: ReplyWithCookies,
    ): Promise<RouteResult<AuthResponse | { message: string; code?: string }>> => {
      return handleMagicLinkVerify(ctx, body, req, reply);
    },
    magicLinkVerifySchema,
  ),
};
