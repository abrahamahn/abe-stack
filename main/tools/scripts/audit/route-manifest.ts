// main/tools/scripts/audit/route-manifest.ts
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

import { authRoutes, createAuthGuard } from '@abe-stack/core/auth';
import { clearRegistry, getRegisteredRoutes, registerRouteMap } from '@abe-stack/server-engine';

import { buildBillingRouteMap } from '../../../apps/server/src/routes/billingRouteAdapter';
import { apiManifestRouteModuleRegistrations } from '../../../apps/server/src/routes/apiManifestRouteModules';

import type {
  AuthGuardFactory,
  HandlerContext,
  RouteMap,
  RouteRegistryEntry,
} from '@abe-stack/server-engine';

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
export function generateManifest(routes?: readonly RouteRegistryEntry[]): RouteManifestEntry[] {
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

type MinimalFastifyRoute = {
  method?: string;
  url?: string;
};

/**
 * Build and register all route maps into the in-memory route registry without
 * starting the real server.
 */
export function populateRegistryFromRouteMaps(): void {
  clearRegistry();

  // Minimal Fastify surface used by registerRouteMap().
  const app = {
    route: (_route: MinimalFastifyRoute) => undefined,
    addHook: (_name: string, _hook: unknown) => undefined,
  };

  // registerRoutes() only reads these config values during setup.
  const ctx = {
    config: {
      auth: {
        jwt: {
          secret: 'route-manifest-jwt-secret',
        },
      },
      billing: {
        enabled: true,
      },
    },
  };

  const routerOptions = {
    prefix: '/api',
    jwtSecret: ctx.config.auth.jwt.secret,
    authGuardFactory: createAuthGuard as AuthGuardFactory,
  };
  const handlerCtx = ctx as unknown as HandlerContext;

  const register = (module: string, routes: RouteMap): void => {
    registerRouteMap(app as never, handlerCtx, routes, {
      ...routerOptions,
      module,
    });
  };

  // Ensure auth module uses local import for guard setup symmetry.
  register('auth', authRoutes as unknown as RouteMap);

  for (const entry of apiManifestRouteModuleRegistrations) {
    if (entry.module === 'auth') continue;
    register(entry.module, entry.routes);
  }

  register('billing', buildBillingRouteMap());
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
  populateRegistryFromRouteMaps();
  const manifest = generateManifest();

  if (manifest.length === 0) {
    console.log('⚠️  No routes registered after route map registration.');
  } else {
    console.log(JSON.stringify(manifest, null, 2));
  }
}
