// src/apps/web/src/features/activities/index.ts
/**
 * Activities Feature
 *
 * User activity feed and timeline components.
 */

// API
export { createActivitiesApi } from './api/activitiesApi';
export type {
  ActivitiesApi,
  ActivitiesApiConfig,
  ActivityListResponse,
  ActivityLocal,
} from './api/activitiesApi';

// Hooks
export { useActivities, useTenantActivities } from './hooks/useActivities';
export type {
  UseActivitiesOptions,
  UseActivitiesResult,
  UseTenantActivitiesOptions,
  UseTenantActivitiesResult,
} from './hooks/useActivities';

// Components
export { ActivityFeed } from './components/ActivityFeed';
export type { ActivityFeedProps } from './components/ActivityFeed';

// Pages
export { ActivityFeedPage } from './pages/ActivityFeedPage';
