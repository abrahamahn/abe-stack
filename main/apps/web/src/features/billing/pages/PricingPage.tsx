// main/apps/web/src/features/billing/pages/PricingPage.tsx
/**
 * PricingPage - Public pricing page with plan selection.
 *
 * When the user has an active subscription, plan cards show contextual labels
 * ("Current Plan", "Upgrade", "Downgrade") and selecting a different plan
 * opens a PlanChangeDialog with proration preview instead of redirecting
 * to Stripe Checkout.
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { usePlans, useProrationPreview, useSubscription } from '@bslt/react';
import { useNavigate } from '@bslt/react/router';
import { Dialog, Heading, PageContainer, PlanChangeDialog, PricingTable, Text } from '@bslt/ui';
import { useCallback, useMemo, useState } from 'react';

import type { BillingClientConfig } from '@bslt/api';
import type { Plan, PlanId } from '@bslt/shared';
import type { ReactElement } from 'react';

// ============================================================================
// Component
// ============================================================================

export const PricingPage = (): ReactElement => {
  const navigate = useNavigate();
  const { config } = useClientEnvironment();

  const [planChangeTarget, setPlanChangeTarget] = useState<Plan | null>(null);

  const clientConfig: BillingClientConfig = useMemo(
    () => ({
      baseUrl: config.apiUrl,
      getToken: getAccessToken,
    }),
    [config.apiUrl],
  );

  const plansResult = usePlans(clientConfig);
  const { plans, isLoading: plansLoading, error: plansError } = plansResult;

  const subscriptionResult = useSubscription(clientConfig);
  const { subscription, createCheckout, changePlan, isActing } = subscriptionResult;

  const prorationPreview = useProrationPreview(subscription, planChangeTarget);

  const handleSelectPlan = useCallback(
    async (plan: { id: PlanId }): Promise<void> => {
      // If user is already subscribed to this plan, go to billing settings
      if (subscription?.planId === plan.id) {
        navigate('/settings/billing');
        return;
      }

      // If user has an active subscription, open the plan change dialog
      // instead of creating a new checkout session
      if (
        subscription !== null &&
        (subscription.status === 'active' || subscription.status === 'trialing')
      ) {
        const fullPlan = plans.find((p) => p.id === plan.id);
        if (fullPlan != null) {
          setPlanChangeTarget(fullPlan);
          return;
        }
      }

      // No subscription -- redirect to Stripe Checkout for new subscription
      try {
        const checkoutUrl = await createCheckout({ planId: plan.id });
        window.location.href = checkoutUrl;
      } catch {
        // Error is handled by the hook, shown via error state
      }
    },
    [subscription, plans, navigate, createCheckout],
  );

  const handlePlanChangeConfirm = useCallback(async (): Promise<void> => {
    if (planChangeTarget === null) return;
    try {
      await changePlan(planChangeTarget.id);
      setPlanChangeTarget(null);
      navigate('/settings/billing');
    } catch {
      // Error is handled by the hook
    }
  }, [changePlan, planChangeTarget, navigate]);

  const getActionLabel = useCallback(
    (_plan: { id: PlanId }, isCurrent: boolean): string => {
      if (isCurrent) return 'Current Plan';
      if (subscription === null) return 'Get Started';

      // Determine upgrade vs downgrade based on price
      const currentPrice = subscription.plan.priceInCents;
      const targetPlan = plans.find((p) => p.id === _plan.id);
      if (targetPlan == null) return 'Switch to This Plan';

      if (targetPlan.priceInCents > currentPrice) return 'Upgrade';
      if (targetPlan.priceInCents < currentPrice) return 'Downgrade';
      return 'Switch to This Plan';
    },
    [subscription, plans],
  );

  const getBadge = (plan: { name: string }): string | undefined => {
    // Mark "Pro" plan as most popular
    if (plan.name.toLowerCase().includes('pro')) {
      return 'Most Popular';
    }
    return undefined;
  };

  return (
    <PageContainer className="pricing-page">
      <div className="pricing-page__header">
        <Heading as="h1" className="pricing-page__title">
          Simple, Transparent Pricing
        </Heading>
        <Text className="pricing-page__subtitle">
          Choose the plan that works best for you. All plans include a free trial.
        </Text>
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

      {/* Plan Change Dialog */}
      <Dialog.Root
        open={planChangeTarget !== null}
        onChange={(open) => {
          if (!open) setPlanChangeTarget(null);
        }}
      >
        <Dialog.Content title="Change Plan">
          {planChangeTarget !== null && subscription !== null && prorationPreview !== null && (
            <PlanChangeDialog
              currentPlan={subscription.plan}
              newPlan={planChangeTarget}
              remainingDays={prorationPreview.remainingDays}
              totalDays={prorationPreview.totalDays}
              periodEndDate={prorationPreview.periodEndDate}
              isProcessing={isActing}
              onConfirm={() => {
                void handlePlanChangeConfirm();
              }}
              onCancel={() => {
                setPlanChangeTarget(null);
              }}
            />
          )}
        </Dialog.Content>
      </Dialog.Root>
    </PageContainer>
  );
};
