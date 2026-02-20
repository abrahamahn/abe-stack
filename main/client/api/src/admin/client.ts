// main/client/api/src/admin/client.ts
/**
 * Admin API Client
 *
 * Type-safe client for admin and security operations.
 */

import { createCsrfRequestClient } from '../utils';

import type { BaseClientConfig } from '../utils';
import type {
  AdminHardBanRequest,
  AdminHardBanResponse,
  AdminLockUserRequest,
  AdminLockUserResponse,
  AdminUpdateUserRequest,
  AdminUpdateUserResponse,
  AdminUser,
  AdminUserListFilters,
  AdminUserListResponse,
  JobStatus,
  UnlockAccountRequest,
} from '@bslt/shared';

export interface JobDetailsLocal {
  id: string;
  name: string;
  status: JobStatus;
  createdAt: string;
  scheduledAt: string;
  completedAt: string | null;
  durationMs: number | null;
  attempts: number;
  maxAttempts: number;
  args: unknown;
  error: { name: string; message: string; stack?: string } | null;
  deadLetterReason?: string | null;
}

export interface JobListQueryLocal {
  status?: JobStatus;
  name?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JobListResponseLocal {
  data: JobDetailsLocal[];
  page: number;
  totalPages: number;
}

export interface QueueStatsLocal {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  total: number;
  failureRate: number;
  recentCompleted: number;
  recentFailed: number;
}

export interface JobActionResponseLocal {
  success: boolean;
  message?: string;
}

export interface SecurityEventLocal {
  id: string;
  createdAt: string;
  eventType: string;
  severity: string;
  userId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SecurityEventsFilterLocal {
  eventType?: string;
  severity?: string;
  email?: string;
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export interface SecurityEventsListRequestLocal {
  filter?: SecurityEventsFilterLocal;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SecurityEventsListResponseLocal {
  data: SecurityEventLocal[];
  total: number;
  totalPages: number;
}

export interface SecurityMetricsLocal {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  tokenReuseCount: number;
  accountLockedCount: number;
  suspiciousLoginCount: number;
  periodStart: string;
  periodEnd: string;
}

export interface SecurityEventsExportRequestLocal {
  format: 'csv' | 'json';
  filter?: SecurityEventsFilterLocal;
}

export interface SecurityEventsExportResponseLocal {
  data: string;
  contentType: string;
  filename: string;
}

export interface RouteRegistryEntryLocal {
  path: string;
  method: string;
  isPublic: boolean;
  roles: string[];
  hasSchema: boolean;
  module: string;
  summary?: string;
  tags?: string[];
}

export interface RouteManifestResponseLocal {
  routes: RouteRegistryEntryLocal[];
  count: number;
}

export interface FeatureFlagLocal {
  key: string;
  description: string | null;
  isEnabled: boolean;
  defaultValue: unknown;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureFlagRequest {
  key: string;
  description?: string;
  isEnabled?: boolean;
  defaultValue?: unknown;
  metadata?: Record<string, unknown>;
}

export interface UpdateFeatureFlagRequest {
  description?: string | null;
  isEnabled?: boolean;
  defaultValue?: unknown;
  metadata?: Record<string, unknown>;
}

export interface FeatureFlagListResponse {
  flags: FeatureFlagLocal[];
}

export interface FeatureFlagResponse {
  flag: FeatureFlagLocal;
}

export interface FeatureFlagDeleteResponse {
  success: boolean;
  message: string;
}

export interface AdminTenantLocal {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'deleted';
  isActive: boolean;
  createdAt: string;
  memberCount: number;
}

export interface AdminTenantDetailLocal extends AdminTenantLocal {
  ownerId: string;
  subscriptionId: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  updatedAt: string;
  allowedEmailDomains: string[] | null;
  metadata: Record<string, unknown> | null;
}

export interface TenantListResponse {
  tenants: AdminTenantLocal[];
  total: number;
}

export interface AuditEventLocal {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  action: string;
  category: 'security' | 'admin' | 'system' | 'billing';
  severity: 'info' | 'warn' | 'error' | 'critical';
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditEventsFilterLocal {
  tenantId?: string;
  actorId?: string;
  action?: string;
  limit?: number;
}

export interface AuditEventsResponseLocal {
  events: AuditEventLocal[];
}

// ============================================================================
// Webhook Admin Types
// ============================================================================

export interface AdminWebhookLocal {
  id: string;
  tenantId: string | null;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWebhookListResponse {
  webhooks: AdminWebhookLocal[];
}

export interface AdminWebhookDeliveryLocal {
  id: string;
  webhookId: string;
  eventType: string;
  status: string;
  attempts: number;
  responseStatus: number | null;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface AdminWebhookDeliveryListResponse {
  deliveries: AdminWebhookDeliveryLocal[];
}

export interface AdminWebhookReplayResponse {
  success: boolean;
  deliveryId?: string;
  message?: string;
}

// ============================================================================
// Health Types
// ============================================================================

export type ServiceStatus = 'up' | 'down' | 'unknown';

export interface AdminHealthResponse {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    database: ServiceStatus;
    cache: ServiceStatus;
    queue: ServiceStatus;
    storage: ServiceStatus;
    email: ServiceStatus;
  };
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface AdminMetricsResponse {
  metrics: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    activeConnections: number;
    requestsPerSecond: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  queue: {
    pending: number;
    failed: number;
  } | null;
}

// ============================================================================
// Feature Flag Override Types
// ============================================================================

export interface FeatureFlagOverrideLocal {
  flagKey: string;
  tenantId: string;
  tenantName?: string;
  value: unknown;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlagOverrideListResponse {
  overrides: FeatureFlagOverrideLocal[];
}

export interface SetFeatureFlagOverrideRequest {
  tenantId: string;
  isEnabled: boolean;
  value?: unknown;
}

export interface FeatureFlagOverrideResponse {
  override: FeatureFlagOverrideLocal;
}

export interface FeatureFlagOverrideDeleteResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Error Log Types
// ============================================================================

export interface AdminErrorLogEntry {
  id: string;
  message: string;
  stack: string | null;
  severity: 'error' | 'critical' | 'warning';
  source: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface AdminErrorLogResponse {
  errors: AdminErrorLogEntry[];
  total: number;
}

// ============================================================================
// Plan Assignment Types
// ============================================================================

export interface AssignTenantPlanRequest {
  planId: string;
}

export interface AssignTenantPlanResponse {
  success: boolean;
  message: string;
}

export type AdminClientConfig = BaseClientConfig;

export interface AdminClient {
  listUsers: (filters?: AdminUserListFilters) => Promise<AdminUserListResponse>;
  getUser: (userId: string) => Promise<AdminUser>;
  updateUser: (userId: string, data: AdminUpdateUserRequest) => Promise<AdminUpdateUserResponse>;
  lockUser: (userId: string, data: AdminLockUserRequest) => Promise<AdminLockUserResponse>;
  unlockUser: (userId: string, data: UnlockAccountRequest) => Promise<AdminLockUserResponse>;
  hardBanUser: (
    userId: string,
    data: AdminHardBanRequest,
    sudoToken: string,
  ) => Promise<AdminHardBanResponse>;
  listTenants: () => Promise<TenantListResponse>;
  getTenant: (tenantId: string) => Promise<AdminTenantDetailLocal>;
  suspendTenant: (tenantId: string, reason: string) => Promise<void>;
  unsuspendTenant: (tenantId: string) => Promise<void>;
  listSecurityEvents: (
    request: SecurityEventsListRequestLocal,
  ) => Promise<SecurityEventsListResponseLocal>;
  getSecurityEvent: (id: string) => Promise<SecurityEventLocal>;
  getSecurityMetrics: (period?: 'hour' | 'day' | 'week' | 'month') => Promise<SecurityMetricsLocal>;
  exportSecurityEvents: (
    request: SecurityEventsExportRequestLocal,
  ) => Promise<SecurityEventsExportResponseLocal>;
  listJobs: (query: Partial<JobListQueryLocal>) => Promise<JobListResponseLocal>;
  getJobDetails: (jobId: string) => Promise<JobDetailsLocal>;
  getQueueStats: () => Promise<QueueStatsLocal>;
  retryJob: (jobId: string) => Promise<JobActionResponseLocal>;
  cancelJob: (jobId: string) => Promise<JobActionResponseLocal>;
  getRouteManifest: () => Promise<RouteManifestResponseLocal>;
  listAuditEvents: (filter?: AuditEventsFilterLocal) => Promise<AuditEventsResponseLocal>;
  listFeatureFlags: () => Promise<FeatureFlagListResponse>;
  createFeatureFlag: (data: CreateFeatureFlagRequest) => Promise<FeatureFlagResponse>;
  updateFeatureFlag: (key: string, data: UpdateFeatureFlagRequest) => Promise<FeatureFlagResponse>;
  deleteFeatureFlag: (key: string) => Promise<FeatureFlagDeleteResponse>;
  // Webhook admin methods
  listWebhooks: (tenantId?: string) => Promise<AdminWebhookListResponse>;
  listWebhookDeliveries: (
    webhookId: string,
    status?: string,
  ) => Promise<AdminWebhookDeliveryListResponse>;
  replayWebhookDelivery: (
    webhookId: string,
    deliveryId: string,
  ) => Promise<AdminWebhookReplayResponse>;
  // Health & metrics
  getHealth: () => Promise<AdminHealthResponse>;
  getMetrics: () => Promise<AdminMetricsResponse>;
  // Feature flag overrides
  listFeatureFlagOverrides: (flagKey: string) => Promise<FeatureFlagOverrideListResponse>;
  setFeatureFlagOverride: (
    flagKey: string,
    data: SetFeatureFlagOverrideRequest,
  ) => Promise<FeatureFlagOverrideResponse>;
  deleteFeatureFlagOverride: (
    flagKey: string,
    tenantId: string,
  ) => Promise<FeatureFlagOverrideDeleteResponse>;
  // Error logs
  getErrorLog: (limit?: number) => Promise<AdminErrorLogResponse>;
  // Tenant plan assignment
  assignTenantPlan: (
    tenantId: string,
    data: AssignTenantPlanRequest,
  ) => Promise<AssignTenantPlanResponse>;
}

export function createAdminClient(config: AdminClientConfig): AdminClient {
  const { request } = createCsrfRequestClient(config);

  return {
    async listUsers(filters?: AdminUserListFilters): Promise<AdminUserListResponse> {
      const params = new URLSearchParams();
      if (filters !== undefined) {
        if (filters.search !== undefined) params.set('search', filters.search);
        if (filters.role !== undefined) params.set('role', filters.role);
        if (filters.status !== undefined) params.set('status', filters.status);
        if (filters.sortBy !== undefined) params.set('sortBy', filters.sortBy);
        if (filters.sortOrder !== undefined) params.set('sortOrder', filters.sortOrder);
        if (filters.page !== undefined) params.set('page', String(filters.page));
        if (filters.limit !== undefined) params.set('limit', String(filters.limit));
      }
      const queryString = params.toString();
      const url = queryString.length > 0 ? `/admin/users?${queryString}` : '/admin/users';
      return request<AdminUserListResponse>(url);
    },

    async getUser(userId: string): Promise<AdminUser> {
      return request<AdminUser>(`/admin/users/${userId}`);
    },

    async updateUser(
      userId: string,
      data: AdminUpdateUserRequest,
    ): Promise<AdminUpdateUserResponse> {
      return request<AdminUpdateUserResponse>(`/admin/users/${userId}/update`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async lockUser(userId: string, data: AdminLockUserRequest): Promise<AdminLockUserResponse> {
      return request<AdminLockUserResponse>(`/admin/users/${userId}/lock`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async unlockUser(userId: string, data: UnlockAccountRequest): Promise<AdminLockUserResponse> {
      return request<AdminLockUserResponse>(`/admin/users/${userId}/unlock`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async hardBanUser(
      userId: string,
      data: AdminHardBanRequest,
      sudoToken: string,
    ): Promise<AdminHardBanResponse> {
      return request<AdminHardBanResponse>(`/admin/users/${userId}/hard-ban`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'x-sudo-token': sudoToken,
        },
      });
    },

    async listSecurityEvents(
      requestBody: SecurityEventsListRequestLocal,
    ): Promise<SecurityEventsListResponseLocal> {
      return request<SecurityEventsListResponseLocal>('/admin/security/events', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    },

    async getSecurityEvent(id: string): Promise<SecurityEventLocal> {
      return request<SecurityEventLocal>(`/admin/security/events/${id}`);
    },

    async getSecurityMetrics(
      period?: 'hour' | 'day' | 'week' | 'month',
    ): Promise<SecurityMetricsLocal> {
      const queryString = period !== undefined ? `?period=${period}` : '';
      return request<SecurityMetricsLocal>(`/admin/security/metrics${queryString}`);
    },

    async exportSecurityEvents(
      requestBody: SecurityEventsExportRequestLocal,
    ): Promise<SecurityEventsExportResponseLocal> {
      return request<SecurityEventsExportResponseLocal>('/admin/security/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    },

    async listJobs(query: Partial<JobListQueryLocal> = {}): Promise<JobListResponseLocal> {
      const params = new URLSearchParams();
      if (query.status !== undefined) params.set('status', query.status);
      if (query.name !== undefined && query.name !== '') params.set('name', query.name);
      if (query.page !== undefined && query.page !== 0) params.set('page', String(query.page));
      if (query.limit !== undefined && query.limit !== 0) params.set('limit', String(query.limit));
      if (query.sortBy !== undefined) params.set('sortBy', query.sortBy);
      if (query.sortOrder !== undefined) params.set('sortOrder', query.sortOrder);
      const queryString = params.toString();
      const path = queryString !== '' ? `/admin/jobs?${queryString}` : '/admin/jobs';
      return request<JobListResponseLocal>(path);
    },

    async getJobDetails(jobId: string): Promise<JobDetailsLocal> {
      return request<JobDetailsLocal>(`/admin/jobs/${jobId}`);
    },

    async getQueueStats(): Promise<QueueStatsLocal> {
      return request<QueueStatsLocal>('/admin/jobs/stats');
    },

    async retryJob(jobId: string): Promise<JobActionResponseLocal> {
      return request<JobActionResponseLocal>(`/admin/jobs/${jobId}/retry`, { method: 'POST' });
    },

    async cancelJob(jobId: string): Promise<JobActionResponseLocal> {
      return request<JobActionResponseLocal>(`/admin/jobs/${jobId}/cancel`, { method: 'POST' });
    },

    async getRouteManifest(): Promise<RouteManifestResponseLocal> {
      return request<RouteManifestResponseLocal>('/admin/routes');
    },

    async listAuditEvents(filter?: AuditEventsFilterLocal): Promise<AuditEventsResponseLocal> {
      const params = new URLSearchParams();
      if (filter !== undefined) {
        if (filter.tenantId !== undefined) params.set('tenantId', filter.tenantId);
        if (filter.actorId !== undefined) params.set('actorId', filter.actorId);
        if (filter.action !== undefined) params.set('action', filter.action);
        if (filter.limit !== undefined) params.set('limit', String(filter.limit));
      }
      const queryString = params.toString();
      const path =
        queryString !== '' ? `/admin/audit-events?${queryString}` : '/admin/audit-events';
      return request<AuditEventsResponseLocal>(path);
    },

    async listFeatureFlags(): Promise<FeatureFlagListResponse> {
      return request<FeatureFlagListResponse>('/admin/feature-flags');
    },

    async createFeatureFlag(data: CreateFeatureFlagRequest): Promise<FeatureFlagResponse> {
      return request<FeatureFlagResponse>('/admin/feature-flags/create', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateFeatureFlag(
      key: string,
      data: UpdateFeatureFlagRequest,
    ): Promise<FeatureFlagResponse> {
      return request<FeatureFlagResponse>(`/admin/feature-flags/${key}/update`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async deleteFeatureFlag(key: string): Promise<FeatureFlagDeleteResponse> {
      return request<FeatureFlagDeleteResponse>(`/admin/feature-flags/${key}/delete`, {
        method: 'POST',
      });
    },

    async listTenants(): Promise<TenantListResponse> {
      return request<TenantListResponse>('/admin/tenants');
    },

    async getTenant(tenantId: string): Promise<AdminTenantDetailLocal> {
      return request<AdminTenantDetailLocal>(`/admin/tenants/${tenantId}`);
    },

    async suspendTenant(tenantId: string, reason: string): Promise<void> {
      await request<unknown>(`/admin/tenants/${tenantId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },

    async unsuspendTenant(tenantId: string): Promise<void> {
      await request<unknown>(`/admin/tenants/${tenantId}/unsuspend`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    // Webhook admin methods
    async listWebhooks(tenantId?: string): Promise<AdminWebhookListResponse> {
      const params = new URLSearchParams();
      if (tenantId !== undefined) params.set('tenantId', tenantId);
      const queryString = params.toString();
      const path = queryString !== '' ? `/admin/webhooks?${queryString}` : '/admin/webhooks';
      return request<AdminWebhookListResponse>(path);
    },

    async listWebhookDeliveries(
      webhookId: string,
      status?: string,
    ): Promise<AdminWebhookDeliveryListResponse> {
      const params = new URLSearchParams();
      if (status !== undefined) params.set('status', status);
      const queryString = params.toString();
      const path =
        queryString !== ''
          ? `/admin/webhooks/${webhookId}/deliveries?${queryString}`
          : `/admin/webhooks/${webhookId}/deliveries`;
      return request<AdminWebhookDeliveryListResponse>(path);
    },

    async replayWebhookDelivery(
      webhookId: string,
      deliveryId: string,
    ): Promise<AdminWebhookReplayResponse> {
      return request<AdminWebhookReplayResponse>(
        `/admin/webhooks/${webhookId}/deliveries/${deliveryId}/replay`,
        { method: 'POST' },
      );
    },

    // Health & metrics
    async getHealth(): Promise<AdminHealthResponse> {
      return request<AdminHealthResponse>('/admin/health');
    },

    async getMetrics(): Promise<AdminMetricsResponse> {
      return request<AdminMetricsResponse>('/admin/metrics');
    },

    // Feature flag overrides
    async listFeatureFlagOverrides(flagKey: string): Promise<FeatureFlagOverrideListResponse> {
      return request<FeatureFlagOverrideListResponse>(`/admin/feature-flags/${flagKey}/overrides`);
    },

    async setFeatureFlagOverride(
      flagKey: string,
      data: SetFeatureFlagOverrideRequest,
    ): Promise<FeatureFlagOverrideResponse> {
      return request<FeatureFlagOverrideResponse>(`/admin/feature-flags/${flagKey}/overrides`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async deleteFeatureFlagOverride(
      flagKey: string,
      tenantId: string,
    ): Promise<FeatureFlagOverrideDeleteResponse> {
      return request<FeatureFlagOverrideDeleteResponse>(
        `/admin/feature-flags/${flagKey}/overrides/${tenantId}/delete`,
        {
          method: 'POST',
        },
      );
    },

    // Error logs
    async getErrorLog(limit?: number): Promise<AdminErrorLogResponse> {
      const params = new URLSearchParams();
      if (limit !== undefined) params.set('limit', String(limit));
      const queryString = params.toString();
      const path = queryString !== '' ? `/admin/errors?${queryString}` : '/admin/errors';
      return request<AdminErrorLogResponse>(path);
    },

    // Tenant plan assignment
    async assignTenantPlan(
      tenantId: string,
      data: AssignTenantPlanRequest,
    ): Promise<AssignTenantPlanResponse> {
      return request<AssignTenantPlanResponse>(`/admin/tenants/${tenantId}/assign-plan`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  };
}
