// main/server/core/src/legal/routes.ts
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

import { createLegalDocumentSchema } from '@bslt/shared';

import { createRouteMap, protectedRoute, publicRoute, type RouteMap } from '../../../system/src';

import { handleGetCurrentLegal, handleGetUserAgreements, handlePublishLegal } from './handlers';

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { LegalAppContext } from './types';

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
  schema?: import('../../../system/src').ValidationSchema,
  openapi?: import('../../../system/src').RouteOpenApiMeta,
): import('../../../system/src').RouteDefinition {
  return protectedRoute(
    method,
    handler as import('../../../system/src').RouteHandler,
    'admin',
    schema,
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
  openapi?: import('../../../system/src').RouteOpenApiMeta,
): import('../../../system/src').RouteDefinition {
  return protectedRoute(
    method,
    handler as import('../../../system/src').RouteHandler,
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
      handleGetCurrentLegal as import('../../../system/src').RouteHandler,
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
    adminRoute('POST', handlePublishLegal, createLegalDocumentSchema, {
      summary: 'Publish legal document',
      tags: ['Legal', 'Admin'],
    }),
  ],
]);
