// apps/server/src/modules/auth/oauth/routes.ts
/**
 * OAuth Routes
 *
 * Route definitions for OAuth authentication endpoints.
 * Uses the generic router pattern for DRY registration.
 */

import { protectedRoute, publicRoute, type RouteMap, type RouteResult } from '@router';

import {
  handleGetConnections,
  handleOAuthCallbackRequest,
  handleOAuthInitiate,
  handleOAuthLink,
  handleOAuthUnlink,
} from './handlers';

import type { AppContext } from '@shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Route Definitions
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
export const oauthRoutes: RouteMap = {
  // Initiate OAuth flow
  'auth/oauth/google': publicRoute<undefined, { url: string } | { message: string }>(
    'GET',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult<{ url: string } | { message: string }>> => {
      return handleOAuthInitiate(ctx, { provider: 'google' }, req, reply);
    },
  ),

  'auth/oauth/github': publicRoute<undefined, { url: string } | { message: string }>(
    'GET',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult<{ url: string } | { message: string }>> => {
      return handleOAuthInitiate(ctx, { provider: 'github' }, req, reply);
    },
  ),

  'auth/oauth/apple': publicRoute<undefined, { url: string } | { message: string }>(
    'GET',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult<{ url: string } | { message: string }>> => {
      return handleOAuthInitiate(ctx, { provider: 'apple' }, req, reply);
    },
  ),

  // OAuth callbacks
  'auth/oauth/google/callback': publicRoute(
    'GET',
    async (
      ctx: AppContext,
      _body: unknown,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult> => {
      const query = req.query as Record<string, string>;
      return handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        {
          code: query.code,
          state: query.state,
          error: query.error,
          error_description: query.error_description,
        },
        req,
        reply,
      );
    },
  ),

  'auth/oauth/github/callback': publicRoute(
    'GET',
    async (
      ctx: AppContext,
      _body: unknown,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult> => {
      const query = req.query as Record<string, string>;
      return handleOAuthCallbackRequest(
        ctx,
        { provider: 'github' },
        {
          code: query.code,
          state: query.state,
          error: query.error,
          error_description: query.error_description,
        },
        req,
        reply,
      );
    },
  ),

  'auth/oauth/apple/callback': publicRoute(
    'GET',
    async (
      ctx: AppContext,
      _body: unknown,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult> => {
      const query = req.query as Record<string, string>;
      return handleOAuthCallbackRequest(
        ctx,
        { provider: 'apple' },
        {
          code: query.code,
          state: query.state,
          error: query.error,
          error_description: query.error_description,
        },
        req,
        reply,
      );
    },
  ),

  // Link OAuth accounts (authenticated)
  'auth/oauth/google/link': protectedRoute<undefined, { url: string } | { message: string }>(
    'POST',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult<{ url: string } | { message: string }>> => {
      return handleOAuthLink(ctx, { provider: 'google' }, req, reply);
    },
  ),

  'auth/oauth/github/link': protectedRoute<undefined, { url: string } | { message: string }>(
    'POST',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult<{ url: string } | { message: string }>> => {
      return handleOAuthLink(ctx, { provider: 'github' }, req, reply);
    },
  ),

  'auth/oauth/apple/link': protectedRoute<undefined, { url: string } | { message: string }>(
    'POST',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult<{ url: string } | { message: string }>> => {
      return handleOAuthLink(ctx, { provider: 'apple' }, req, reply);
    },
  ),

  // Unlink OAuth accounts (authenticated)
  'auth/oauth/google/unlink': protectedRoute<undefined, { message: string }>(
    'DELETE',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult<{ message: string }>> => {
      return handleOAuthUnlink(ctx, { provider: 'google' }, req, reply);
    },
  ),

  'auth/oauth/github/unlink': protectedRoute<undefined, { message: string }>(
    'DELETE',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult<{ message: string }>> => {
      return handleOAuthUnlink(ctx, { provider: 'github' }, req, reply);
    },
  ),

  'auth/oauth/apple/unlink': protectedRoute<undefined, { message: string }>(
    'DELETE',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult<{ message: string }>> => {
      return handleOAuthUnlink(ctx, { provider: 'apple' }, req, reply);
    },
  ),

  // Get connected providers (authenticated)
  'auth/oauth/connections': protectedRoute(
    'GET',
    async (
      ctx: AppContext,
      _body: unknown,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<RouteResult> => {
      return handleGetConnections(ctx, req, reply);
    },
  ),
};
