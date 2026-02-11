// src/server/core/src/consent/routes.ts
/**
 * Consent Routes
 *
 * Route definitions for the consent module.
 * Uses the generic router pattern for DRY registration.
 *
 * User routes: get and update consent preferences
 */

import { createRouteMap, protectedRoute, type RouteMap } from '@abe-stack/server-engine';

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
): import('@abe-stack/server-engine').RouteDefinition {
  return protectedRoute(method, handler as import('@abe-stack/server-engine').RouteHandler, 'user');
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
  ['users/me/consent', userRoute('GET', handleGetConsent)],

  // Update consent preferences
  ['users/me/consent/update', userRoute('PATCH', handleUpdateConsent)],
]);
