// main/server/system/src/routing/route.registry.ts
/**
 * Route Registry
 *
 * Module-level singleton that collects metadata about every registered route.
 * Used by the admin manifest endpoint and the startup summary.
 *
 * @module routing/route-registry
 */

import type { HttpMethod } from './types';

// ============================================================================
// Types
// ============================================================================

export interface RouteRegistryEntry {
  /** Full URL path, e.g. "/api/auth/login" */
  path: string;
  /** HTTP method */
  method: HttpMethod;
  /** Whether the route is publicly accessible (no auth required) */
  isPublic: boolean;
  /** Required roles (empty for public or any-authenticated routes) */
  roles: string[];
  /** Whether the route has a validation schema attached */
  hasSchema: boolean;
  /** Logical module name, e.g. "auth", "users", "admin" */
  module: string;
  /** Whether the route is deprecated */
  deprecated?: boolean;
  /** Short description for OpenAPI docs */
  summary?: string;
  /** OpenAPI tags */
  tags?: string[];
}

// ============================================================================
// Registry Singleton
// ============================================================================

const entries: RouteRegistryEntry[] = [];

/**
 * Register a route entry in the global registry.
 *
 * Called automatically by `registerRouteMap()` for every route.
 *
 * @param entry - Route metadata to register
 */
export function registerRoute(entry: RouteRegistryEntry): void {
  entries.push(entry);
}

/**
 * Get all registered route entries.
 *
 * @returns Readonly array of all registered routes
 */
export function getRegisteredRoutes(): readonly RouteRegistryEntry[] {
  return entries;
}

/**
 * Clear the route registry. For testing only.
 */
export function clearRegistry(): void {
  entries.length = 0;
}
