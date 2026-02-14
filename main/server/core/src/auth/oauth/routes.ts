// main/server/core/src/auth/oauth/routes.ts
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
    emptyBodySchema,
    oauthCallbackQuerySchema,
    type OAuthCallbackQuery,
} from '@abe-stack/shared';

import {
    createRouteMap,
    protectedRoute,
    publicRoute,
    type HandlerContext,
    type RouteDefinition,
    type RouteResult,
} from '../../../../engine/src';

import {
    handleGetConnections,
    handleGetEnabledProviders,
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
  // List enabled OAuth providers (public)
  [
    'auth/oauth/providers',
    publicRoute(
      'GET',
      (ctx: HandlerContext): RouteResult => {
        return handleGetEnabledProviders(asAppContext(ctx));
      },
      undefined,
      { summary: 'Get enabled OAuth providers', tags: ['Auth', 'OAuth'] },
    ),
  ],

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
      undefined,
      { summary: 'Initiate Google OAuth', tags: ['Auth', 'OAuth'] },
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
      undefined,
      { summary: 'Initiate GitHub OAuth', tags: ['Auth', 'OAuth'] },
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
      undefined,
      { summary: 'Initiate Apple OAuth', tags: ['Auth', 'OAuth'] },
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
        const query: OAuthCallbackQuery = oauthCallbackQuerySchema.parse(req.query);
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
      undefined,
      { summary: 'Google OAuth callback', tags: ['Auth', 'OAuth'] },
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
        const query: OAuthCallbackQuery = oauthCallbackQuerySchema.parse(req.query);
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
      undefined,
      { summary: 'GitHub OAuth callback', tags: ['Auth', 'OAuth'] },
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
        const query: OAuthCallbackQuery = oauthCallbackQuerySchema.parse(req.query);
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
      undefined,
      { summary: 'Apple OAuth callback', tags: ['Auth', 'OAuth'] },
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
      [],
      emptyBodySchema,
      { summary: 'Link Google account', tags: ['Auth', 'OAuth'] },
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
      [],
      emptyBodySchema,
      { summary: 'Link GitHub account', tags: ['Auth', 'OAuth'] },
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
      [],
      emptyBodySchema,
      { summary: 'Link Apple account', tags: ['Auth', 'OAuth'] },
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
      [],
      emptyBodySchema,
      { summary: 'Unlink Google account', tags: ['Auth', 'OAuth'] },
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
      [],
      emptyBodySchema,
      { summary: 'Unlink GitHub account', tags: ['Auth', 'OAuth'] },
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
      [],
      emptyBodySchema,
      { summary: 'Unlink Apple account', tags: ['Auth', 'OAuth'] },
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
      [],
      undefined,
      { summary: 'List OAuth connections', tags: ['Auth', 'OAuth'] },
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
