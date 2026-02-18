// main/client/ui/src/components/billing/SubscriptionStatus.tsx
import {
  formatPlanInterval,
  formatPrice,
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
} from '@bslt/shared';
import { forwardRef, type ComponentPropsWithoutRef, type ReactElement } from 'react';

import { Button } from '../../elements/Button';
import { cn } from '../../utils/cn';

import type { Subscription } from '@bslt/shared';

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
      formatPrice: formatPriceProp = formatPrice,
      className,
      ...rest
    },
    ref,
  ): ReactElement => {
    // No subscription state
    if (subscription == null) {
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
    const statusVariant = getSubscriptionStatusVariant(status);
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
              {getSubscriptionStatusLabel(status)}
            </span>
          </div>
          <div className="subscription-status__price">
            {formatPriceProp(plan.priceInCents, plan.currency)}
            <span className="subscription-status__interval">
              /{formatPlanInterval(plan.interval)}
            </span>
          </div>
        </div>

        <div className="subscription-status__details">
          {isTrialing && trialEnd != null && trialEnd !== '' && (
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
          {canChangePlan && onChangePlan != null && (
            <Button
              className="subscription-status__action subscription-status__action--secondary"
              onClick={onChangePlan}
              disabled={isActing}
            >
              Change Plan
            </Button>
          )}

          {onManagePaymentMethods != null && (
            <Button
              className="subscription-status__action subscription-status__action--secondary"
              onClick={onManagePaymentMethods}
              disabled={isActing}
            >
              Payment Methods
            </Button>
          )}

          {canResume && onResume != null && (
            <Button
              className="subscription-status__action subscription-status__action--primary"
              onClick={onResume}
              disabled={isActing}
            >
              {isActing ? 'Resuming...' : 'Resume Subscription'}
            </Button>
          )}

          {canCancel && onCancel != null && (
            <Button
              className="subscription-status__action subscription-status__action--danger"
              onClick={onCancel}
              disabled={isActing}
            >
              {isActing ? 'Canceling...' : 'Cancel Subscription'}
            </Button>
          )}
        </div>
      </div>
    );
  },
);

SubscriptionStatus.displayName = 'SubscriptionStatus';
