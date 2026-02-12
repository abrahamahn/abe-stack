// src/server/core/src/activities/index.ts
/**
 * Activities Module
 *
 * Activity feed service, HTTP handlers, route definitions, and types
 * for tracking user-visible actions ("X did Y on Z" timeline).
 */

// Service
export { logActivity, getActivityFeed, getTenantActivityFeed } from './service';

// Handlers
export { handleListActivities, handleListTenantActivities } from './handlers';

// Routes
export { activityRoutes } from './routes';

// Types
export type { ActivityAppContext } from './types';
