// main/server/core/src/route-modules.ts
/**
 * Core Route Module Registry
 *
 * Canonical list of core-owned API route maps.
 * App runtimes can compose this with app-only modules (e.g. realtime/system).
 */

import { activityRoutes } from './activities';
import { adminRoutes } from './admin';
import { apiKeyRoutes } from './api-keys';
import { authRoutes } from './auth';
import { consentRoutes } from './consent';
import { dataExportRoutes } from './data-export';
import { featureFlagRoutes } from './feature-flags';
import { fileRoutes } from './files';
import { legalRoutes } from './legal';
import { notificationRoutes } from './notifications';
import { tenantRoutes } from './tenants';
import { userRoutes } from './users';
import { webhookRoutes } from './webhooks';

import type { RouteMap } from '../../engine/src';

export interface CoreRouteModuleRegistration {
  module: string;
  routes: RouteMap;
}

export const coreRouteModuleRegistrations: ReadonlyArray<CoreRouteModuleRegistration> = [
  { module: 'auth', routes: authRoutes as unknown as RouteMap },
  { module: 'users', routes: userRoutes as unknown as RouteMap },
  { module: 'notifications', routes: notificationRoutes as unknown as RouteMap },
  { module: 'admin', routes: adminRoutes as unknown as RouteMap },
  { module: 'tenants', routes: tenantRoutes as unknown as RouteMap },
  { module: 'api-keys', routes: apiKeyRoutes as unknown as RouteMap },
  { module: 'activities', routes: activityRoutes as unknown as RouteMap },
  { module: 'feature-flags', routes: featureFlagRoutes as unknown as RouteMap },
  { module: 'legal', routes: legalRoutes as unknown as RouteMap },
  { module: 'consent', routes: consentRoutes as unknown as RouteMap },
  { module: 'data-export', routes: dataExportRoutes as unknown as RouteMap },
  { module: 'files', routes: fileRoutes as unknown as RouteMap },
  { module: 'webhooks', routes: webhookRoutes as unknown as RouteMap },
] as const;

export const coreApiManifestRouteModuleRegistrations = coreRouteModuleRegistrations;
