// main/apps/web/src/features/activities/index.ts
/**
 * Activities Feature
 *
 * User activity feed and timeline components.
 */

// API
export { createActivitiesApi } from './api';
export type {
  ActivitiesApi,
  ActivitiesApiConfig,
  ActivityListResponse,
  ActivityLocal,
} from './api';

// Hooks
export { useActivities, useTenantActivities } from './hooks';
export type {
  UseActivitiesOptions,
  UseActivitiesResult,
  UseTenantActivitiesOptions,
  UseTenantActivitiesResult,
} from './hooks';

// Components
export { ActivityFeed } from './components';
export type { ActivityFeedProps } from './components';

// Pages
export { ActivityFeedPage } from './pages';
