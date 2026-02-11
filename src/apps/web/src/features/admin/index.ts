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
  useAuditEvents,
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
  useExportEvents,
  useFeatureFlags,
  useJobActions,
  useJobDetails,
  useJobsList,
  useQueueStats,
  useRouteManifest,
  useSecurityEvent,
  useSecurityEvents,
  useSecurityMetrics,
  useUpdateFeatureFlag,
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
  UseAuditEventsOptions,
  UseAuditEventsResult,
  UseCreateFeatureFlagOptions,
  UseCreateFeatureFlagResult,
  UseDeleteFeatureFlagOptions,
  UseDeleteFeatureFlagResult,
  UseExportEventsResult,
  UseFeatureFlagsOptions,
  UseFeatureFlagsResult,
  UseJobActionsResult,
  UseJobDetailsOptions,
  UseJobDetailsResult,
  UseJobsListOptions,
  UseJobsListResult,
  UseQueueStatsOptions,
  UseQueueStatsResult,
  UseRouteManifestOptions,
  UseRouteManifestResult,
  UseSecurityEventOptions,
  UseSecurityEventResult,
  UseSecurityEventsOptions,
  UseSecurityEventsResult,
  UseSecurityMetricsOptions,
  UseSecurityMetricsResult,
  UseUpdateFeatureFlagOptions,
  UseUpdateFeatureFlagResult,
  UseUserActionsResult,
  UseUserActionsState,
} from './hooks';

// Pages
export {
  AuditEventsPage,
  FeatureFlagsPage,
  JobMonitorPage,
  PlanManagementPage,
  RouteManifestPage,
  SecurityEventDetailPage,
  SecurityEventsPage,
  UserDetailPage,
  UserListPage,
} from './pages';

// Services
export { createAdminApiClient } from './services';
export type { AdminApiClient, AdminApiConfig } from './services';
