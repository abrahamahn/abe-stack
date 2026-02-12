// src/server/core/src/legal/routes.ts
/**
 * Legal Routes
 *
 * Route definitions for the legal module.
 * Uses the generic router pattern for DRY registration.
 *
 * Public routes: get current legal documents
 * User routes: get user agreements
 * Admin routes: publish legal documents
 */

import {
  createRouteMap,
  protectedRoute,
  publicRoute,
  type RouteMap,
} from '@abe-stack/server-engine';

import { handleGetCurrentLegal, handleGetUserAgreements, handlePublishLegal } from './handlers';

import type { LegalAppContext } from './types';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Route Helper
// ============================================================================

/**
 * Helper that wraps protectedRoute for admin-only routes.
 */
function adminRoute(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  handler: (
    ctx: LegalAppContext,
    body: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<unknown>,
  openapi?: import('@abe-stack/server-engine').RouteOpenApiMeta,
): import('@abe-stack/server-engine').RouteDefinition {
  return protectedRoute(
    method,
    handler as import('@abe-stack/server-engine').RouteHandler,
    'admin',
    undefined,
    openapi,
  );
}

/**
 * Helper that wraps protectedRoute for user routes.
 */
function userRoute(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  handler: (
    ctx: LegalAppContext,
    body: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<unknown>,
  openapi?: import('@abe-stack/server-engine').RouteOpenApiMeta,
): import('@abe-stack/server-engine').RouteDefinition {
  return protectedRoute(
    method,
    handler as import('@abe-stack/server-engine').RouteHandler,
    'user',
    undefined,
    openapi,
  );
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Legal module route map.
 *
 * Public routes:
 * - legal/current (GET) -- get latest version of each legal document type
 *
 * User routes (role: 'user'):
 * - users/me/agreements (GET) -- get current user's legal agreements
 *
 * Admin routes (role: 'admin'):
 * - admin/legal/publish (POST) -- publish a new legal document version
 */
export const legalRoutes: RouteMap = createRouteMap([
  // Public: get current legal documents
  [
    'legal/current',
    publicRoute(
      'GET',
      handleGetCurrentLegal as import('@abe-stack/server-engine').RouteHandler,
      undefined,
      { summary: 'Get current legal documents', tags: ['Legal'] },
    ),
  ],

  // User: get user agreements
  [
    'users/me/agreements',
    userRoute('GET', handleGetUserAgreements, {
      summary: 'Get user legal agreements',
      tags: ['Legal'],
    }),
  ],

  // Admin: publish new legal document version
  [
    'admin/legal/publish',
    adminRoute('POST', handlePublishLegal, {
      summary: 'Publish legal document',
      tags: ['Legal', 'Admin'],
    }),
  ],
]);
