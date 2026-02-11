// src/server/core/src/activities/routes.ts
/**
 * Activities Routes
 *
 * Route definitions for the activities module.
 * Uses the generic router pattern for DRY registration.
 *
 * All routes are protected and require the 'user' role.
 * Route map keys must be unique strings; each path maps to one method.
 *
 * @module activities/routes
 */

import { createRouteMap, protectedRoute } from '@abe-stack/server-engine';

import { handleListActivities, handleListTenantActivities } from './handlers';

import type { RouteDefinition } from '@abe-stack/server-engine';

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Activity route entries as typed tuples for createRouteMap.
 *
 * Endpoints:
 * - GET  activities                    -> user's own activity feed
 * - GET  tenants/:tenantId/activities  -> tenant's activity feed
 *
 * @complexity O(n) where n = number of routes
 */
const activityRouteEntries: [string, RouteDefinition][] = [
  // List activities for the authenticated user
  ['activities', protectedRoute('GET', handleListActivities, 'user')],

  // List activities for a specific tenant
  ['tenants/:tenantId/activities', protectedRoute('GET', handleListTenantActivities, 'user')],
];

/**
 * Activity route map with all activity feed endpoints.
 *
 * @complexity O(n) where n = number of route entries
 */
export const activityRoutes = createRouteMap(activityRouteEntries);
