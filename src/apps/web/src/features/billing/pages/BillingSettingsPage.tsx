// src/apps/web/src/features/billing/pages/BillingSettingsPage.tsx
/**
 * BillingSettingsPage - User billing portal.
 *
 * Features:
 * - Subscription status and management
 * - Payment methods (add/remove/set default)
 * - Invoice history
 */

import {
  useInvoices,
  usePaymentMethods,
  useSubscription,
  type BillingClientConfig,
} from '@abe-stack/api';
import { tokenStore } from '@abe-stack/shared';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Heading,
  InvoiceList,
  PageContainer,
  PaymentMethodCard,
  Skeleton,
  SubscriptionStatus,
  Text,
  useNavigate,
} from '@abe-stack/ui';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useCallback, useMemo, useState } from 'react';

import type { PaymentMethod, SubscriptionStatus as SubscriptionStatusType } from '@abe-stack/shared';
import type { ReactElement } from 'react';

// ============================================================================
// Component
// ============================================================================

export const BillingSettingsPage = (): ReactElement => {
  const navigate = useNavigate();
  const { config } = useClientEnvironment();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteMethodId, setDeleteMethodId] = useState<string | null>(null);

  const clientConfig: BillingClientConfig = useMemo(
    () => ({
      baseUrl: config.apiUrl,
      getToken: (): string | null => (tokenStore as { get: () => string | null }).get(),
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
  } = subscriptionResult;

  const {
    paymentMethods,
    isLoading: pmLoading,
    isActing: pmActing,
    getSetupIntent,
    removePaymentMethod,
    setDefault,
  } = usePaymentMethods(clientConfig);

  const { invoices, hasMore, isLoading: invLoading, error: invError } = useInvoices(clientConfig);

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

  const handleAddPaymentMethod = useCallback(async (): Promise<void> => {
    try {
      const clientSecret = await getSetupIntent();
      // In a real app, you would integrate with Stripe Elements here
      // For now, we'll just log the secret (Stripe integration deferred)
      // TODO: Open Stripe Elements modal to collect card details
      alert(
        'Stripe Elements integration coming soon. Client secret: ' +
          clientSecret.slice(0, 20) +
          '...',
      );
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
        ) : paymentMethods.length === 0 ? (
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
        ) : (
          <div className="billing-settings-page__payment-methods">
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
