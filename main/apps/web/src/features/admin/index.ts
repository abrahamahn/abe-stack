// main/apps/web/src/features/admin/index.ts
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
  JobActionsMenu,
  JobDetailsPanel,
  JobsTable,
  JobStatusBadge,
  QueueStatsCard,
  RoleBadge,
  SecurityEventCard,
  SecurityEventsFilters,
  SecurityEventsTable,
  SecurityMetricsCard,
  getUserStatus,
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
  JobsTableProps,
  JobStatusBadgeProps,
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
  useExportEvents,
  useFeatureFlag,
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
  useFeatureFlags,
  useUpdateFeatureFlag,
  useJobActions,
  useJobDetails,
  useJobsList,
  useQueueStats,
  useRouteManifest,
  useSecurityEvent,
  useSecurityEvents,
  useSecurityMetrics,
  useUserActions,
} from './hooks';
export type {
  UseAdminUserResult,
  UseAdminUserState,
  UseAdminUsersActions,
  UseAdminUsersResult,
  UseAdminUsersState,
  UseAuditEventsOptions,
  UseAuditEventsResult,
  UseExportEventsResult,
  UseFeatureFlagOptions,
  UseFeatureFlagResult,
  UseCreateFeatureFlagOptions,
  UseCreateFeatureFlagResult,
  UseDeleteFeatureFlagOptions,
  UseDeleteFeatureFlagResult,
  UseFeatureFlagsOptions,
  UseFeatureFlagsResult,
  UseUpdateFeatureFlagOptions,
  UseUpdateFeatureFlagResult,
  UseJobActionsResult,
  UseJobDetailsOptions,
  UseJobDetailsResult,
  JobsFilter,
  JobsPagination,
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
  MetricsPeriod,
  UseSecurityMetricsOptions,
  UseSecurityMetricsResult,
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
