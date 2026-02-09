// src/apps/web/src/features/admin/index.ts
/**
 * Admin Feature
 *
 * Admin-only features for security auditing and system management.
 */

// Layouts
export { AdminLayout } from './layouts';

// Components
export {
  ExportDialog,
  getUserStatus,
  JobActionsMenu,
  JobDetailsPanel,
  JobStatusBadge,
  JobsTable,
  QueueStatsCard,
  RoleBadge,
  SecurityEventCard,
  SecurityEventsFilters,
  SecurityEventsTable,
  SecurityMetricsCard,
  StatusBadge,
  UserActionsMenu,
  UserDetailCard,
  UserFilters,
  UserTable,
} from './components';
export type {
  ExportDialogProps,
  JobActionsMenuProps,
  JobDetailsPanelProps,
  JobStatusBadgeProps,
  JobsTableProps,
  QueueStatsCardProps,
  RoleBadgeProps,
  SecurityEventCardProps,
  SecurityEventsFiltersProps,
  SecurityEventsTableProps,
  SecurityMetricsCardProps,
  StatusBadgeProps,
  UserActionsMenuProps,
  UserDetailCardProps,
  UserFiltersProps,
  UserTableProps,
} from './components';

// Hooks
export {
  useAdminUser,
  useAdminUsers,
  useExportEvents,
  useJobActions,
  useJobDetails,
  useJobsList,
  useQueueStats,
  useSecurityEvent,
  useSecurityEvents,
  useSecurityMetrics,
  useUserActions,
} from './hooks';
export type {
  JobsFilter,
  JobsPagination,
  MetricsPeriod,
  UseAdminUserResult,
  UseAdminUserState,
  UseAdminUsersActions,
  UseAdminUsersResult,
  UseAdminUsersState,
  UseExportEventsResult,
  UseJobActionsResult,
  UseJobDetailsOptions,
  UseJobDetailsResult,
  UseJobsListOptions,
  UseJobsListResult,
  UseQueueStatsOptions,
  UseQueueStatsResult,
  UseSecurityEventOptions,
  UseSecurityEventResult,
  UseSecurityEventsOptions,
  UseSecurityEventsResult,
  UseSecurityMetricsOptions,
  UseSecurityMetricsResult,
  UseUserActionsResult,
  UseUserActionsState,
} from './hooks';

// Pages
export {
  JobMonitorPage,
  PlanManagementPage,
  SecurityEventDetailPage,
  SecurityEventsPage,
  UserDetailPage,
  UserListPage,
} from './pages';

// Services
export { createAdminApiClient } from './services';
export type { AdminApiClient, AdminApiConfig } from './services';
