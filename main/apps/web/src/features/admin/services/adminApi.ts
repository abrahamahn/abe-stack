// main/apps/web/src/features/admin/services/adminApi.ts
/**
 * Admin API Service
 *
 * Web-facing wrapper around centralized @abe-stack/api admin client.
 */

import { createAdminClient } from '@abe-stack/api';

import type { AdminClient, AdminClientConfig } from '@abe-stack/api';

export type {
  AuditEventLocal,
  AuditEventsFilterLocal,
  AuditEventsResponseLocal,
  CreateFeatureFlagRequest,
  FeatureFlagDeleteResponse,
  FeatureFlagListResponse,
  FeatureFlagLocal,
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
  TenantListResponse,
  UpdateFeatureFlagRequest,
  AdminTenantDetailLocal,
  AdminTenantLocal,
} from '@abe-stack/api/admin/client';

export type AdminApiConfig = AdminClientConfig;
export type AdminApiClient = AdminClient;

export function createAdminApiClient(config: AdminApiConfig): AdminApiClient {
  return createAdminClient(config);
}

export type {
  AdminLockUserRequest,
  AdminLockUserResponse,
  AdminUpdateUserRequest,
  AdminUpdateUserResponse,
  AdminUser,
  AdminUserListFilters,
  AdminUserListResponse,
  UnlockAccountRequest,
} from '@abe-stack/shared';
