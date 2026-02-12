// src/apps/web/src/features/workspace/components/WorkspaceBilling.tsx
/**
 * Workspace Billing
 *
 * Component for displaying workspace billing information and managing subscriptions.
 * Shows current plan, billing period, and provides quick actions.
 */

import { formatDate } from '@abe-stack/shared';
import { Badge, Button, Card, Heading, Skeleton, Text, useNavigate } from '@abe-stack/ui';

import { useWorkspaceBilling } from '../hooks/useWorkspaceBilling';

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

  const handleUpgrade = (): void => {
    navigate('/billing/pricing');
  };

  const handleManagePayment = (): void => {
    // In a production app, this would call the Stripe customer portal API
    // For now, navigate to billing settings
    navigate('/billing');
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
                Change Plan
              </Button>
              <Button onClick={handleManagePayment} variant="secondary">
                Manage Payment Method
              </Button>
              <Button onClick={handleViewInvoices} variant="text">
                View Invoices
              </Button>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};
