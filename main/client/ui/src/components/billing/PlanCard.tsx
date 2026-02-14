// main/client/ui/src/components/billing/PlanCard.tsx
import { formatPriceWithInterval } from '@abe-stack/shared';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cn } from '../../utils/cn';


import type { Plan, PlanFeature } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export interface PlanCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** The plan to display */
  plan: Plan;
  /** Whether this is the current user's plan */
  isCurrent?: boolean;
  /** Whether this plan is highlighted/recommended */
  isHighlighted?: boolean;
  /** Whether the action button is loading */
  isLoading?: boolean;
  /** Whether the action button is disabled */
  isDisabled?: boolean;
  /** Label for the action button */
  actionLabel?: string;
  /** Callback when action button is clicked */
  onAction?: (plan: Plan) => void;
  /** Custom badge text (e.g., "Most Popular") */
  badge?: string;
  /** Format the price display */
  formatPrice?: (priceInCents: number, currency: string, interval: string) => string;
  /** Custom feature renderer */
  renderFeature?: (feature: PlanFeature, index: number) => ReactNode;
}

// ============================================================================
// Default Formatters
// ============================================================================

function defaultRenderFeature(feature: PlanFeature, index: number): ReactNode {
  return (
    <li key={index} className="plan-card__feature">
      <span className={cn('plan-card__feature-icon', feature.included ? 'included' : 'excluded')}>
        {feature.included ? '\u2713' : '\u2717'}
      </span>
      <span className="plan-card__feature-name">{feature.name}</span>
      {feature.description != null && feature.description !== '' && (
        <span className="plan-card__feature-description">{feature.description}</span>
      )}
    </li>
  );
}

// ============================================================================
// Component
// ============================================================================

/**
 * PlanCard displays a single pricing plan with its details.
 *
 * @example
 * ```tsx
 * <PlanCard
 *   plan={basicPlan}
 *   onAction={handleSubscribe}
 *   actionLabel="Get Started"
 * />
 *
 * <PlanCard
 *   plan={proPlan}
 *   isCurrent
 *   isHighlighted
 *   badge="Most Popular"
 *   actionLabel="Current Plan"
 *   isDisabled
 * />
 * ```
 */
export const PlanCard = forwardRef<HTMLDivElement, PlanCardProps>(
  (
    {
      plan,
      isCurrent = false,
      isHighlighted = false,
      isLoading = false,
      isDisabled = false,
      actionLabel,
      onAction,
      badge,
      formatPrice = formatPriceWithInterval,
      renderFeature = defaultRenderFeature,
      className,
      ...rest
    },
    ref,
  ): ReactElement => {
    const handleAction = (): void => {
      if (!isLoading && !isDisabled && onAction != null) {
        onAction(plan);
      }
    };

    const buttonLabel = actionLabel ?? (isCurrent ? 'Current Plan' : 'Get Started');
    const buttonDisabled = isDisabled || isCurrent || isLoading;

    return (
      <div
        ref={ref}
        className={cn(
          'plan-card',
          isHighlighted && 'plan-card--highlighted',
          isCurrent && 'plan-card--current',
          className,
        )}
        {...rest}
      >
        {badge != null && badge !== '' && <div className="plan-card__badge">{badge}</div>}

        <div className="plan-card__header">
          <h3 className="plan-card__name">{plan.name}</h3>
          {plan.description != null && plan.description !== '' && (
            <p className="plan-card__description">{plan.description}</p>
          )}
        </div>

        <div className="plan-card__price">
          <span className="plan-card__price-amount">
            {formatPrice(plan.priceInCents, plan.currency, plan.interval)}
          </span>
          {plan.trialDays > 0 && (
            <span className="plan-card__trial">{plan.trialDays} day free trial</span>
          )}
        </div>

        <ul className="plan-card__features">
          {plan.features.map((feature: PlanFeature, index: number) =>
            renderFeature(feature, index),
          )}
        </ul>

        <div className="plan-card__action">
          <button
            type="button"
            className={cn(
              'plan-card__button',
              isHighlighted && 'plan-card__button--primary',
              isCurrent && 'plan-card__button--current',
            )}
            onClick={handleAction}
            disabled={buttonDisabled}
          >
            {isLoading ? 'Loading...' : buttonLabel}
          </button>
        </div>
      </div>
    );
  },
);

PlanCard.displayName = 'PlanCard';
