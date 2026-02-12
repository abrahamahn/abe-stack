// src/apps/web/src/features/activities/api/activitiesApi.ts
/**
 * Activities API Client
 *
 * API client for fetching user and tenant activity feeds.
 */

import { createApiError, NetworkError } from '@abe-stack/client-engine';
import { addAuthHeader, API_PREFIX, trimTrailingSlashes } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export interface ActivityLocal {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  actorType: 'user' | 'system' | 'api_key';
  action: string;
  resourceType: string;
  resourceId: string;
  description: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

export interface ActivityListResponse {
  activities: ActivityLocal[];
}

export interface ActivitiesApiConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

export interface ActivitiesApi {
  listActivities: (limit?: number) => Promise<ActivityListResponse>;
  listTenantActivities: (tenantId: string, limit?: number) => Promise<ActivityListResponse>;
}

// ============================================================================
// API Client
// ============================================================================

export function createActivitiesApi(config: ActivitiesApiConfig): ActivitiesApi {
  const baseUrl = trimTrailingSlashes(config.baseUrl);
  const fetcher = config.fetchImpl ?? fetch;

  const request = async <T>(path: string): Promise<T> => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    addAuthHeader(headers, config.getToken?.());

    const url = `${baseUrl}${API_PREFIX}${path}`;

    let response: Response;
    try {
      response = await fetcher(url, {
        headers,
        credentials: 'include',
      });
    } catch (error: unknown) {
      throw new NetworkError(
        `Failed to fetch GET ${path}`,
        error instanceof Error ? error : undefined,
      );
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw createApiError(response.status, data as { message?: string; code?: string });
    }

    return data as T;
  };

  return {
    async listActivities(limit?: number): Promise<ActivityListResponse> {
      const params = new URLSearchParams();
      if (limit !== undefined) params.set('limit', String(limit));
      const queryString = params.toString();
      const path = queryString !== '' ? `/activities?${queryString}` : '/activities';
      return request<ActivityListResponse>(path);
    },

    async listTenantActivities(tenantId: string, limit?: number): Promise<ActivityListResponse> {
      const params = new URLSearchParams();
      if (limit !== undefined) params.set('limit', String(limit));
      const queryString = params.toString();
      const path =
        queryString !== ''
          ? `/tenants/${tenantId}/activities?${queryString}`
          : `/tenants/${tenantId}/activities`;
      return request<ActivityListResponse>(path);
    },
  };
}
