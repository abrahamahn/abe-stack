// apps/web/src/features/billing/pages/PricingPage.tsx
/**
 * PricingPage - Public pricing page with plan selection.
 */

import { usePlans, useSubscription, type BillingClientConfig } from '@abe-stack/api';
import { tokenStore } from '@abe-stack/shared';
import { PageContainer, PricingTable, useNavigate } from '@abe-stack/ui';
import { useClientEnvironment } from '@app/ClientEnvironment';

import type { PlanId } from '@abe-stack/shared';
import type { ReactElement } from 'react';

// ============================================================================
// Component
// ============================================================================

export const PricingPage = (): ReactElement => {
  const navigate = useNavigate();
  const { config } = useClientEnvironment();

  const clientConfig: BillingClientConfig = {
    baseUrl: config.apiUrl,
    getToken: (): string | null => (tokenStore as { get: () => string | null }).get(),
  };

  const plansResult = usePlans(clientConfig);
  const { plans, isLoading: plansLoading, error: plansError } = plansResult;

  const subscriptionResult = useSubscription(clientConfig);
  const { subscription, createCheckout, isActing } = subscriptionResult;

  const handleSelectPlan = async (plan: { id: PlanId }): Promise<void> => {
    // If user is already subscribed to this plan, go to billing settings
    if (subscription?.planId === plan.id) {
      navigate('/settings/billing');
      return;
    }

    try {
      const checkoutUrl = await createCheckout({ planId: plan.id });
      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    } catch {
      // Error is handled by the hook, shown via error state
    }
  };

  const getActionLabel = (_plan: { id: PlanId }, isCurrent: boolean): string => {
    if (isCurrent) return 'Current Plan';
    if (subscription === null) return 'Get Started';
    return 'Switch to This Plan';
  };

  const getBadge = (plan: { name: string }): string | undefined => {
    // Example: Mark "Pro" plan as most popular
    if (plan.name.toLowerCase().includes('pro')) {
      return 'Most Popular';
    }
    return undefined;
  };

  return (
    <PageContainer className="pricing-page">
      <div className="pricing-page__header">
        <h1 className="pricing-page__title">Simple, Transparent Pricing</h1>
        <p className="pricing-page__subtitle">
          Choose the plan that works best for you. All plans include a free trial.
        </p>
      </div>

      <PricingTable
        plans={plans}
        currentPlanId={subscription?.planId ?? null}
        loadingPlanId={isActing ? 'loading' : null}
        onSelectPlan={(plan) => {
          void handleSelectPlan(plan);
        }}
        getActionLabel={getActionLabel}
        getBadge={getBadge}
        isLoading={plansLoading}
        error={plansError?.message ?? null}
        showIntervalToggle
        defaultInterval="month"
      />
    </PageContainer>
  );
};
