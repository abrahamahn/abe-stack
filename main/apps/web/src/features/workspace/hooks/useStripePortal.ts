// main/apps/web/src/features/workspace/hooks/useStripePortal.ts
/**
 * Stripe Customer Portal Hook
 *
 * Hook for creating a Stripe customer portal session and redirecting.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { createBillingClient } from '@bslt/api';
import { useMutation } from '@bslt/react';

// ============================================================================
// Types
// ============================================================================

export interface PortalSessionResponse {
  url: string;
}

export interface UseStripePortalOptions {
  onError?: (error: Error) => void;
}

export interface UseStripePortalResult {
  openPortal: (returnUrl?: string) => void;
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useStripePortal(options?: UseStripePortalOptions): UseStripePortalResult {
  const { config } = useClientEnvironment();

  const mutation = useMutation<PortalSessionResponse, Error, { returnUrl?: string }>({
    mutationFn: async ({ returnUrl }): Promise<PortalSessionResponse> => {
      const billingClient = createBillingClient({
        baseUrl: config.apiUrl,
        getToken: getAccessToken,
      });

      const response = (await billingClient.createPortal({
        returnUrl: returnUrl ?? window.location.href,
      })) as PortalSessionResponse;
      return response;
    },
    onSuccess: (data) => {
      // Redirect to Stripe customer portal
      window.location.href = data.url;
    },
    onError: (error: Error): void => {
      options?.onError?.(error);
    },
  });

  return {
    openPortal: (returnUrl?: string): void => {
      mutation.mutate(returnUrl !== undefined ? { returnUrl } : {});
    },
    isLoading: mutation.status === 'pending',
    error: mutation.error,
  };
}
