// main/client/api/src/activities/client.ts
/**
 * Activities API Client
 *
 * Type-safe client for user and tenant activity feeds.
 */

import { createCsrfRequestClient } from '../utils';

import type { BaseClientConfig } from '../utils';

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

export type ActivitiesClientConfig = BaseClientConfig;

export interface ActivitiesClient {
  listActivities: (limit?: number) => Promise<ActivityListResponse>;
  listTenantActivities: (tenantId: string, limit?: number) => Promise<ActivityListResponse>;
}

export function createActivitiesClient(config: ActivitiesClientConfig): ActivitiesClient {
  const { request } = createCsrfRequestClient(config);

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

