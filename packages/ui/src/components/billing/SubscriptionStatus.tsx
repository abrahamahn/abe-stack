// packages/ui/src/components/billing/SubscriptionStatus.tsx
/**
 * SubscriptionStatus Component
 *
 * Displays the current subscription status with actions.
 */

import { forwardRef, type ComponentPropsWithoutRef, type ReactElement } from 'react';

import { cn } from '../../utils/cn';

import type { Subscription, SubscriptionStatus as SubscriptionStatusType } from '@abe-stack/core';

// ============================================================================
// Types
// ============================================================================

export interface SubscriptionStatusProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** The subscription to display (null if not subscribed) */
  subscription: Subscription | null;
  /** Whether an action is in progress */
  isActing?: boolean;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Callback when resume is clicked */
  onResume?: () => void;
  /** Callback when change plan is clicked */
  onChangePlan?: () => void;
  /** Callback when manage payment methods is clicked */
  onManagePaymentMethods?: () => void;
  /** Custom date formatter */
  formatDate?: (dateString: string) => string;
  /** Custom price formatter */
  formatPrice?: (priceInCents: number, currency: string) => string;
}

// ============================================================================
// Helpers
// ============================================================================

function defaultFormatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function defaultFormatPrice(priceInCents: number, currency: string): string {
  const price = priceInCents / 100;
  const currencySymbol = currency.toUpperCase() === 'USD' ? '$' : currency.toUpperCase();
  return `${currencySymbol}${price.toFixed(2)}`;
}

function getStatusLabel(status: SubscriptionStatusType): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'trialing':
      return 'Trial';
    case 'past_due':
      return 'Past Due';
    case 'canceled':
      return 'Canceled';
    case 'incomplete':
      return 'Incomplete';
    case 'incomplete_expired':
      return 'Expired';
    case 'paused':
      return 'Paused';
    case 'unpaid':
      return 'Unpaid';
    default:
      return status;
  }
}

function getStatusVariant(
  status: SubscriptionStatusType,
): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'active':
      return 'success';
    case 'trialing':
      return 'success';
    case 'past_due':
      return 'warning';
    case 'unpaid':
      return 'warning';
    case 'canceled':
      return 'neutral';
    case 'incomplete':
      return 'warning';
    case 'incomplete_expired':
      return 'error';
    case 'paused':
      return 'neutral';
    default:
      return 'neutral';
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * SubscriptionStatus displays the current subscription details.
 *
 * @example
 * ```tsx
 * <SubscriptionStatus
 *   subscription={subscription}
 *   onCancel={handleCancel}
 *   onResume={handleResume}
 *   onChangePlan={handleChangePlan}
 * />
 * ```
 */
export const SubscriptionStatus = forwardRef<HTMLDivElement, SubscriptionStatusProps>(
  (
    {
      subscription,
      isActing = false,
      onCancel,
      onResume,
      onChangePlan,
      onManagePaymentMethods,
      formatDate = defaultFormatDate,
      formatPrice = defaultFormatPrice,
      className,
      ...rest
    },
    ref,
  ): ReactElement => {
    // No subscription state
    if (!subscription) {
      return (
        <div
          ref={ref}
          className={cn('subscription-status', 'subscription-status--none', className)}
          {...rest}
        >
          <div className="subscription-status__header">
            <h3 className="subscription-status__title">No Active Subscription</h3>
            <p className="subscription-status__subtitle">
              Subscribe to a plan to access premium features.
            </p>
          </div>
        </div>
      );
    }

    const { plan, status, currentPeriodEnd, cancelAtPeriodEnd, trialEnd } = subscription;
    const statusVariant = getStatusVariant(status);
    const isTrialing = status === 'trialing';
    const isCanceling = cancelAtPeriodEnd && status !== 'canceled';
    const isCanceled = status === 'canceled';
    const canCancel = !isCanceled && !isCanceling && (status === 'active' || status === 'trialing');
    const canResume = isCanceling;
    const canChangePlan = status === 'active' || status === 'trialing';

    return (
      <div
        ref={ref}
        className={cn('subscription-status', `subscription-status--${status}`, className)}
        {...rest}
      >
        <div className="subscription-status__header">
          <div className="subscription-status__plan">
            <h3 className="subscription-status__plan-name">{plan.name}</h3>
            <span
              className={cn(
                'subscription-status__badge',
                `subscription-status__badge--${statusVariant}`,
              )}
            >
              {getStatusLabel(status)}
            </span>
          </div>
          <div className="subscription-status__price">
            {formatPrice(plan.priceInCents, plan.currency)}
            <span className="subscription-status__interval">
              /{plan.interval === 'month' ? 'mo' : 'yr'}
            </span>
          </div>
        </div>

        <div className="subscription-status__details">
          {isTrialing && trialEnd && (
            <div className="subscription-status__detail">
              <span className="subscription-status__detail-label">Trial ends</span>
              <span className="subscription-status__detail-value">{formatDate(trialEnd)}</span>
            </div>
          )}

          {!isCanceled && (
            <div className="subscription-status__detail">
              <span className="subscription-status__detail-label">
                {isCanceling ? 'Access until' : 'Renews on'}
              </span>
              <span className="subscription-status__detail-value">
                {formatDate(currentPeriodEnd)}
              </span>
            </div>
          )}

          {isCanceling && (
            <div className="subscription-status__warning">
              Your subscription will cancel at the end of the current billing period.
            </div>
          )}

          {status === 'past_due' && (
            <div className="subscription-status__warning">
              Your payment is past due. Please update your payment method to avoid service
              interruption.
            </div>
          )}
        </div>

        <div className="subscription-status__actions">
          {canChangePlan && onChangePlan && (
            <button
              type="button"
              className="subscription-status__action subscription-status__action--secondary"
              onClick={onChangePlan}
              disabled={isActing}
            >
              Change Plan
            </button>
          )}

          {onManagePaymentMethods && (
            <button
              type="button"
              className="subscription-status__action subscription-status__action--secondary"
              onClick={onManagePaymentMethods}
              disabled={isActing}
            >
              Payment Methods
            </button>
          )}

          {canResume && onResume && (
            <button
              type="button"
              className="subscription-status__action subscription-status__action--primary"
              onClick={onResume}
              disabled={isActing}
            >
              {isActing ? 'Resuming...' : 'Resume Subscription'}
            </button>
          )}

          {canCancel && onCancel && (
            <button
              type="button"
              className="subscription-status__action subscription-status__action--danger"
              onClick={onCancel}
              disabled={isActing}
            >
              {isActing ? 'Canceling...' : 'Cancel Subscription'}
            </button>
          )}
        </div>
      </div>
    );
  },
);

SubscriptionStatus.displayName = 'SubscriptionStatus';
