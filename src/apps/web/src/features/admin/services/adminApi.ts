// src/apps/web/src/features/admin/services/adminApi.ts
/**
 * Admin API Service
 *
 * API client methods for admin security audit operations.
 */

import { createApiError, NetworkError } from '@abe-stack/client-engine';
import { addAuthHeader, API_PREFIX, trimTrailingSlashes } from '@abe-stack/shared';

import type { ApiErrorBody } from '@abe-stack/client-engine';
import type {
  AdminLockUserRequest,
  AdminLockUserResponse,
  AdminUpdateUserRequest,
  AdminUpdateUserResponse,
  AdminUser,
  AdminUserListFilters,
  AdminUserListResponse,
  JobStatus,
  UnlockAccountRequest,
} from '@abe-stack/shared';

// ============================================================================
// Local Type Definitions
// ============================================================================

interface JobDetailsLocal {
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

interface JobListQueryLocal {
  status?: JobStatus;
  name?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface JobListResponseLocal {
  data: JobDetailsLocal[];
  page: number;
  totalPages: number;
}

interface QueueStatsLocal {
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

interface JobActionResponseLocal {
  success: boolean;
  message?: string;
}

interface SecurityEventLocal {
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

interface SecurityEventsFilterLocal {
  eventType?: string;
  severity?: string;
  email?: string;
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

interface SecurityEventsListRequestLocal {
  filter?: SecurityEventsFilterLocal;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SecurityEventsListResponseLocal {
  data: SecurityEventLocal[];
  total: number;
  totalPages: number;
}

interface SecurityMetricsLocal {
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

interface SecurityEventsExportRequestLocal {
  format: 'csv' | 'json';
  filter?: SecurityEventsFilterLocal;
}

interface SecurityEventsExportResponseLocal {
  data: string;
  contentType: string;
  filename: string;
}

interface RouteRegistryEntryLocal {
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

// ============================================================================
// Feature Flag Types
// ============================================================================

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

// ============================================================================
// Tenant Management Types (Stub - Backend not implemented yet)
// ============================================================================

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
// Types
// ============================================================================

export interface AdminApiConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

export interface AdminApiClient {
  // User management
  listUsers: (filters?: AdminUserListFilters) => Promise<AdminUserListResponse>;
  getUser: (userId: string) => Promise<AdminUser>;
  updateUser: (userId: string, data: AdminUpdateUserRequest) => Promise<AdminUpdateUserResponse>;
  lockUser: (userId: string, data: AdminLockUserRequest) => Promise<AdminLockUserResponse>;
  unlockUser: (userId: string, data: UnlockAccountRequest) => Promise<AdminLockUserResponse>;

  // Tenant management (Stub - Backend not implemented yet)
  listTenants: () => Promise<TenantListResponse>;
  getTenant: (tenantId: string) => Promise<AdminTenantDetailLocal>;
  suspendTenant: (tenantId: string, reason: string) => Promise<void>;
  unsuspendTenant: (tenantId: string) => Promise<void>;

  // Security events
  listSecurityEvents: (
    request: SecurityEventsListRequestLocal,
  ) => Promise<SecurityEventsListResponseLocal>;
  getSecurityEvent: (id: string) => Promise<SecurityEventLocal>;
  getSecurityMetrics: (period?: 'hour' | 'day' | 'week' | 'month') => Promise<SecurityMetricsLocal>;
  exportSecurityEvents: (
    request: SecurityEventsExportRequestLocal,
  ) => Promise<SecurityEventsExportResponseLocal>;

  // Job monitoring
  listJobs: (query: Partial<JobListQueryLocal>) => Promise<JobListResponseLocal>;
  getJobDetails: (jobId: string) => Promise<JobDetailsLocal>;
  getQueueStats: () => Promise<QueueStatsLocal>;
  retryJob: (jobId: string) => Promise<JobActionResponseLocal>;
  cancelJob: (jobId: string) => Promise<JobActionResponseLocal>;

  // API introspection
  getRouteManifest: () => Promise<RouteManifestResponseLocal>;

  // Audit events
  listAuditEvents: (filter?: AuditEventsFilterLocal) => Promise<AuditEventsResponseLocal>;

  // Feature flags
  listFeatureFlags: () => Promise<FeatureFlagListResponse>;
  createFeatureFlag: (data: CreateFeatureFlagRequest) => Promise<FeatureFlagResponse>;
  updateFeatureFlag: (key: string, data: UpdateFeatureFlagRequest) => Promise<FeatureFlagResponse>;
  deleteFeatureFlag: (key: string) => Promise<FeatureFlagDeleteResponse>;
}

// ============================================================================
// API Client
// ============================================================================

export function createAdminApiClient(config: AdminApiConfig): AdminApiClient {
  const baseUrl = trimTrailingSlashes(config.baseUrl);
  const fetcher = config.fetchImpl ?? fetch;

  const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');
    addAuthHeader(headers, config.getToken?.());

    const url = `${baseUrl}${API_PREFIX}${path}`;

    let response: Response;
    try {
      response = await fetcher(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (error: unknown) {
      throw new NetworkError(
        `Failed to fetch ${options?.method ?? 'GET'} ${path}`,
        error instanceof Error ? error : undefined,
      );
    }

    const data = (await response.json().catch(() => ({}))) as ApiErrorBody &
      Record<string, unknown>;

    if (!response.ok) {
      throw createApiError(response.status, data);
    }

    return data as T;
  };

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

    // Job monitoring methods
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
      return request<JobActionResponseLocal>(`/admin/jobs/${jobId}/retry`, {
        method: 'POST',
      });
    },

    async cancelJob(jobId: string): Promise<JobActionResponseLocal> {
      return request<JobActionResponseLocal>(`/admin/jobs/${jobId}/cancel`, {
        method: 'POST',
      });
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

    // Feature flags
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

    // Tenant management stubs (Backend not implemented yet)
    listTenants(): Promise<TenantListResponse> {
      return Promise.reject(new Error('Tenant management API not implemented yet'));
    },

    getTenant(_tenantId: string): Promise<AdminTenantDetailLocal> {
      return Promise.reject(new Error('Tenant management API not implemented yet'));
    },

    suspendTenant(_tenantId: string, _reason: string): Promise<void> {
      return Promise.reject(new Error('Tenant management API not implemented yet'));
    },

    unsuspendTenant(_tenantId: string): Promise<void> {
      return Promise.reject(new Error('Tenant management API not implemented yet'));
    },
  };
}
