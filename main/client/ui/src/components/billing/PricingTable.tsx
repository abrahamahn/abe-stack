// main/client/ui/src/components/billing/PricingTable.tsx
import {
  forwardRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cn } from '../../utils/cn';

import { PlanCard } from './PlanCard';

import type { Plan, PlanFeature, PlanInterval } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export interface PricingTableProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** List of plans to display */
  plans: Plan[];
  /** Currently active subscription's plan ID (if any) */
  currentPlanId?: string | null;
  /** ID of the highlighted/recommended plan */
  highlightedPlanId?: string;
  /** Which plan is loading (during checkout) */
  loadingPlanId?: string | null;
  /** Whether to show the interval toggle */
  showIntervalToggle?: boolean;
  /** Default interval to show */
  defaultInterval?: PlanInterval;
  /** Callback when a plan action is triggered */
  onSelectPlan?: (plan: Plan) => void;
  /** Custom action label generator */
  getActionLabel?: (plan: Plan, isCurrent: boolean) => string;
  /** Custom badge generator */
  getBadge?: (plan: Plan) => string | undefined;
  /** Custom price formatter */
  formatPrice?: (priceInCents: number, currency: string, interval: string) => string;
  /** Custom feature renderer */
  renderFeature?: (feature: PlanFeature, index: number) => ReactNode;
  /** Loading state for the whole table */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * PricingTable displays a grid of pricing plans.
 *
 * @example
 * ```tsx
 * <PricingTable
 *   plans={plans}
 *   currentPlanId={subscription?.planId}
 *   highlightedPlanId="pro"
 *   onSelectPlan={handleSubscribe}
 * />
 * ```
 */
export const PricingTable = forwardRef<HTMLDivElement, PricingTableProps>(
  (
    {
      plans,
      currentPlanId,
      highlightedPlanId,
      loadingPlanId,
      showIntervalToggle = true,
      defaultInterval = 'month',
      onSelectPlan,
      getActionLabel,
      getBadge,
      formatPrice,
      renderFeature,
      isLoading,
      error,
      className,
      ...rest
    },
    ref,
  ): ReactElement => {
    const [selectedInterval, setSelectedInterval] = useState<PlanInterval>(defaultInterval);

    // Filter plans by selected interval
    const filteredPlans = plans.filter((plan) => plan.interval === selectedInterval);

    // Check if we have plans for each interval
    const hasMonthlyPlans = plans.some((plan) => plan.interval === 'month');
    const hasYearlyPlans = plans.some((plan) => plan.interval === 'year');
    const showToggle = showIntervalToggle && hasMonthlyPlans && hasYearlyPlans;

    // Calculate yearly savings (if applicable)
    const getYearlySavings = (): number | null => {
      if (!hasMonthlyPlans || !hasYearlyPlans) return null;

      // Find matching plans for comparison
      const monthlyPlan = plans.find((p) => p.interval === 'month');
      const yearlyPlan = plans.find((p) => p.interval === 'year');

      if (monthlyPlan == null || yearlyPlan == null) return null;

      const monthlyAnnual = monthlyPlan.priceInCents * 12;
      const yearlyTotal = yearlyPlan.priceInCents;

      if (yearlyTotal >= monthlyAnnual) return null;

      return Math.round(((monthlyAnnual - yearlyTotal) / monthlyAnnual) * 100);
    };

    const yearlySavings = getYearlySavings();

    if (isLoading === true) {
      return (
        <div
          ref={ref}
          className={cn('pricing-table', 'pricing-table--loading', className)}
          {...rest}
        >
          <div className="pricing-table__loading">Loading plans...</div>
        </div>
      );
    }

    if (error != null && error !== '') {
      return (
        <div ref={ref} className={cn('pricing-table', 'pricing-table--error', className)} {...rest}>
          <div className="pricing-table__error">{error}</div>
        </div>
      );
    }

    if (plans.length === 0) {
      return (
        <div ref={ref} className={cn('pricing-table', 'pricing-table--empty', className)} {...rest}>
          <div className="pricing-table__empty">No plans available</div>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('pricing-table', className)} {...rest}>
        {showToggle && (
          <div className="pricing-table__toggle">
            <button
              type="button"
              className={cn(
                'pricing-table__toggle-button',
                selectedInterval === 'month' && 'pricing-table__toggle-button--active',
              )}
              onClick={() => {
                setSelectedInterval('month');
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              className={cn(
                'pricing-table__toggle-button',
                selectedInterval === 'year' && 'pricing-table__toggle-button--active',
              )}
              onClick={() => {
                setSelectedInterval('year');
              }}
            >
              Yearly
              {yearlySavings !== null && (
                <span className="pricing-table__savings-badge">Save {yearlySavings}%</span>
              )}
            </button>
          </div>
        )}

        <div
          className={cn(
            'pricing-table__grid',
            `pricing-table__grid--${String(filteredPlans.length)}`,
          )}
        >
          {filteredPlans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isHighlighted = highlightedPlanId === plan.id;
            const isLoadingPlan = loadingPlanId === plan.id;
            const hasLoadingPlan = loadingPlanId != null;

            const actionLabel = getActionLabel?.(plan, isCurrent);
            const badge = getBadge?.(plan);

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={isCurrent}
                isHighlighted={isHighlighted}
                isLoading={isLoadingPlan}
                isDisabled={hasLoadingPlan && !isLoadingPlan}
                {...(actionLabel !== undefined && { actionLabel })}
                {...(onSelectPlan !== undefined && { onAction: onSelectPlan })}
                {...(badge !== undefined && { badge })}
                {...(formatPrice !== undefined && { formatPrice })}
                {...(renderFeature !== undefined && { renderFeature })}
              />
            );
          })}
        </div>
      </div>
    );
  },
);

PricingTable.displayName = 'PricingTable';
