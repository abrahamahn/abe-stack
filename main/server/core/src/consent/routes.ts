// main/server/core/src/consent/routes.ts
/**
 * Consent Routes
 *
 * Route definitions for the consent module.
 * Uses the generic router pattern for DRY registration.
 *
 * User routes: get and update consent preferences
 */

import { updateConsentPreferencesRequestSchema } from '@bslt/shared';

import { createRouteMap, protectedRoute, type RouteMap } from '../../../system/src';

import { handleGetConsent, handleUpdateConsent } from './handlers';

import type { ConsentAppContext } from './types';
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
    ctx: ConsentAppContext,
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
 * Consent module route map.
 *
 * User routes (role: 'user'):
 * - users/me/consent (GET) -- get current consent preferences
 * - users/me/consent (PATCH) -- update consent preferences
 */
export const consentRoutes: RouteMap = createRouteMap([
  // Get current consent preferences
  [
    'users/me/consent',
    userRoute('GET', handleGetConsent, { summary: 'Get consent preferences', tags: ['Consent'] }),
  ],

  // Update consent preferences
  [
    'users/me/consent/update',
    protectedRoute(
      'PATCH',
      handleUpdateConsent as import('../../../system/src').RouteHandler,
      'user',
      updateConsentPreferencesRequestSchema,
      { summary: 'Update consent preferences', tags: ['Consent'] },
    ),
  ],
]);
