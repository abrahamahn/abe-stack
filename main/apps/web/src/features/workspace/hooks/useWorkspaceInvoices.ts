// main/apps/web/src/features/workspace/hooks/useWorkspaceInvoices.ts
/**
 * Workspace Invoices Hook
 *
 * Hook for fetching workspace invoice history from billing API.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { createBillingClient } from '@bslt/api';
import { useQuery } from '@bslt/react';
import { MS_PER_MINUTE } from '@bslt/shared';

import type { UseQueryResult } from '@bslt/react';
import type { Invoice } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

export interface InvoicesResponse {
  invoices: Invoice[];
  hasMore: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export interface UseWorkspaceInvoicesOptions {
  enabled?: boolean;
}

export interface UseWorkspaceInvoicesResult {
  invoices: Invoice[];
  hasMore: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWorkspaceInvoices(
  tenantId: string,
  options?: UseWorkspaceInvoicesOptions,
): UseWorkspaceInvoicesResult {
  const { config } = useClientEnvironment();

  const queryOptions: {
    queryKey: string[];
    queryFn: () => Promise<InvoicesResponse>;
    staleTime: number;
    enabled?: boolean;
  } = {
    queryKey: ['workspaceInvoices', tenantId],
    queryFn: async (): Promise<InvoicesResponse> => {
      const billingClient = createBillingClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });
      return (await billingClient.listInvoices()) as InvoicesResponse;
    },
    staleTime: MS_PER_MINUTE * 2,
  };

  if (options?.enabled !== undefined) {
    queryOptions.enabled = options.enabled;
  }

  const queryResult: UseQueryResult<InvoicesResponse> = useQuery<InvoicesResponse>(queryOptions);

  return {
    invoices: queryResult.data?.invoices ?? [],
    hasMore: queryResult.data?.hasMore ?? false,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
