// main/server/core/src/data-export/routes.ts
/**
 * Data Export Routes
 *
 * Route definitions for the data export module.
 * Uses the generic router pattern for DRY registration.
 *
 * User routes: request export and check status
 */

import { emptyBodySchema } from '@bslt/shared';

import {
  createRouteMap,
  protectedRoute,
  type HttpReply,
  type HttpRequest,
  type RouteMap,
} from '../../../system/src';

import { handleGetExportStatus, handleRequestExport } from './handlers';

import type { DataExportAppContext } from './types';

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
    request: HttpRequest,
    reply: HttpReply,
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
 * Data export module route map.
 *
 * User routes (role: 'user'):
 * - users/me/export (POST) -- request a data export
 * - users/me/export/:id/status (GET) -- check export status
 */
export const dataExportRoutes: RouteMap = createRouteMap([
  // Request a data export
  [
    'users/me/export',
    protectedRoute(
      'POST',
      handleRequestExport as import('../../../system/src').RouteHandler,
      'user',
      emptyBodySchema,
      { summary: 'Request data export', tags: ['Data Export'] },
    ),
  ],

  // Check export status
  [
    'users/me/export/:id/status',
    userRoute('GET', handleGetExportStatus, {
      summary: 'Get export status',
      tags: ['Data Export'],
    }),
  ],
]);
