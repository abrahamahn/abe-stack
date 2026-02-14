// main/server/core/src/admin/route-manifest.ts
/**
 * Route Manifest Handler
 *
 * Returns metadata about all registered API routes.
 * Admin-only endpoint for API introspection.
 */

import { getRegisteredRoutes } from '../../../engine/src';

import type { RouteRegistryEntry } from '../../../engine/src';

// ============================================================================
// Types
// ============================================================================

interface RouteManifestResponse {
  routes: readonly RouteRegistryEntry[];
  count: number;
}

// ============================================================================
// Handler
// ============================================================================

/**
 * GET /api/admin/routes
 *
 * Returns a manifest of all registered routes with metadata.
 */
export async function handleGetRouteManifest(): Promise<{
  status: 200;
  body: RouteManifestResponse;
}> {
  const routes = await Promise.resolve(getRegisteredRoutes());
  return {
    status: 200,
    body: {
      routes,
      count: routes.length,
    },
  };
}
