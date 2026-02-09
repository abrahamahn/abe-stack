// src/server/core/src/auth/oauth/routes.ts
/**
 * OAuth Routes
 *
 * Route definitions for OAuth authentication endpoints.
 * Uses the generic router pattern for DRY registration.
 * Handlers accept HandlerContext and narrow to AppContext at the call boundary.
 *
 * @module oauth/routes
 */

import {
  createRouteMap,
  protectedRoute,
  publicRoute,
  type HandlerContext,
  type RouteDefinition,
  type RouteResult,
} from '@abe-stack/server-engine';

import {
  handleGetConnections,
  handleOAuthCallbackRequest,
  handleOAuthInitiate,
  handleOAuthLink,
  handleOAuthUnlink,
} from './handlers';

import type { AppContext } from '../types';
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
 * OAuth Routes
 *
 * GET  /api/auth/oauth/:provider          - Initiate OAuth flow (redirect to provider)
 * GET  /api/auth/oauth/:provider/callback - Handle OAuth callback
 * POST /api/auth/oauth/:provider/link     - Initiate OAuth linking (authenticated)
 * DELETE /api/auth/oauth/:provider        - Unlink OAuth provider (authenticated)
 * GET  /api/auth/oauth/connections        - Get connected providers (authenticated)
 */
export const oauthRouteEntries: [string, RouteDefinition][] = [
  // Initiate OAuth flow
  [
    'auth/oauth/google',
    publicRoute(
      'GET',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        return handleOAuthInitiate(asAppContext(ctx), { provider: 'google' }, req, reply);
      },
    ),
  ],

  [
    'auth/oauth/github',
    publicRoute(
      'GET',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        return handleOAuthInitiate(asAppContext(ctx), { provider: 'github' }, req, reply);
      },
    ),
  ],

  [
    'auth/oauth/apple',
    publicRoute(
      'GET',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        return handleOAuthInitiate(asAppContext(ctx), { provider: 'apple' }, req, reply);
      },
    ),
  ],

  // OAuth callbacks
  [
    'auth/oauth/google/callback',
    publicRoute(
      'GET',
      async (
        ctx: HandlerContext,
        _body: unknown,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        const query = req.query as Record<string, string>;
        return handleOAuthCallbackRequest(
          asAppContext(ctx),
          { provider: 'google' },
          {
            code: query['code'],
            state: query['state'],
            error: query['error'],
            error_description: query['error_description'],
          },
          req,
          reply,
        );
      },
    ),
  ],

  [
    'auth/oauth/github/callback',
    publicRoute(
      'GET',
      async (
        ctx: HandlerContext,
        _body: unknown,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        const query = req.query as Record<string, string>;
        return handleOAuthCallbackRequest(
          asAppContext(ctx),
          { provider: 'github' },
          {
            code: query['code'],
            state: query['state'],
            error: query['error'],
            error_description: query['error_description'],
          },
          req,
          reply,
        );
      },
    ),
  ],

  [
    'auth/oauth/apple/callback',
    publicRoute(
      'GET',
      async (
        ctx: HandlerContext,
        _body: unknown,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        const query = req.query as Record<string, string>;
        return handleOAuthCallbackRequest(
          asAppContext(ctx),
          { provider: 'apple' },
          {
            code: query['code'],
            state: query['state'],
            error: query['error'],
            error_description: query['error_description'],
          },
          req,
          reply,
        );
      },
    ),
  ],

  // Link OAuth accounts (authenticated)
  [
    'auth/oauth/google/link',
    protectedRoute(
      'POST',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        return handleOAuthLink(asAppContext(ctx), { provider: 'google' }, req, reply);
      },
    ),
  ],

  [
    'auth/oauth/github/link',
    protectedRoute(
      'POST',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        return handleOAuthLink(asAppContext(ctx), { provider: 'github' }, req, reply);
      },
    ),
  ],

  [
    'auth/oauth/apple/link',
    protectedRoute(
      'POST',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        return handleOAuthLink(asAppContext(ctx), { provider: 'apple' }, req, reply);
      },
    ),
  ],

  // Unlink OAuth accounts (authenticated)
  [
    'auth/oauth/google/unlink',
    protectedRoute(
      'DELETE',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        return handleOAuthUnlink(asAppContext(ctx), { provider: 'google' }, req, reply);
      },
    ),
  ],

  [
    'auth/oauth/github/unlink',
    protectedRoute(
      'DELETE',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        return handleOAuthUnlink(asAppContext(ctx), { provider: 'github' }, req, reply);
      },
    ),
  ],

  [
    'auth/oauth/apple/unlink',
    protectedRoute(
      'DELETE',
      async (
        ctx: HandlerContext,
        _body: undefined,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        return handleOAuthUnlink(asAppContext(ctx), { provider: 'apple' }, req, reply);
      },
    ),
  ],

  // Get connected providers (authenticated)
  [
    'auth/oauth/connections',
    protectedRoute(
      'GET',
      async (
        ctx: HandlerContext,
        _body: unknown,
        req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<RouteResult> => {
        return handleGetConnections(asAppContext(ctx), req, reply);
      },
    ),
  ],
];

// ============================================================================
// Route Map (for standalone use)
// ============================================================================

/**
 * OAuth route map for standalone registration.
 */
export const oauthRoutes = createRouteMap(oauthRouteEntries);
