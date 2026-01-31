// apps/web/src/features/admin/services/adminApi.ts
/**
 * Admin API Service
 *
 * API client methods for admin security audit operations.
 */

import { createApiError, NetworkError } from '@abe-stack/client';
import { addAuthHeader } from '@abe-stack/core';

import type { ApiErrorBody } from '@abe-stack/client';

// ============================================================================
// Local Type Definitions
// ============================================================================

type JobStatusLocal =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'dead_letter'
  | 'cancelled';

interface JobDetailsLocal {
  id: string;
  name: string;
  status: JobStatusLocal;
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
  status?: JobStatusLocal;
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
    const token: string | null | undefined = config.getToken?.();
    (addAuthHeader as (headers: Headers, token: string | null | undefined) => void)(headers, token);

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
  };
}
