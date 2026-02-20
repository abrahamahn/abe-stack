// main/apps/web/src/features/admin/services/adminApi.ts
/**
 * Admin API Service
 *
 * Web-facing wrapper around centralized @bslt/api admin client.
 */

import { createAdminClient } from '@bslt/api';

import type { AdminClient, AdminClientConfig } from '@bslt/api';

export type {
  AdminErrorLogEntry,
  AdminErrorLogResponse,
  AdminHealthResponse,
  AdminMetricsResponse,
  AdminTenantDetailLocal,
  AdminTenantLocal,
  AdminWebhookDeliveryListResponse,
  AdminWebhookDeliveryLocal,
  AdminWebhookListResponse,
  AdminWebhookLocal,
  AdminWebhookReplayResponse,
  AssignTenantPlanRequest,
  AssignTenantPlanResponse,
  AuditEventLocal,
  AuditEventsFilterLocal,
  AuditEventsResponseLocal,
  CreateFeatureFlagRequest,
  FeatureFlagDeleteResponse,
  FeatureFlagListResponse,
  FeatureFlagLocal,
  FeatureFlagOverrideDeleteResponse,
  FeatureFlagOverrideListResponse,
  FeatureFlagOverrideLocal,
  FeatureFlagOverrideResponse,
  FeatureFlagResponse,
  JobActionResponseLocal,
  JobDetailsLocal,
  JobListQueryLocal,
  JobListResponseLocal,
  QueueStatsLocal,
  RouteManifestResponseLocal,
  SecurityEventLocal,
  SecurityEventsExportRequestLocal,
  SecurityEventsExportResponseLocal,
  SecurityEventsFilterLocal,
  SecurityEventsListRequestLocal,
  SecurityEventsListResponseLocal,
  SecurityMetricsLocal,
  ServiceStatus,
  SetFeatureFlagOverrideRequest,
  TenantListResponse,
  UpdateFeatureFlagRequest,
} from '@bslt/api/admin/client';

export type AdminApiConfig = AdminClientConfig;
export type AdminApiClient = AdminClient;

export function createAdminApiClient(config: AdminApiConfig): AdminApiClient {
  return createAdminClient(config);
}

export type {
  AdminHardBanRequest,
  AdminHardBanResponse,
  AdminLockUserRequest,
  AdminLockUserResponse,
  AdminUpdateUserRequest,
  AdminUpdateUserResponse,
  AdminUser,
  AdminUserListFilters,
  AdminUserListResponse,
  UnlockAccountRequest,
} from '@bslt/shared';
