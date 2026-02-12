// src/apps/web/src/features/admin/hooks/useFeatureFlag.ts
/**
 * Feature Flag Evaluation Hook
 *
 * Client-side hook for checking whether a specific feature flag is enabled
 * for the current user. Uses the public flag evaluation endpoint.
 */

import { useQuery } from '@abe-stack/react';
import { addAuthHeader, trimTrailingSlashes, WORKSPACE_ID_HEADER } from '@abe-stack/shared';
import { useClientEnvironment } from '@app/ClientEnvironment';

import type { UseQueryResult } from '@abe-stack/react';

// ============================================================================
// Types
// ============================================================================

interface EvaluateFlagsResponse {
  flags: Record<string, boolean>;
}

export interface UseFeatureFlagOptions {
  /** Optional tenant / workspace ID for tenant-scoped evaluation */
  tenantId?: string;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

export interface UseFeatureFlagResult {
  /** Whether the flag is enabled for the current context */
  enabled: boolean;
  /** Whether the flag evaluation is still loading */
  loading: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Evaluate a single feature flag for the current user context.
 *
 * Calls the `GET /api/feature-flags/evaluate` endpoint, which returns
 * a map of all evaluated flags, then extracts the value for `flagKey`.
 * Defaults to `false` (disabled) while loading or on error.
 *
 * @param flagKey - The feature flag key to check
 * @param options - Optional tenant ID and query control
 * @returns `{ enabled, loading }` for the specified flag
 */
export function useFeatureFlag(
  flagKey: string,
  options?: UseFeatureFlagOptions,
): UseFeatureFlagResult {
  const { config } = useClientEnvironment();
  const baseUrl = trimTrailingSlashes(config.apiUrl);

  const tenantId = options?.tenantId;
  const queryEnabled = options?.enabled ?? true;

  const queryOptions: {
    queryKey: string[];
    queryFn: () => Promise<EvaluateFlagsResponse>;
    staleTime: number;
    enabled?: boolean;
  } = {
    queryKey: tenantId !== undefined ? ['featureFlagEval', tenantId] : ['featureFlagEval'],
    queryFn: async (): Promise<EvaluateFlagsResponse> => {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');

      const token: string | null = localStorage.getItem('accessToken');
      addAuthHeader(headers, token);

      if (tenantId !== undefined) {
        headers.set(WORKSPACE_ID_HEADER, tenantId);
      }

      const queryString = tenantId !== undefined ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      const url = `${baseUrl}/api/feature-flags/evaluate${queryString}`;

      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to evaluate feature flags: ${String(response.status)}`);
      }

      return (await response.json()) as EvaluateFlagsResponse;
    },
    staleTime: 30000,
  };

  if (!queryEnabled) {
    queryOptions.enabled = false;
  }

  const queryResult: UseQueryResult<EvaluateFlagsResponse> =
    useQuery<EvaluateFlagsResponse>(queryOptions);

  const flagValue = queryResult.data?.flags[flagKey] ?? false;

  return {
    enabled: flagValue,
    loading: queryResult.isLoading,
  };
}
