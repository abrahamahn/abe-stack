// src/server/core/src/auth/magic-link/routes.ts
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
  type HandlerContext,
  type RouteDefinition,
} from '@abe-stack/server-engine';
import { magicLinkRequestSchema, magicLinkVerifyRequestSchema } from '@abe-stack/shared';

import { handleMagicLinkRequest, handleMagicLinkVerify } from './handlers';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { MagicLinkRequest, MagicLinkVerifyRequest } from '@abe-stack/shared';
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
 * Typed as [string, RouteDefinition][] to preserve tuple shape for createRouteMap.
 */
export const magicLinkRouteEntries: [string, RouteDefinition][] = [
  [
    'auth/magic-link/request',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest) => {
        return handleMagicLinkRequest(
          asAppContext(ctx),
          body as MagicLinkRequest,
          req as unknown as RequestWithCookies,
        );
      },
      magicLinkRequestSchema,
    ),
  ],

  [
    'auth/magic-link/verify',
    publicRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest, reply: FastifyReply) => {
        return handleMagicLinkVerify(
          asAppContext(ctx),
          body as MagicLinkVerifyRequest,
          req as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        );
      },
      magicLinkVerifyRequestSchema,
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
