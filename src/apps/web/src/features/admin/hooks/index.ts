// src/apps/web/src/features/admin/hooks/index.ts
// Audit events
export { useAuditEvents } from './useAuditEvents';
export type { UseAuditEventsOptions, UseAuditEventsResult } from './useAuditEvents';

// Impersonation
export { useImpersonation } from './useImpersonation';
export type { UseImpersonationResult } from './useImpersonation';

// Feature flag evaluation
export { useFeatureFlag } from './useFeatureFlag';
export type { UseFeatureFlagOptions, UseFeatureFlagResult } from './useFeatureFlag';

// Feature flags admin CRUD
export {
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
  useFeatureFlags,
  useUpdateFeatureFlag,
} from './useFeatureFlags';
export type {
  UseCreateFeatureFlagOptions,
  UseCreateFeatureFlagResult,
  UseDeleteFeatureFlagOptions,
  UseDeleteFeatureFlagResult,
  UseFeatureFlagsOptions,
  UseFeatureFlagsResult,
  UseUpdateFeatureFlagOptions,
  UseUpdateFeatureFlagResult,
} from './useFeatureFlags';

// User management hooks
export { useAdminUser } from './useAdminUser';
export type { UseAdminUserResult, UseAdminUserState } from './useAdminUser';

export { useAdminUsers } from './useAdminUsers';
export type {
  UseAdminUsersActions,
  UseAdminUsersResult,
  UseAdminUsersState,
} from './useAdminUsers';

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

export { useRouteManifest } from './useRouteManifest';
export type { UseRouteManifestOptions, UseRouteManifestResult } from './useRouteManifest';

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

// Tenant management (Stub - Backend not implemented yet)
export { useTenant } from './useTenant';
export type { UseTenantResult, UseTenantState } from './useTenant';

export { useTenants } from './useTenants';
export type { UseTenantsResult, UseTenantsState } from './useTenants';
