// main/apps/server/src/routes/apiManifestRouteModules.ts
/**
 * API Manifest Route Modules
 *
 * API-only module route maps for tooling (excludes realtime/system routes).
 */

import { coreApiManifestRouteModuleRegistrations } from '@abe-stack/core';

import type { RouteMap } from '@abe-stack/server-engine';

export interface ApiManifestRouteModuleRegistration {
  module: string;
  routes: RouteMap;
}

export const apiManifestRouteModuleRegistrations: ReadonlyArray<ApiManifestRouteModuleRegistration> =
  coreApiManifestRouteModuleRegistrations;
