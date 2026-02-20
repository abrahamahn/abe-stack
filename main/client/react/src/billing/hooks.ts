// main/client/react/src/billing/hooks.ts
/**
 * Billing React Hooks
 *
 * Provides hooks backed by useQuery/useMutation for working with billing:
 * - usePlans: Get available pricing plans
 * - useSubscription: Manage current subscription
 * - useInvoices: View invoice history
 * - usePaymentMethods: Manage payment methods
 */

import { createBillingClient } from '@bslt/client-engine';
import { calculateProration } from '@bslt/shared';
import { useMemo, useState } from 'react';

import { useMutation } from '../query/useMutation';
import { useQuery } from '../query/useQuery';

import type { BillingClientConfig, QueryKey } from '@bslt/client-engine';
import type {
  CheckoutRequest,
  Invoice,
  PaymentMethod,
  Plan,
  PlanId,
  Subscription,
} from '@bslt/shared';

// ============================================================================
// Query Keys
// ============================================================================

export const billingQueryKeys = {
  all: ['billing'] as const,
  plans: (): QueryKey => [...billingQueryKeys.all, 'plans'],
  subscription: (): QueryKey => [...billingQueryKeys.all, 'subscription'],
  invoices: (): QueryKey => [...billingQueryKeys.all, 'invoices'],
  paymentMethods: (): QueryKey => [...billingQueryKeys.all, 'payment-methods'],
} as const;

// ============================================================================
// usePlans
// ============================================================================

/**
 * Plans state
 */
export interface PlansState {
  /** Whether loading plans */
  isLoading: boolean;
  /** Available plans */
  plans: Plan[];
  /** Error if failed */
  error: Error | null;
  /** Refresh plans from server */
  refresh: () => Promise<void>;
}

/**
 * Hook to get available pricing plans
 *
 * @param clientConfig - API client configuration
 * @returns Plans state
 */
export function usePlans(clientConfig: BillingClientConfig): PlansState {
  const client = useMemo(() => createBillingClient(clientConfig), [clientConfig]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: billingQueryKeys.plans(),
    queryFn: () => client.listPlans(),
  });

  return {
    plans: data?.plans ?? [],
    isLoading,
    error: error ?? null,
    refresh: refetch,
  };
}

// ============================================================================
// useSubscription
// ============================================================================

/**
 * Subscription state
 */
export interface SubscriptionState {
  /** Whether loading subscription */
  isLoading: boolean;
  /** Whether an action is in progress */
  isActing: boolean;
  /** Current subscription (null if not subscribed) */
  subscription: Subscription | null;
  /** Error if failed */
  error: Error | null;
  /** Create checkout session */
  createCheckout: (data: CheckoutRequest) => Promise<string>;
  /** Cancel subscription */
  cancel: (immediately?: boolean) => Promise<void>;
  /** Resume subscription */
  resume: () => Promise<void>;
  /** Change plan */
  changePlan: (planId: PlanId) => Promise<void>;
  /** Refresh subscription from server */
  refresh: () => Promise<void>;
}

/**
 * Hook to manage subscription state
 *
 * @param clientConfig - API client configuration
 * @returns Subscription state and actions
 */
export function useSubscription(clientConfig: BillingClientConfig): SubscriptionState {
  const client = useMemo(() => createBillingClient(clientConfig), [clientConfig]);

  const query = useQuery({
    queryKey: billingQueryKeys.subscription(),
    queryFn: () => client.getSubscription(),
  });

  const createCheckoutMutation = useMutation({
    mutationFn: (data: CheckoutRequest) => client.createCheckout(data),
  });

  const cancelMutation = useMutation({
    mutationFn: (data: { immediately: boolean }) => client.cancelSubscription(data),
    invalidateOnSuccess: [billingQueryKeys.subscription()],
  });

  const resumeMutation = useMutation({
    mutationFn: () => client.resumeSubscription(),
    invalidateOnSuccess: [billingQueryKeys.subscription()],
  });

  const changePlanMutation = useMutation({
    mutationFn: (planId: PlanId) => client.updateSubscription({ planId }),
    invalidateOnSuccess: [billingQueryKeys.subscription()],
  });

  return {
    subscription: query.data?.subscription ?? null,
    isLoading: query.isLoading,
    isActing:
      createCheckoutMutation.isPending ||
      cancelMutation.isPending ||
      resumeMutation.isPending ||
      changePlanMutation.isPending,
    error:
      query.error ??
      createCheckoutMutation.error ??
      cancelMutation.error ??
      resumeMutation.error ??
      changePlanMutation.error ??
      null,
    createCheckout: async (data: CheckoutRequest): Promise<string> => {
      const result = await createCheckoutMutation.mutateAsync(data);
      return result.url;
    },
    cancel: async (immediately = false): Promise<void> => {
      await cancelMutation.mutateAsync({ immediately });
    },
    resume: async (): Promise<void> => {
      await resumeMutation.mutateAsync(undefined);
    },
    changePlan: async (planId: PlanId): Promise<void> => {
      await changePlanMutation.mutateAsync(planId);
    },
    refresh: query.refetch,
  };
}

// ============================================================================
// useInvoices
// ============================================================================

/**
 * Invoices state
 */
export interface InvoicesState {
  /** Whether loading invoices */
  isLoading: boolean;
  /** List of invoices */
  invoices: Invoice[];
  /** Whether there are more invoices */
  hasMore: boolean;
  /** Error if failed */
  error: Error | null;
  /** Refresh invoices from server */
  refresh: () => Promise<void>;
}

/**
 * Hook to get user's invoices
 *
 * @param clientConfig - API client configuration
 * @returns Invoices state
 */
export function useInvoices(clientConfig: BillingClientConfig): InvoicesState {
  const client = useMemo(() => createBillingClient(clientConfig), [clientConfig]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: billingQueryKeys.invoices(),
    queryFn: () => client.listInvoices(),
  });

  return {
    invoices: data?.invoices ?? [],
    hasMore: data?.hasMore ?? false,
    isLoading,
    error: error ?? null,
    refresh: refetch,
  };
}

// ============================================================================
// usePaymentMethods
// ============================================================================

/**
 * Payment methods state
 */
export interface PaymentMethodsState {
  /** Whether loading payment methods */
  isLoading: boolean;
  /** Whether an action is in progress */
  isActing: boolean;
  /** List of payment methods */
  paymentMethods: PaymentMethod[];
  /** Setup intent client secret for adding new card */
  setupIntentSecret: string | null;
  /** Error if failed */
  error: Error | null;
  /** Get setup intent for adding card */
  getSetupIntent: () => Promise<string>;
  /** Add a payment method after setup */
  addPaymentMethod: (paymentMethodId: string) => Promise<void>;
  /** Remove a payment method */
  removePaymentMethod: (paymentMethodId: string) => Promise<void>;
  /** Set a payment method as default */
  setDefault: (paymentMethodId: string) => Promise<void>;
  /** Refresh payment methods from server */
  refresh: () => Promise<void>;
}

/**
 * Hook to manage payment methods
 *
 * @param clientConfig - API client configuration
 * @returns Payment methods state and actions
 */
export function usePaymentMethods(clientConfig: BillingClientConfig): PaymentMethodsState {
  const client = useMemo(() => createBillingClient(clientConfig), [clientConfig]);

  // Local state for setup intent secret (not from a query)
  const [setupIntentSecret, setSetupIntentSecret] = useState<string | null>(null);

  const query = useQuery({
    queryKey: billingQueryKeys.paymentMethods(),
    queryFn: () => client.listPaymentMethods(),
  });

  const setupIntentMutation = useMutation({
    mutationFn: () => client.createSetupIntent(),
  });

  const addMutation = useMutation({
    mutationFn: (paymentMethodId: string) => client.addPaymentMethod({ paymentMethodId }),
    invalidateOnSuccess: [billingQueryKeys.paymentMethods()],
  });

  const removeMutation = useMutation({
    mutationFn: (paymentMethodId: string) => client.removePaymentMethod(paymentMethodId),
    invalidateOnSuccess: [billingQueryKeys.paymentMethods()],
  });

  const setDefaultMutation = useMutation({
    mutationFn: (paymentMethodId: string) => client.setDefaultPaymentMethod(paymentMethodId),
    invalidateOnSuccess: [billingQueryKeys.paymentMethods()],
  });

  return {
    paymentMethods: query.data?.paymentMethods ?? [],
    setupIntentSecret,
    isLoading: query.isLoading,
    isActing:
      setupIntentMutation.isPending ||
      addMutation.isPending ||
      removeMutation.isPending ||
      setDefaultMutation.isPending,
    error:
      query.error ??
      setupIntentMutation.error ??
      addMutation.error ??
      removeMutation.error ??
      setDefaultMutation.error ??
      null,
    getSetupIntent: async (): Promise<string> => {
      const result = await setupIntentMutation.mutateAsync(undefined);
      setSetupIntentSecret(result.clientSecret);
      return result.clientSecret;
    },
    addPaymentMethod: async (paymentMethodId: string): Promise<void> => {
      await addMutation.mutateAsync(paymentMethodId);
      setSetupIntentSecret(null);
    },
    removePaymentMethod: async (paymentMethodId: string): Promise<void> => {
      await removeMutation.mutateAsync(paymentMethodId);
    },
    setDefault: async (paymentMethodId: string): Promise<void> => {
      await setDefaultMutation.mutateAsync(paymentMethodId);
    },
    refresh: query.refetch,
  };
}

// ============================================================================
// useProrationPreview
// ============================================================================

/**
 * Proration preview state
 */
export interface ProrationPreviewState {
  /** Direction of the plan change */
  direction: 'upgrade' | 'downgrade' | 'same';
  /** Prorated amount in cents (positive = charge, negative = credit) */
  prorationAmount: number;
  /** Number of days remaining in the current billing period */
  remainingDays: number;
  /** Total number of days in the current billing period */
  totalDays: number;
  /** End date of the current billing period (ISO string) */
  periodEndDate: string;
}

/**
 * Hook to compute a proration preview for switching between plans.
 *
 * @param subscription - Current subscription (null if none)
 * @param newPlan - The plan the user wants to switch to (null if not selected)
 * @returns Proration preview state, or null if preview cannot be computed
 */
export function useProrationPreview(
  subscription: Subscription | null,
  newPlan: Plan | null,
): ProrationPreviewState | null {
  return useMemo(() => {
    if (subscription === null || newPlan === null) return null;

    const currentPlan = subscription.plan;
    if (currentPlan.id === newPlan.id) return null;

    const periodStart = new Date(subscription.currentPeriodStart);
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const now = new Date();

    const totalMs = periodEnd.getTime() - periodStart.getTime();
    const remainingMs = Math.max(0, periodEnd.getTime() - now.getTime());

    const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60 * 24)));

    const prorationAmount = calculateProration(
      currentPlan.priceInCents,
      newPlan.priceInCents,
      remainingDays,
      totalDays,
    );

    let direction: 'upgrade' | 'downgrade' | 'same';
    if (newPlan.priceInCents > currentPlan.priceInCents) {
      direction = 'upgrade';
    } else if (newPlan.priceInCents < currentPlan.priceInCents) {
      direction = 'downgrade';
    } else {
      direction = 'same';
    }

    return {
      direction,
      prorationAmount,
      remainingDays,
      totalDays,
      periodEndDate: subscription.currentPeriodEnd,
    };
  }, [subscription, newPlan]);
}
