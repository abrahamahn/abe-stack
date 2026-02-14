// main/apps/server/src/routes/routeModules.ts
/**
 * Shared Route Module Registry
 *
 * Central definitions for module->route-map registration wiring so server
 * bootstrap and route-manifest generation use the same source.
 */

import { coreApiManifestRouteModuleRegistrations } from '@abe-stack/core';
import { realtimeRoutes } from '@abe-stack/realtime';

import { systemRoutes } from './system.routes';

import type { RouteMap } from '@abe-stack/server-engine';

export interface RouteModuleRegistration {
  module: string;
  routes: RouteMap;
  prefix?: string;
}

export const appRouteModuleRegistrations: ReadonlyArray<RouteModuleRegistration> = [
  ...coreApiManifestRouteModuleRegistrations,
  { module: 'realtime', routes: realtimeRoutes as unknown as RouteMap },
  { module: 'system', routes: systemRoutes, prefix: '' },
] as const;

export const apiManifestRouteModuleRegistrations: ReadonlyArray<RouteModuleRegistration> =
  coreApiManifestRouteModuleRegistrations;
