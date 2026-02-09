// src/client/api/src/billing/hooks.ts
/**
 * Billing React Hooks
 *
 * Provides convenient hooks for working with billing:
 * - usePlans: Get available pricing plans
 * - useSubscription: Manage current subscription
 * - useInvoices: View invoice history
 * - usePaymentMethods: Manage payment methods
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createBillingClient } from './client';

import type { BillingClientConfig } from './client';
import type {
  CancelSubscriptionRequest,
  CheckoutRequest,
  CheckoutResponse,
  Invoice,
  InvoicesListResponse,
  PaymentMethod,
  PaymentMethodsListResponse,
  Plan,
  PlanId,
  PlansListResponse,
  SetupIntentResponse,
  Subscription,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
} from '@abe-stack/shared';

// ============================================================================
// Query Keys
// ============================================================================

export const billingQueryKeys = {
  all: ['billing'] as const,
  plans: () => [...billingQueryKeys.all, 'plans'] as const,
  subscription: () => [...billingQueryKeys.all, 'subscription'] as const,
  invoices: () => [...billingQueryKeys.all, 'invoices'] as const,
  paymentMethods: () => [...billingQueryKeys.all, 'payment-methods'] as const,
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
 *
 * @example
 * ```tsx
 * function PricingPage() {
 *   const { plans, isLoading } = usePlans({
 *     baseUrl: '/api',
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div className="pricing-grid">
 *       {plans.map(plan => (
 *         <PlanCard key={plan.id} plan={plan} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePlans(clientConfig: BillingClientConfig): PlansState {
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createBillingClient(clientConfig), [clientConfig]);

  const fetchPlans = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response: PlansListResponse = await client.listPlans();
      setPlans(response.plans);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch plans'));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  return {
    isLoading,
    plans,
    error,
    refresh: fetchPlans,
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
 *
 * @example
 * ```tsx
 * function SubscriptionPage() {
 *   const {
 *     subscription,
 *     isLoading,
 *     cancel,
 *     createCheckout,
 *   } = useSubscription({
 *     baseUrl: '/api',
 *     getToken: () => token,
 *   });
 *
 *   const handleUpgrade = async () => {
 *     const url = await createCheckout({ planId: 'pro-plan' });
 *     window.location.href = url;
 *   };
 *
 *   if (isLoading) return <Spinner />;
 *
 *   if (!subscription) {
 *     return <button onClick={handleUpgrade}>Subscribe Now</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Current plan: {subscription.plan.name}</p>
 *       <button onClick={() => cancel()}>Cancel</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSubscription(clientConfig: BillingClientConfig): SubscriptionState {
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createBillingClient(clientConfig), [clientConfig]);

  const fetchSubscription = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response: SubscriptionResponse = await client.getSubscription();
      setSubscription(response.subscription);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch subscription'));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const createCheckout = useCallback(
    async (data: CheckoutRequest): Promise<string> => {
      try {
        setIsActing(true);
        setError(null);
        const response: CheckoutResponse = await client.createCheckout(data);
        return response.url;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create checkout');
        setError(error);
        throw error;
      } finally {
        setIsActing(false);
      }
    },
    [client],
  );

  const cancel = useCallback(
    async (immediately = false): Promise<void> => {
      try {
        setIsActing(true);
        setError(null);
        const data: CancelSubscriptionRequest = { immediately };
        await client.cancelSubscription(data);
        await fetchSubscription();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to cancel subscription');
        setError(error);
        throw error;
      } finally {
        setIsActing(false);
      }
    },
    [client, fetchSubscription],
  );

  const resume = useCallback(async (): Promise<void> => {
    try {
      setIsActing(true);
      setError(null);
      await client.resumeSubscription();
      await fetchSubscription();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to resume subscription');
      setError(error);
      throw error;
    } finally {
      setIsActing(false);
    }
  }, [client, fetchSubscription]);

  const changePlan = useCallback(
    async (planId: PlanId): Promise<void> => {
      try {
        setIsActing(true);
        setError(null);
        const data: UpdateSubscriptionRequest = { planId };
        await client.updateSubscription(data);
        await fetchSubscription();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to change plan');
        setError(error);
        throw error;
      } finally {
        setIsActing(false);
      }
    },
    [client, fetchSubscription],
  );

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  return {
    isLoading,
    isActing,
    subscription,
    error,
    createCheckout,
    cancel,
    resume,
    changePlan,
    refresh: fetchSubscription,
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
 *
 * @example
 * ```tsx
 * function InvoiceHistory() {
 *   const { invoices, isLoading } = useInvoices({
 *     baseUrl: '/api',
 *     getToken: () => token,
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <table>
 *       <tbody>
 *         {invoices.map(invoice => (
 *           <tr key={invoice.id}>
 *             <td>{invoice.periodStart}</td>
 *             <td>${(invoice.amountPaid / 100).toFixed(2)}</td>
 *             <td>{invoice.status}</td>
 *           </tr>
 *         ))}
 *       </tbody>
 *     </table>
 *   );
 * }
 * ```
 */
export function useInvoices(clientConfig: BillingClientConfig): InvoicesState {
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createBillingClient(clientConfig), [clientConfig]);

  const fetchInvoices = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response: InvoicesListResponse = await client.listInvoices();
      setInvoices(response.invoices);
      setHasMore(response.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch invoices'));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  return {
    isLoading,
    invoices,
    hasMore,
    error,
    refresh: fetchInvoices,
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
 *
 * @example
 * ```tsx
 * function PaymentMethodsManager() {
 *   const {
 *     paymentMethods,
 *     isLoading,
 *     getSetupIntent,
 *     addPaymentMethod,
 *     removePaymentMethod,
 *     setDefault,
 *   } = usePaymentMethods({
 *     baseUrl: '/api',
 *     getToken: () => token,
 *   });
 *
 *   const handleAddCard = async () => {
 *     const clientSecret = await getSetupIntent();
 *     // Use Stripe Elements with clientSecret to collect card
 *     // After successful setup, call addPaymentMethod(paymentMethodId)
 *   };
 *
 *   return (
 *     <div>
 *       {paymentMethods.map(pm => (
 *         <div key={pm.id}>
 *           {pm.cardDetails?.brand} **** {pm.cardDetails?.last4}
 *           {pm.isDefault && <span>Default</span>}
 *         </div>
 *       ))}
 *       <button onClick={handleAddCard}>Add Card</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePaymentMethods(clientConfig: BillingClientConfig): PaymentMethodsState {
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [setupIntentSecret, setSetupIntentSecret] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => createBillingClient(clientConfig), [clientConfig]);

  const fetchPaymentMethods = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response: PaymentMethodsListResponse = await client.listPaymentMethods();
      setPaymentMethods(response.paymentMethods);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch payment methods'));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const getSetupIntent = useCallback(async (): Promise<string> => {
    try {
      setIsActing(true);
      setError(null);
      const response: SetupIntentResponse = await client.createSetupIntent();
      setSetupIntentSecret(response.clientSecret);
      return response.clientSecret;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create setup intent');
      setError(error);
      throw error;
    } finally {
      setIsActing(false);
    }
  }, [client]);

  const addPaymentMethod = useCallback(
    async (paymentMethodId: string): Promise<void> => {
      try {
        setIsActing(true);
        setError(null);
        await client.addPaymentMethod({ paymentMethodId });
        setSetupIntentSecret(null);
        await fetchPaymentMethods();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add payment method');
        setError(error);
        throw error;
      } finally {
        setIsActing(false);
      }
    },
    [client, fetchPaymentMethods],
  );

  const removePaymentMethod = useCallback(
    async (paymentMethodId: string): Promise<void> => {
      try {
        setIsActing(true);
        setError(null);
        await client.removePaymentMethod(paymentMethodId);
        await fetchPaymentMethods();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to remove payment method');
        setError(error);
        throw error;
      } finally {
        setIsActing(false);
      }
    },
    [client, fetchPaymentMethods],
  );

  const setDefault = useCallback(
    async (paymentMethodId: string): Promise<void> => {
      try {
        setIsActing(true);
        setError(null);
        await client.setDefaultPaymentMethod(paymentMethodId);
        await fetchPaymentMethods();
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to set default payment method');
        setError(error);
        throw error;
      } finally {
        setIsActing(false);
      }
    },
    [client, fetchPaymentMethods],
  );

  useEffect(() => {
    void fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  return {
    isLoading,
    isActing,
    paymentMethods,
    setupIntentSecret,
    error,
    getSetupIntent,
    addPaymentMethod,
    removePaymentMethod,
    setDefault,
    refresh: fetchPaymentMethods,
  };
}
