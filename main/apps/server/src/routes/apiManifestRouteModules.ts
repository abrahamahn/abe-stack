// main/apps/server/src/routes/apiManifestRouteModules.ts
/**
 * API Manifest Route Modules
 *
 * API-only module route maps for tooling (excludes realtime/system routes).
 */

import { coreApiManifestRouteModuleRegistrations } from '@bslt/core';

import type { RouteMap } from '@bslt/server-system';

export interface ApiManifestRouteModuleRegistration {
  module: string;
  routes: RouteMap;
}

export const apiManifestRouteModuleRegistrations: ReadonlyArray<ApiManifestRouteModuleRegistration> =
  coreApiManifestRouteModuleRegistrations;
