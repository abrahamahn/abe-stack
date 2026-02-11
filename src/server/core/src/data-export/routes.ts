// src/server/core/src/data-export/routes.ts
/**
 * Data Export Routes
 *
 * Route definitions for the data export module.
 * Uses the generic router pattern for DRY registration.
 *
 * User routes: request export and check status
 */

import { createRouteMap, protectedRoute, type RouteMap } from '@abe-stack/server-engine';

import { handleGetExportStatus, handleRequestExport } from './handlers';

import type { DataExportAppContext } from './types';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Route Helper
// ============================================================================

/**
 * Helper that wraps protectedRoute for user routes.
 */
function userRoute(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  handler: (
    ctx: DataExportAppContext,
    body: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<unknown>,
): import('@abe-stack/server-engine').RouteDefinition {
  return protectedRoute(method, handler as import('@abe-stack/server-engine').RouteHandler, 'user');
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Data export module route map.
 *
 * User routes (role: 'user'):
 * - users/me/export (POST) -- request a data export
 * - users/me/export/:id/status (GET) -- check export status
 */
export const dataExportRoutes: RouteMap = createRouteMap([
  // Request a data export
  ['users/me/export', userRoute('POST', handleRequestExport)],

  // Check export status
  ['users/me/export/:id/status', userRoute('GET', handleGetExportStatus)],
]);
