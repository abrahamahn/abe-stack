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
import { createRouteMap, publicRoute, type BaseRouteDefinition, type RouteResult } from '@/infrastructure/http/router';

import { handleMagicLinkRequest, handleMagicLinkVerify } from './handlers';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '@shared';

// ============================================================================
// Route Entries (for merging with parent routes)
// ============================================================================

export const magicLinkRouteEntries: Array<[string, BaseRouteDefinition]> = [
  [
    'auth/magic-link/request',
    publicRoute<MagicLinkRequest, MagicLinkRequestResponse | { message: string; code?: string }>(
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
  ],

  [
    'auth/magic-link/verify',
    publicRoute<MagicLinkVerifyRequest, AuthResponse | { message: string; code?: string }>(
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
  ],
];

// ============================================================================
// Route Map (for standalone use)
// ============================================================================

export const magicLinkRoutes = createRouteMap(magicLinkRouteEntries);
