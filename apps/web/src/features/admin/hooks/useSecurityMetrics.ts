// apps/web/src/features/admin/hooks/useSecurityMetrics.ts
/**
 * useSecurityMetrics hook
 *
 * Fetch security event metrics for the dashboard.
 */

import { tokenStore } from '@abe-stack/core';
import { useQuery, type UseQueryResult } from '@abe-stack/sdk';
import { useCallback, useMemo, useState } from 'react';

import { useClientEnvironment } from '@app/ClientEnvironment';

import { createAdminApiClient } from '../services/adminApi';

import type { SecurityMetrics } from '@abe-stack/core';

// ============================================================================
// Types
// ============================================================================

export type MetricsPeriod = 'hour' | 'day' | 'week' | 'month';

export interface UseSecurityMetricsOptions {
  period?: MetricsPeriod;
  enabled?: boolean;
}

export interface UseSecurityMetricsResult {
  data: SecurityMetrics | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  period: MetricsPeriod;
  setPeriod: (period: MetricsPeriod) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useSecurityMetrics(
  options: UseSecurityMetricsOptions = {},
): UseSecurityMetricsResult {
  const { config } = useClientEnvironment();
  const [period, setPeriodState] = useState<MetricsPeriod>(options.period ?? 'day');

  const adminApi = useMemo(
    () =>
      createAdminApiClient({
        baseUrl: config.apiUrl,
        getToken: () => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const queryKey = useMemo(() => ['securityMetrics', period], [period]);

  const queryResult: UseQueryResult<SecurityMetrics> = useQuery({
    queryKey,
    queryFn: async () => {
      return adminApi.getSecurityMetrics(period);
    },
    enabled: options.enabled !== false,
  });

  const setPeriod = useCallback((newPeriod: MetricsPeriod) => {
    setPeriodState(newPeriod);
  }, []);

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
    period,
    setPeriod,
  };
}
