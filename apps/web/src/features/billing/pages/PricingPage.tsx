// apps/web/src/features/billing/pages/PricingPage.tsx
/**
 * PricingPage - Public pricing page with plan selection.
 */

import { tokenStore } from '@abe-stack/core';
import { usePlans, useSubscription, type BillingClientConfig } from '@abe-stack/sdk';
import { PageContainer, PricingTable } from '@abe-stack/ui';
import { useNavigate } from '@abe-stack/ui';

import { useClientEnvironment } from '@app/ClientEnvironment';

import type { Plan } from '@abe-stack/core';
import type { ReactElement } from 'react';

// ============================================================================
// Component
// ============================================================================

export function PricingPage(): ReactElement {
  const navigate = useNavigate();
  const { config } = useClientEnvironment();

  const clientConfig: BillingClientConfig = {
    baseUrl: config.apiUrl,
    getToken: (): string | null => tokenStore.get(),
  };

  const { plans, isLoading: plansLoading, error: plansError } = usePlans(clientConfig);
  const { subscription, createCheckout, isActing } = useSubscription(clientConfig);

  const handleSelectPlan = async (plan: Plan): Promise<void> => {
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

  const getActionLabel = (_plan: Plan, isCurrent: boolean): string => {
    if (isCurrent) return 'Current Plan';
    if (!subscription) return 'Get Started';
    return 'Switch to This Plan';
  };

  const getBadge = (plan: Plan): string | undefined => {
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
        currentPlanId={subscription?.planId}
        loadingPlanId={isActing ? 'loading' : null}
        onSelectPlan={(plan) => {
          void handleSelectPlan(plan);
        }}
        getActionLabel={getActionLabel}
        getBadge={getBadge}
        isLoading={plansLoading}
        error={plansError?.message}
        showIntervalToggle
        defaultInterval="month"
      />
    </PageContainer>
  );
}
