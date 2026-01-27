// apps/web/src/features/billing/pages/BillingSettingsPage.tsx
/**
 * BillingSettingsPage - User billing portal.
 *
 * Features:
 * - Subscription status and management
 * - Payment methods (add/remove/set default)
 * - Invoice history
 */

import { tokenStore } from '@abe-stack/core';
import {
  useInvoices,
  usePaymentMethods,
  useSubscription,
  type BillingClientConfig,
} from '@abe-stack/sdk';
import {
  Button,
  Card,
  Dialog,
  InvoiceList,
  PageContainer,
  PaymentMethodCard,
  SubscriptionStatus,
  useNavigate,
} from '@abe-stack/ui';
import { useClientEnvironment } from '@app/ClientEnvironment';
import { useState, useCallback } from 'react';

import type { PaymentMethod } from '@abe-stack/core';
import type { ReactElement } from 'react';

// ============================================================================
// Component
// ============================================================================

export const BillingSettingsPage = (): ReactElement => {
  const navigate = useNavigate();
  const { config } = useClientEnvironment();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteMethodId, setDeleteMethodId] = useState<string | null>(null);

  const clientConfig: BillingClientConfig = {
    baseUrl: config.apiUrl,
    getToken: (): string | null => tokenStore.get(),
  };

  // Hooks
  const {
    subscription,
    isLoading: subLoading,
    isActing: subActing,
    cancel: cancelSubscription,
    resume: resumeSubscription,
  } = useSubscription(clientConfig);

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
    if (deleteMethodId !== null && deleteMethodId !== undefined) {
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
  const hasActiveSubscription = subscription !== null && subscription !== undefined && subscription.status !== 'canceled';

  return (
    <PageContainer className="billing-settings-page">
      <h1 className="billing-settings-page__title">Billing Settings</h1>

      {/* Subscription Section */}
      <section className="billing-settings-page__section">
        <h2 className="billing-settings-page__section-title">Subscription</h2>
        {subLoading ? (
          <Card>
            <Card.Body>Loading subscription...</Card.Body>
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
          <h2 className="billing-settings-page__section-title">Payment Methods</h2>
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
          <Card>
            <Card.Body>Loading payment methods...</Card.Body>
          </Card>
        ) : paymentMethods.length === 0 ? (
          <Card>
            <Card.Body>
              <p>No payment methods saved.</p>
              <Button
                onClick={() => {
                  void handleAddPaymentMethod();
                }}
                className="mt-4"
              >
                Add Your First Card
              </Button>
            </Card.Body>
          </Card>
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
                removeDisabled={pm.isDefault && (hasActiveSubscription === true)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Invoices Section */}
      <section className="billing-settings-page__section">
        <h2 className="billing-settings-page__section-title">Invoice History</h2>
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
          <p>
            Are you sure you want to cancel your subscription? You&apos;ll continue to have access
            until the end of your current billing period.
          </p>
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
          <p>Are you sure you want to remove this payment method?</p>
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
