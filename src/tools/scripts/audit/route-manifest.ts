// src/tools/scripts/audit/route-manifest.ts
/**
 * Route Manifest Exporter
 *
 * Imports the route registry and outputs a JSON manifest of all registered routes.
 * Requires the server to have registered all routes first.
 *
 * Usage: pnpm route:manifest
 *
 * @module tools/audit/route-manifest
 */

import { getRegisteredRoutes } from '@abe-stack/server-engine';

import type { RouteRegistryEntry } from '@abe-stack/server-engine';

/**
 * Route manifest entry (JSON-serializable subset of RouteRegistryEntry).
 */
export interface RouteManifestEntry {
  path: string;
  method: string;
  isPublic: boolean;
  module: string;
  hasSchema: boolean;
  deprecated?: boolean;
}

/**
 * Generate a route manifest from the global route registry.
 *
 * @param routes - Optional array of routes (defaults to global registry)
 * @returns Array of manifest entries sorted by path
 */
export function generateManifest(
  routes?: readonly RouteRegistryEntry[],
): RouteManifestEntry[] {
  const entries = routes ?? getRegisteredRoutes();

  return entries
    .map((r) => ({
      path: r.path,
      method: r.method,
      isPublic: r.isPublic,
      module: r.module,
      hasSchema: r.hasSchema,
      ...(r.deprecated === true ? { deprecated: true } : {}),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

// ============================================================================
// CLI Entry Point
// ============================================================================

const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  process.argv[1].includes('route-manifest') &&
  process.env['VITEST'] === undefined;

if (isMainModule) {
  // When run as CLI, import routes to populate the registry
  // The route registry is populated as a side effect of importing route modules
  const manifest = generateManifest();

  if (manifest.length === 0) {
    console.log('⚠️  No routes registered. Run after server startup to see routes.');
    console.log('   Hint: Import and call registerRoutes() first, or use the admin manifest endpoint.');
  } else {
    console.log(JSON.stringify(manifest, null, 2));
  }
}
