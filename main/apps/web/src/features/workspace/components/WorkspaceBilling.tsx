// main/apps/web/src/features/workspace/components/WorkspaceBilling.tsx
/**
 * Workspace Billing
 *
 * Component for displaying workspace billing information and managing subscriptions.
 * Shows current plan, billing period, invoice history, and provides quick actions
 * including Stripe customer portal redirect for payment method management.
 */

import { useNavigate } from '@bslt/react/router';
import { formatDate } from '@bslt/shared';
import { Alert, Badge, Button, Card, Heading, Skeleton, Text } from '@bslt/ui';
import { InvoiceList } from '@bslt/ui/components/billing';

import { useStripePortal } from '../hooks/useStripePortal';
import { useWorkspaceBilling } from '../hooks/useWorkspaceBilling';
import { useWorkspaceInvoices } from '../hooks/useWorkspaceInvoices';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceBillingProps {
  tenantId: string;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(price / 100); // Assuming price is in cents
}

function getTierBadgeTone(tier: string): 'info' | 'success' | 'warning' {
  switch (tier) {
    case 'free':
      return 'info';
    case 'pro':
      return 'warning';
    case 'enterprise':
      return 'success';
    default:
      return 'info';
  }
}

// ============================================================================
// Component
// ============================================================================

export const WorkspaceBilling = ({ tenantId }: WorkspaceBillingProps): ReactElement => {
  const navigate = useNavigate();
  const { plan, subscription, isLoading, error } = useWorkspaceBilling(tenantId);
  const {
    invoices,
    hasMore,
    isLoading: invoicesLoading,
    error: invoicesError,
  } = useWorkspaceInvoices(tenantId);
  const { openPortal, isLoading: portalLoading, error: portalError } = useStripePortal();

  const handleUpgrade = (): void => {
    navigate('/billing/pricing');
  };

  const handleDowngrade = (): void => {
    navigate('/billing/pricing?action=downgrade');
  };

  const handleManagePayment = (): void => {
    openPortal();
  };

  const handleViewInvoices = (): void => {
    navigate('/billing');
  };

  if (isLoading) {
    return (
      <Card>
        <Card.Body>
          <Heading as="h3" size="md" className="mb-4">
            Billing
          </Heading>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error !== null) {
    return (
      <Card>
        <Card.Body>
          <Heading as="h3" size="md" className="mb-4">
            Billing
          </Heading>
          <Text tone="danger">{error.message}</Text>
        </Card.Body>
      </Card>
    );
  }

  const hasActiveSubscription = subscription !== null && subscription.status !== 'canceled';

  return (
    <Card>
      <Card.Body>
        <Heading as="h3" size="md" className="mb-4">
          Billing
        </Heading>

        {plan === null || !hasActiveSubscription ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Text style={{ fontWeight: 'var(--ui-font-weight-medium)' }}>Current Plan:</Text>
                <Badge tone="info">Free</Badge>
              </div>
              <Text tone="muted" size="sm">
                Upgrade to unlock premium features and increased limits.
              </Text>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUpgrade}>Upgrade Plan</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Text style={{ fontWeight: 'var(--ui-font-weight-medium)' }}>Current Plan:</Text>
                <Badge tone={getTierBadgeTone(plan.tier)}>{plan.name}</Badge>
              </div>
              <Text tone="muted" size="sm">
                {formatPrice(plan.price, plan.currency)} / {plan.interval}
              </Text>
            </div>

            <div>
              <Text style={{ fontWeight: 'var(--ui-font-weight-medium)' }} className="mb-1">
                Billing Period:
              </Text>
              <Text tone="muted" size="sm">
                {formatDate(subscription.currentPeriodStart)} -{' '}
                {formatDate(subscription.currentPeriodEnd)}
              </Text>
            </div>

            <div>
              <Text style={{ fontWeight: 'var(--ui-font-weight-medium)' }} className="mb-1">
                Next Renewal:
              </Text>
              <Text tone="muted" size="sm">
                {subscription.cancelAtPeriodEnd
                  ? 'Subscription will cancel at period end'
                  : formatDate(subscription.currentPeriodEnd)}
              </Text>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleUpgrade} variant="secondary">
                Upgrade Plan
              </Button>
              <Button onClick={handleDowngrade} variant="text">
                Downgrade
              </Button>
              <Button
                onClick={handleManagePayment}
                variant="secondary"
                disabled={portalLoading}
                data-testid="manage-payment-button"
              >
                {portalLoading ? 'Redirecting...' : 'Manage Payment Method'}
              </Button>
              <Button onClick={handleViewInvoices} variant="text">
                View Invoices
              </Button>
            </div>

            {portalError !== null && (
              <Alert tone="danger" className="mt-2">
                {portalError.message}
              </Alert>
            )}
          </div>
        )}

        {/* Invoice History */}
        <div className="border-t pt-4 mt-4">
          <Heading as="h4" size="sm" className="mb-3">
            Recent Invoices
          </Heading>
          {invoicesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : invoicesError !== null ? (
            <Text tone="danger" size="sm">
              {invoicesError.message}
            </Text>
          ) : (
            <InvoiceList invoices={invoices} hasMore={hasMore} isLoading={invoicesLoading} />
          )}
        </div>
      </Card.Body>
    </Card>
  );
};
