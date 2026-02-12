// src/apps/web/src/features/workspace/hooks/useWorkspaceBilling.ts
/**
 * Workspace Billing Hook
 *
 * Hook for fetching workspace subscription and billing info.
 */

import { useQuery } from '@abe-stack/client-engine';
import { MS_PER_MINUTE } from '@abe-stack/shared';
import { useClientEnvironment } from '@app/ClientEnvironment';

import type { UseQueryResult } from '@abe-stack/client-engine';

// ============================================================================
// Types
// ============================================================================

export interface Plan {
  id: string;
  name: string;
  tier: 'free' | 'pro' | 'enterprise';
  price: number;
  currency: string;
  interval: 'month' | 'year';
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan: Plan;
  provider: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialEnd: string | null;
  createdAt: string;
}

export interface SubscriptionResponse {
  subscription: Subscription | null;
}

// ============================================================================
// Hook
// ============================================================================

export interface UseWorkspaceBillingOptions {
  enabled?: boolean;
}

export interface UseWorkspaceBillingResult {
  plan: Plan | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWorkspaceBilling(
  tenantId: string,
  options?: UseWorkspaceBillingOptions,
): UseWorkspaceBillingResult {
  const { config } = useClientEnvironment();

  const queryOptions: {
    queryKey: string[];
    queryFn: () => Promise<SubscriptionResponse>;
    staleTime: number;
    enabled?: boolean;
  } = {
    queryKey: ['workspaceBilling', tenantId],
    queryFn: async (): Promise<SubscriptionResponse> => {
      const token = localStorage.getItem('accessToken') ?? '';

      const response = await fetch(`${config.apiUrl}/api/billing/subscription`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      return response.json() as Promise<SubscriptionResponse>;
    },
    staleTime: MS_PER_MINUTE,
  };

  if (options?.enabled !== undefined) {
    queryOptions.enabled = options.enabled;
  }

  const queryResult: UseQueryResult<SubscriptionResponse> =
    useQuery<SubscriptionResponse>(queryOptions);

  return {
    plan: queryResult.data?.subscription?.plan ?? null,
    subscription: queryResult.data?.subscription ?? null,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
