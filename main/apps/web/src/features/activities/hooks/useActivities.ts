// main/apps/web/src/features/activities/hooks/useActivities.ts
/**
 * Activities Hooks
 *
 * Query hooks for fetching user and tenant activity feeds.
 */

import { getAccessToken } from '@app/authToken';
import { useQuery } from '@bslt/react';
import { clientConfig } from '@config';

import { createActivitiesApi } from '../api/activitiesApi';

import type { ActivityListResponse, ActivityLocal } from '../api/activitiesApi';

// ============================================================================
// API Instance
// ============================================================================

let activitiesApi: ReturnType<typeof createActivitiesApi> | null = null;

function getActivitiesApi(): ReturnType<typeof createActivitiesApi> {
  activitiesApi ??= createActivitiesApi({
    baseUrl: clientConfig.apiUrl,
    getToken: getAccessToken,
  });
  return activitiesApi;
}

// ============================================================================
// User Activities
// ============================================================================

export interface UseActivitiesOptions {
  limit?: number;
}

export interface UseActivitiesResult {
  activities: ActivityLocal[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useActivities(options?: UseActivitiesOptions): UseActivitiesResult {
  const queryResult = useQuery<ActivityListResponse>({
    queryKey: ['activities', options?.limit ?? 50],
    queryFn: async (): Promise<ActivityListResponse> => {
      const api = getActivitiesApi();
      return api.listActivities(options?.limit);
    },
    staleTime: 30000,
  });

  return {
    activities: queryResult.data?.activities ?? [],
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}

// ============================================================================
// Tenant Activities
// ============================================================================

export interface UseTenantActivitiesOptions {
  tenantId: string;
  limit?: number;
}

export interface UseTenantActivitiesResult {
  activities: ActivityLocal[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTenantActivities(
  options: UseTenantActivitiesOptions,
): UseTenantActivitiesResult {
  const queryResult = useQuery<ActivityListResponse>({
    queryKey: ['tenantActivities', options.tenantId, options.limit ?? 50],
    queryFn: async (): Promise<ActivityListResponse> => {
      const api = getActivitiesApi();
      return api.listTenantActivities(options.tenantId, options.limit);
    },
    staleTime: 30000,
  });

  return {
    activities: queryResult.data?.activities ?? [],
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
