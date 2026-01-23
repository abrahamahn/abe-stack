// apps/web/src/features/admin/hooks/index.ts
// User management hooks
export { useAdminUser } from './useAdminUser';
export type { UseAdminUserResult, UseAdminUserState } from './useAdminUser';

export { useAdminUsers } from './useAdminUsers';
export type { UseAdminUsersActions, UseAdminUsersResult, UseAdminUsersState } from './useAdminUsers';

export { useUserActions } from './useUserActions';
export type { UseUserActionsResult, UseUserActionsState } from './useUserActions';

// Security hooks
export { useExportEvents } from './useExportEvents';
export type { UseExportEventsResult } from './useExportEvents';

export { useJobActions } from './useJobActions';
export type { UseJobActionsResult } from './useJobActions';

export { useJobDetails } from './useJobDetails';
export type { UseJobDetailsOptions, UseJobDetailsResult } from './useJobDetails';

export { useJobsList } from './useJobsList';
export type {
  JobsFilter,
  JobsPagination,
  UseJobsListOptions,
  UseJobsListResult,
} from './useJobsList';

export { useQueueStats } from './useQueueStats';
export type { UseQueueStatsOptions, UseQueueStatsResult } from './useQueueStats';

export { useSecurityEvent } from './useSecurityEvent';
export type { UseSecurityEventOptions, UseSecurityEventResult } from './useSecurityEvent';

export { useSecurityEvents } from './useSecurityEvents';
export type { UseSecurityEventsOptions, UseSecurityEventsResult } from './useSecurityEvents';

export { useSecurityMetrics } from './useSecurityMetrics';
export type {
  MetricsPeriod,
  UseSecurityMetricsOptions,
  UseSecurityMetricsResult,
} from './useSecurityMetrics';
