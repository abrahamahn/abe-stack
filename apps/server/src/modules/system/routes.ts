// apps/server/src/modules/system/routes.ts
import {
  handleApiInfo,
  handleHealth,
  handleListModules,
  handleListRoutes,
  handleLive,
  handleRoot,
  handleSystemStatus,
} from './handlers';

import { createRouteMap, protectedRoute, publicRoute } from '@/infrastructure/http/router';


export const systemRoutes = createRouteMap([
  // Root Routes
  ['', publicRoute('GET', handleRoot)],
  ['api', publicRoute('GET', handleApiInfo)],

  // Health Routes
  ['api/health', publicRoute('GET', handleHealth)],

  // System Verification Routes (Sensitive - Admin Only)
  ['api/system/health', protectedRoute('GET', handleHealth, 'admin')],
  ['api/system/status', protectedRoute('GET', handleSystemStatus, 'admin')],
  ['api/system/modules', protectedRoute('GET', handleListModules, 'admin')],
  ['api/system/routes', protectedRoute('GET', handleListRoutes, 'admin')],

  // Legacy Health Routes (Aliases)
  ['api/health/detailed', protectedRoute('GET', handleSystemStatus, 'admin')],
  ['api/health/routes', protectedRoute('GET', handleListRoutes, 'admin')],
  ['api/health/ready', publicRoute('GET', handleHealth)],
  ['api/health/live', publicRoute('GET', handleLive)],
]);
