// apps/web/src/features/admin/services/adminApi.ts
/**
 * Admin API Service
 *
 * API client methods for admin security audit operations.
 */

import { addAuthHeader } from '@abe-stack/core';
import { createApiError, NetworkError } from '@abe-stack/sdk';

import type {
  JobActionResponse,
  JobDetails,
  JobListQuery,
  JobListResponse,
  QueueStats,
  SecurityEvent,
  SecurityEventsExportRequest,
  SecurityEventsExportResponse,
  SecurityEventsListRequest,
  SecurityEventsListResponse,
  SecurityMetrics,
} from '@abe-stack/core';
import type { ApiErrorBody } from '@abe-stack/sdk';

// ============================================================================
// Types
// ============================================================================

export interface AdminApiConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

export interface AdminApiClient {
  // Security events
  listSecurityEvents: (request: SecurityEventsListRequest) => Promise<SecurityEventsListResponse>;
  getSecurityEvent: (id: string) => Promise<SecurityEvent>;
  getSecurityMetrics: (period?: 'hour' | 'day' | 'week' | 'month') => Promise<SecurityMetrics>;
  exportSecurityEvents: (
    request: SecurityEventsExportRequest,
  ) => Promise<SecurityEventsExportResponse>;

  // Job monitoring
  listJobs: (query: Partial<JobListQuery>) => Promise<JobListResponse>;
  getJobDetails: (jobId: string) => Promise<JobDetails>;
  getQueueStats: () => Promise<QueueStats>;
  retryJob: (jobId: string) => Promise<JobActionResponse>;
  cancelJob: (jobId: string) => Promise<JobActionResponse>;
}

// ============================================================================
// API Client
// ============================================================================

const API_PREFIX = '/api';

export function createAdminApiClient(config: AdminApiConfig): AdminApiClient {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
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
    } catch (error) {
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
    async listSecurityEvents(
      requestBody: SecurityEventsListRequest,
    ): Promise<SecurityEventsListResponse> {
      return request<SecurityEventsListResponse>('/admin/security/events', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    },

    async getSecurityEvent(id: string): Promise<SecurityEvent> {
      return request<SecurityEvent>(`/admin/security/events/${id}`);
    },

    async getSecurityMetrics(period?: 'hour' | 'day' | 'week' | 'month'): Promise<SecurityMetrics> {
      const queryString = period !== undefined ? `?period=${period}` : '';
      return request<SecurityMetrics>(`/admin/security/metrics${queryString}`);
    },

    async exportSecurityEvents(
      requestBody: SecurityEventsExportRequest,
    ): Promise<SecurityEventsExportResponse> {
      return request<SecurityEventsExportResponse>('/admin/security/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    },

    // Job monitoring methods
    async listJobs(query: Partial<JobListQuery> = {}): Promise<JobListResponse> {
      const params = new URLSearchParams();
      if (query.status !== undefined) params.set('status', query.status);
      if (query.name !== undefined && query.name !== '') params.set('name', query.name);
      if (query.page !== undefined && query.page !== 0) params.set('page', String(query.page));
      if (query.limit !== undefined && query.limit !== 0) params.set('limit', String(query.limit));
      if (query.sortBy !== undefined) params.set('sortBy', query.sortBy);
      if (query.sortOrder !== undefined) params.set('sortOrder', query.sortOrder);

      const queryString = params.toString();
      const path = queryString !== '' ? `/admin/jobs?${queryString}` : '/admin/jobs';
      return request<JobListResponse>(path);
    },

    async getJobDetails(jobId: string): Promise<JobDetails> {
      return request<JobDetails>(`/admin/jobs/${jobId}`);
    },

    async getQueueStats(): Promise<QueueStats> {
      return request<QueueStats>('/admin/jobs/stats');
    },

    async retryJob(jobId: string): Promise<JobActionResponse> {
      return request<JobActionResponse>(`/admin/jobs/${jobId}/retry`, {
        method: 'POST',
      });
    },

    async cancelJob(jobId: string): Promise<JobActionResponse> {
      return request<JobActionResponse>(`/admin/jobs/${jobId}/cancel`, {
        method: 'POST',
      });
    },
  };
}
