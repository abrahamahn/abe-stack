// apps/server/src/modules/system/routes.ts
import type { RouteMap } from '@router';
import { publicRoute } from '@router';

import {
  handleApiInfo,
  handleHealth,
  handleListModules,
  handleListRoutes,
  handleLive,
  handleRoot,
  handleSystemStatus,
} from './handlers';

export const systemRoutes: RouteMap = {
  // Root Routes
  '': publicRoute('GET', handleRoot),

  api: publicRoute('GET', handleApiInfo),

  // Health Routes
  'api/health': publicRoute('GET', handleHealth),

  // System Verification Routes
  'api/system/health': publicRoute('GET', handleHealth),

  'api/system/status': publicRoute('GET', handleSystemStatus),

  'api/system/modules': publicRoute('GET', handleListModules),

  'api/system/routes': publicRoute('GET', handleListRoutes),

  // Legacy Health Routes (Aliases)
  'api/health/detailed': publicRoute('GET', handleSystemStatus),

  'api/health/routes': publicRoute('GET', handleListRoutes),

  'api/health/ready': publicRoute('GET', handleHealth),

  'api/health/live': publicRoute('GET', handleLive),
};
