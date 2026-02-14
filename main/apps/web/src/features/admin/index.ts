// main/apps/web/src/features/admin/index.ts
/**
 * Admin Feature
 *
 * Admin-only features for security auditing and system management.
 */

// Layouts
export { AdminLayout } from './layouts/AdminLayout';

// Components
export { ExportDialog, type ExportDialogProps } from './components/ExportDialog';
export { JobActionsMenu, type JobActionsMenuProps } from './components/JobActionsMenu';
export { JobDetailsPanel, type JobDetailsPanelProps } from './components/JobDetailsPanel';
export { JobsTable, type JobsTableProps } from './components/JobsTable';
export { JobStatusBadge, type JobStatusBadgeProps } from './components/JobStatusBadge';
export { QueueStatsCard, type QueueStatsCardProps } from './components/QueueStatsCard';
export { RoleBadge, type RoleBadgeProps } from './components/RoleBadge';
export { SecurityEventCard, type SecurityEventCardProps } from './components/SecurityEventCard';
export {
  SecurityEventsFilters,
  type SecurityEventsFiltersProps,
} from './components/SecurityEventsFilters';
export {
  SecurityEventsTable,
  type SecurityEventsTableProps,
} from './components/SecurityEventsTable';
export {
  SecurityMetricsCard,
  type SecurityMetricsCardProps,
} from './components/SecurityMetricsCard';
export { getUserStatus, StatusBadge, type StatusBadgeProps } from './components/StatusBadge';
export { UserActionsMenu, type UserActionsMenuProps } from './components/UserActionsMenu';
export { UserDetailCard, type UserDetailCardProps } from './components/UserDetailCard';
export { UserFilters, type UserFiltersProps } from './components/UserFilters';
export { UserTable, type UserTableProps } from './components/UserTable';

// Hooks
export {
  useAdminUser,
  type UseAdminUserResult,
  type UseAdminUserState,
} from './hooks/useAdminUser';
export {
  useAdminUsers,
  type UseAdminUsersActions,
  type UseAdminUsersResult,
  type UseAdminUsersState,
} from './hooks/useAdminUsers';
export {
  useAuditEvents,
  type UseAuditEventsOptions,
  type UseAuditEventsResult,
} from './hooks/useAuditEvents';
export { useExportEvents, type UseExportEventsResult } from './hooks/useExportEvents';
export {
  useFeatureFlag,
  type UseFeatureFlagOptions,
  type UseFeatureFlagResult,
} from './hooks/useFeatureFlag';
export {
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
  useFeatureFlags,
  useUpdateFeatureFlag,
  type UseCreateFeatureFlagOptions,
  type UseCreateFeatureFlagResult,
  type UseDeleteFeatureFlagOptions,
  type UseDeleteFeatureFlagResult,
  type UseFeatureFlagsOptions,
  type UseFeatureFlagsResult,
  type UseUpdateFeatureFlagOptions,
  type UseUpdateFeatureFlagResult,
} from './hooks/useFeatureFlags';
export { useJobActions, type UseJobActionsResult } from './hooks/useJobActions';
export {
  useJobDetails,
  type UseJobDetailsOptions,
  type UseJobDetailsResult,
} from './hooks/useJobDetails';
export {
  useJobsList,
  type JobsFilter,
  type JobsPagination,
  type UseJobsListOptions,
  type UseJobsListResult,
} from './hooks/useJobsList';
export {
  useQueueStats,
  type UseQueueStatsOptions,
  type UseQueueStatsResult,
} from './hooks/useQueueStats';
export {
  useRouteManifest,
  type UseRouteManifestOptions,
  type UseRouteManifestResult,
} from './hooks/useRouteManifest';
export {
  useSecurityEvent,
  type UseSecurityEventOptions,
  type UseSecurityEventResult,
} from './hooks/useSecurityEvent';
export {
  useSecurityEvents,
  type UseSecurityEventsOptions,
  type UseSecurityEventsResult,
} from './hooks/useSecurityEvents';
export {
  useSecurityMetrics,
  type MetricsPeriod,
  type UseSecurityMetricsOptions,
  type UseSecurityMetricsResult,
} from './hooks/useSecurityMetrics';
export {
  useUserActions,
  type UseUserActionsResult,
  type UseUserActionsState,
} from './hooks/useUserActions';

// Pages
export { AuditEventsPage } from './pages/AuditEventsPage';
export { FeatureFlagsPage } from './pages/FeatureFlagsPage';
export { JobMonitorPage } from './pages/JobMonitorPage';
export { PlanManagementPage } from './pages/PlanManagementPage';
export { RouteManifestPage } from './pages/RouteManifestPage';
export { SecurityEventDetailPage } from './pages/SecurityEventDetailPage';
export { SecurityEventsPage } from './pages/SecurityEventsPage';
export { UserDetailPage } from './pages/UserDetailPage';
export { UserListPage } from './pages/UserListPage';

// Services
export {
  createAdminApiClient,
  type AdminApiClient,
  type AdminApiConfig,
} from './services/adminApi';
