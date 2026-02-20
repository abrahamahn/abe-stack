// main/apps/web/src/features/billing/pages/BillingSettingsPage.tsx
/**
 * BillingSettingsPage - User billing portal.
 *
 * Features:
 * - Subscription status and management
 * - Usage summary against plan limits
 * - Plan change with proration preview
 * - Payment methods (add/remove/set default)
 * - Invoice history
 */

import { getAccessToken } from '@app/authToken';
import { useClientEnvironment } from '@app/ClientEnvironment';
import {
  useInvoices,
  usePaymentMethods,
  usePlans,
  useProrationPreview,
  useSubscription,
} from '@bslt/react';
import { useNavigate } from '@bslt/react/router';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Heading,
  InvoiceList,
  PageContainer,
  PaymentMethodCard,
  PlanChangeDialog,
  Skeleton,
  SubscriptionStatus,
  Text,
  UsageSummary,
} from '@bslt/ui';
import { useCallback, useMemo, useState } from 'react';

import type { BillingClientConfig } from '@bslt/api';
import type {
  PaymentMethod,
  Plan,
  SubscriptionStatus as SubscriptionStatusType,
} from '@bslt/shared';
import type { UsageMetric } from '@bslt/ui';
import type { ReactElement } from 'react';

// ============================================================================
// Component
// ============================================================================

export const BillingSettingsPage = (): ReactElement => {
  const navigate = useNavigate();
  const { config } = useClientEnvironment();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteMethodId, setDeleteMethodId] = useState<string | null>(null);
  const [planChangeTarget, setPlanChangeTarget] = useState<Plan | null>(null);

  const clientConfig: BillingClientConfig = useMemo(
    () => ({
      baseUrl: config.apiUrl,
      getToken: getAccessToken,
    }),
    [config.apiUrl],
  );

  // Hooks
  const subscriptionResult = useSubscription(clientConfig);
  const subscription = subscriptionResult.subscription;
  const {
    isLoading: subLoading,
    isActing: subActing,
    cancel: cancelSubscription,
    resume: resumeSubscription,
    changePlan,
  } = subscriptionResult;

  const { plans } = usePlans(clientConfig);

  const {
    paymentMethods,
    isLoading: pmLoading,
    isActing: pmActing,
    getSetupIntent,
    removePaymentMethod,
    setDefault,
  } = usePaymentMethods(clientConfig);

  const { invoices, hasMore, isLoading: invLoading, error: invError } = useInvoices(clientConfig);

  const prorationPreview = useProrationPreview(subscription, planChangeTarget);

  // Build usage metrics for the current plan.
  // In a real application, the `current` values would come from a usage API
  // or app state. Here we wire up stub values of 0 as placeholders.
  const usageMetrics: UsageMetric[] = useMemo(() => {
    if (subscription === null) return [];

    const metrics: UsageMetric[] = [];
    for (const feature of subscription.plan.features) {
      if (typeof feature.value === 'number' && feature.included) {
        let label = feature.name;
        let unit: string | undefined;

        if (feature.key === 'storage:limit') {
          label = 'Storage';
          unit = 'GB';
        } else if (feature.key === 'projects:limit') {
          label = 'Projects';
          unit = 'projects';
        } else {
          label = 'Max File Size';
          unit = 'MB';
        }

        metrics.push({
          featureKey: feature.key,
          label,
          current: 0, // Populated from usage API in production
          unit,
        });
      }
    }
    return metrics;
  }, [subscription]);

  // Handlers
  const handleChangePlan = useCallback((): void => {
    navigate('/pricing');
  }, [navigate]);

  const handleCancelConfirm = useCallback(async (): Promise<void> => {
    await cancelSubscription(false); // Cancel at period end
    setCancelDialogOpen(false);
  }, [cancelSubscription]);

  const handleResume = useCallback(async (): Promise<void> => {
    await resumeSubscription();
  }, [resumeSubscription]);

  const handlePlanChangeConfirm = useCallback(async (): Promise<void> => {
    if (planChangeTarget === null) return;
    try {
      await changePlan(planChangeTarget.id);
      setPlanChangeTarget(null);
    } catch {
      // Error is handled by the hook
    }
  }, [changePlan, planChangeTarget]);

  const handleAddPaymentMethod = useCallback(async (): Promise<void> => {
    try {
      await getSetupIntent();
    } catch {
      // Error handled by hook
    }
  }, [getSetupIntent]);

  const handleRemovePaymentMethod = useCallback((pm: PaymentMethod): void => {
    setDeleteMethodId(pm.id);
  }, []);

  const handleConfirmRemove = useCallback(async (): Promise<void> => {
    if (deleteMethodId !== null) {
      await removePaymentMethod(deleteMethodId);
      setDeleteMethodId(null);
    }
  }, [deleteMethodId, removePaymentMethod]);

  const handleSetDefault = useCallback(
    async (pm: PaymentMethod): Promise<void> => {
      await setDefault(pm.id);
    },
    [setDefault],
  );

  // Determine if removal should be disabled
  const CANCELED_STATUS: SubscriptionStatusType = 'canceled';
  const hasActiveSubscription = subscription !== null && subscription.status !== CANCELED_STATUS;

  // Build quick-switch plan options (other plans the user can switch to)
  const otherPlans = useMemo(() => {
    if (subscription === null) return [];
    return plans.filter(
      (p) => p.id !== subscription.planId && p.interval === subscription.plan.interval,
    );
  }, [plans, subscription]);

  return (
    <PageContainer className="billing-settings-page">
      <Heading as="h1" size="xl" className="billing-settings-page__title">
        Billing Settings
      </Heading>

      {/* Subscription Section */}
      <section className="billing-settings-page__section">
        <Heading as="h2" size="md" className="billing-settings-page__section-title">
          Subscription
        </Heading>
        {subLoading ? (
          <Card>
            <Card.Body>
              <div className="flex flex-col gap-3">
                <Skeleton width="6rem" height="1.5rem" radius="var(--ui-radius-full)" />
                <Skeleton width="100%" height="1rem" />
                <Skeleton width="75%" height="1rem" />
                <Skeleton width="8rem" height="2.25rem" radius="var(--ui-radius-md)" />
              </div>
            </Card.Body>
          </Card>
        ) : (
          <SubscriptionStatus
            subscription={subscription}
            isActing={subActing}
            onCancel={() => {
              setCancelDialogOpen(true);
            }}
            onResume={() => {
              void handleResume();
            }}
            onChangePlan={handleChangePlan}
            onManagePaymentMethods={() =>
              document.getElementById('payment-methods')?.scrollIntoView({ behavior: 'smooth' })
            }
          />
        )}
      </section>

      {/* Usage Summary Section */}
      {subscription !== null && usageMetrics.length > 0 && (
        <section className="billing-settings-page__section">
          <Heading as="h2" size="md" className="billing-settings-page__section-title">
            Usage
          </Heading>
          <Card>
            <Card.Body>
              <UsageSummary plan={subscription.plan} usage={usageMetrics} title="Current Usage" />
            </Card.Body>
          </Card>
        </section>
      )}

      {/* Quick Plan Switch Section */}
      {hasActiveSubscription && otherPlans.length > 0 && (
        <section className="billing-settings-page__section">
          <Heading as="h2" size="md" className="billing-settings-page__section-title">
            Switch Plan
          </Heading>
          <div className="flex flex-wrap gap-3">
            {otherPlans.map((plan) => {
              const isUpgrade = plan.priceInCents > subscription.plan.priceInCents;
              return (
                <Button
                  key={plan.id}
                  className="billing-settings-page__plan-switch-button"
                  onClick={() => {
                    setPlanChangeTarget(plan);
                  }}
                  disabled={subActing}
                >
                  {isUpgrade ? 'Upgrade' : 'Downgrade'} to {plan.name}
                </Button>
              );
            })}
          </div>
        </section>
      )}

      {/* Payment Methods Section */}
      <section id="payment-methods" className="billing-settings-page__section">
        <div className="billing-settings-page__section-header">
          <Heading as="h2" size="md" className="billing-settings-page__section-title">
            Payment Methods
          </Heading>
          <Button
            onClick={() => {
              void handleAddPaymentMethod();
            }}
            disabled={pmActing}
          >
            Add Payment Method
          </Button>
        </div>

        {pmLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton width="100%" height="4.5rem" radius="var(--ui-radius-md)" />
            <Skeleton width="100%" height="4.5rem" radius="var(--ui-radius-md)" />
          </div>
        ) : (
          <div className="billing-settings-page__content flex flex-col gap-4">
            {paymentMethods.length > 0 && (
              <div className="billing-settings-page__payment-methods flex flex-col gap-3">
                {paymentMethods.map((pm: PaymentMethod) => (
                  <PaymentMethodCard
                    key={pm.id}
                    paymentMethod={pm}
                    isActing={pmActing}
                    onRemove={handleRemovePaymentMethod}
                    onSetDefault={(pm: PaymentMethod) => {
                      void handleSetDefault(pm);
                    }}
                    removeDisabled={pm.isDefault && hasActiveSubscription}
                  />
                ))}
              </div>
            )}

            {paymentMethods.length === 0 && (
              <EmptyState
                title="No payment methods"
                description="Add a card to manage your subscription"
                action={{
                  label: 'Add Payment Method',
                  onClick: () => {
                    void handleAddPaymentMethod();
                  },
                }}
              />
            )}
          </div>
        )}
      </section>

      {/* Invoices Section */}
      <section className="billing-settings-page__section">
        <Heading as="h2" size="md" className="billing-settings-page__section-title">
          Invoice History
        </Heading>
        <InvoiceList
          invoices={invoices}
          isLoading={invLoading}
          error={invError?.message ?? null}
          hasMore={hasMore}
        />
      </section>

      {/* Cancel Subscription Dialog */}
      <Dialog.Root open={cancelDialogOpen} onChange={setCancelDialogOpen}>
        <Dialog.Content title="Cancel Subscription">
          <Text>
            Are you sure you want to cancel your subscription? You&apos;ll continue to have access
            until the end of your current billing period.
          </Text>
          <div className="dialog-actions">
            <Button
              variant="text"
              onClick={() => {
                setCancelDialogOpen(false);
              }}
            >
              Keep Subscription
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void handleCancelConfirm();
              }}
              disabled={subActing}
            >
              {subActing ? 'Canceling...' : 'Cancel Subscription'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

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
              isProcessing={subActing}
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

      {/* Remove Payment Method Dialog */}
      <Dialog.Root
        open={deleteMethodId !== null}
        onChange={(open) => {
          if (!open) setDeleteMethodId(null);
        }}
      >
        <Dialog.Content title="Remove Payment Method">
          <Text>Are you sure you want to remove this payment method?</Text>
          <div className="dialog-actions">
            <Button
              variant="text"
              onClick={() => {
                setDeleteMethodId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void handleConfirmRemove();
              }}
              disabled={pmActing}
            >
              {pmActing ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </PageContainer>
  );
};
