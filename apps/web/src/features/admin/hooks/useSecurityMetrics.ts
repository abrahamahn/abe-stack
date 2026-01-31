// apps/web/src/features/admin/hooks/useSecurityMetrics.ts
/**
 * useSecurityMetrics hook
 *
 * Fetch security event metrics for the dashboard.
 */

import { useQuery } from '@abe-stack/client';
import { tokenStore } from '@abe-stack/core';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useMemo, useState } from 'react';


import { createAdminApiClient } from '../services/adminApi';

// ============================================================================
// Types
// ============================================================================

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

export type MetricsPeriod = 'hour' | 'day' | 'week' | 'month';

export interface UseSecurityMetricsOptions {
  period?: MetricsPeriod;
  enabled?: boolean;
}

export interface UseSecurityMetricsResult {
  data: SecurityMetricsLocal | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
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
        getToken: (): string | null => tokenStore.get(),
      }),
    [config.apiUrl],
  );

  const queryKey = useMemo(() => ['securityMetrics', period], [period]);

  const queryResult = useQuery<SecurityMetricsLocal>({
    queryKey,
    queryFn: async (): Promise<SecurityMetricsLocal> => {
      const result = await adminApi.getSecurityMetrics(period);
      return result as SecurityMetricsLocal;
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
