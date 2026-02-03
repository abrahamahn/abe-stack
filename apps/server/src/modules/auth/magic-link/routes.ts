// modules/auth/src/magic-link/routes.ts
/**
 * Magic Link Routes
 *
 * Route definitions for magic link authentication.
 * Uses HandlerContext from the generic router and narrows to AppContext.
 *
 * @module magic-link/routes
 */

import {
  createRouteMap,
  publicRoute,
  type BaseRouteDefinition,
  type HandlerContext,
  type RouteResult,
} from '@abe-stack/db';
import {
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  type AuthResponse,
  type MagicLinkRequest,
  type MagicLinkRequestResponse,
  type MagicLinkVerifyRequest,
} from '@abe-stack/shared';

import { handleMagicLinkRequest, handleMagicLinkVerify } from './handlers';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Narrow HandlerContext to AppContext.
 *
 * @param ctx - Generic handler context from router
 * @returns Narrowed AppContext
 * @complexity O(1)
 */
function asAppContext(ctx: HandlerContext): AppContext {
  return ctx as unknown as AppContext;
}

// ============================================================================
// Route Entries (for merging with parent routes)
// ============================================================================

/**
 * Magic link route entries for merging with parent auth routes.
 */
export const magicLinkRouteEntries: Array<[string, BaseRouteDefinition]> = [
  [
    'auth/magic-link/request',
    publicRoute<MagicLinkRequest, MagicLinkRequestResponse | { message: string; code?: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: MagicLinkRequest,
        req: FastifyRequest,
      ): Promise<RouteResult<MagicLinkRequestResponse | { message: string; code?: string }>> => {
        return handleMagicLinkRequest(
          asAppContext(ctx),
          body,
          req as unknown as RequestWithCookies,
        );
      },
      magicLinkRequestSchema,
    ),
  ],

  [
    'auth/magic-link/verify',
    publicRoute<MagicLinkVerifyRequest, AuthResponse | { message: string; code?: string }>(
      'POST',
      async (
        ctx: HandlerContext,
        body: MagicLinkVerifyRequest,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult<AuthResponse | { message: string; code?: string }>> => {
        return handleMagicLinkVerify(
          asAppContext(ctx),
          body,
          req as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        );
      },
      magicLinkVerifySchema,
    ),
  ],
];

// ============================================================================
// Route Map (for standalone use)
// ============================================================================

/**
 * Magic link route map for standalone registration.
 */
export const magicLinkRoutes = createRouteMap(magicLinkRouteEntries);
