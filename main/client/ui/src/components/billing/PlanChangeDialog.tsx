// main/client/ui/src/components/billing/PlanChangeDialog.tsx
import { calculateProration, formatPrice, formatPriceWithInterval } from '@bslt/shared';
import { forwardRef, useMemo, type ComponentPropsWithoutRef, type ReactElement } from 'react';

import { Button } from '../../elements/Button';
import { cn } from '../../utils/cn';

import type { Plan } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

export interface PlanChangeDialogProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** The user's current plan */
  currentPlan: Plan;
  /** The plan the user wants to switch to */
  newPlan: Plan;
  /** Number of days remaining in the current billing period */
  remainingDays: number;
  /** Total number of days in the current billing period */
  totalDays: number;
  /** End date of the current billing period (ISO string) */
  periodEndDate: string;
  /** Whether the plan change is currently being processed */
  isProcessing?: boolean;
  /** Callback when the user confirms the plan change */
  onConfirm: () => void;
  /** Callback when the user cancels */
  onCancel: () => void;
  /** Custom date formatter */
  formatDate?: (dateString: string) => string;
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

/**
 * Determine whether the change is an upgrade or downgrade
 * based on plan price.
 */
function getChangeDirection(currentPlan: Plan, newPlan: Plan): 'upgrade' | 'downgrade' | 'same' {
  if (newPlan.priceInCents > currentPlan.priceInCents) return 'upgrade';
  if (newPlan.priceInCents < currentPlan.priceInCents) return 'downgrade';
  return 'same';
}

// ============================================================================
// Component
// ============================================================================

/**
 * PlanChangeDialog displays a confirmation dialog for plan upgrades
 * and downgrades with proration preview.
 *
 * - Upgrades take effect immediately with a prorated charge.
 * - Downgrades take effect at the end of the current billing period.
 *
 * This component renders the dialog body content. It is intended to be
 * placed inside a `<Dialog.Content>` wrapper from the parent page.
 *
 * @example
 * ```tsx
 * <Dialog.Root open={dialogOpen} onChange={setDialogOpen}>
 *   <Dialog.Content title="Change Plan">
 *     <PlanChangeDialog
 *       currentPlan={currentPlan}
 *       newPlan={selectedPlan}
 *       remainingDays={15}
 *       totalDays={30}
 *       periodEndDate="2026-03-15T00:00:00Z"
 *       isProcessing={isActing}
 *       onConfirm={handleConfirm}
 *       onCancel={() => setDialogOpen(false)}
 *     />
 *   </Dialog.Content>
 * </Dialog.Root>
 * ```
 */
export const PlanChangeDialog = forwardRef<HTMLDivElement, PlanChangeDialogProps>(
  (
    {
      currentPlan,
      newPlan,
      remainingDays,
      totalDays,
      periodEndDate,
      isProcessing = false,
      onConfirm,
      onCancel,
      formatDate = defaultFormatDate,
      className,
      ...rest
    },
    ref,
  ): ReactElement => {
    const direction = getChangeDirection(currentPlan, newPlan);
    const isUpgrade = direction === 'upgrade';

    const prorationAmount = useMemo(
      () =>
        calculateProration(
          currentPlan.priceInCents,
          newPlan.priceInCents,
          remainingDays,
          totalDays,
        ),
      [currentPlan.priceInCents, newPlan.priceInCents, remainingDays, totalDays],
    );

    const formattedPeriodEnd = useMemo(
      () => formatDate(periodEndDate),
      [formatDate, periodEndDate],
    );

    return (
      <div ref={ref} className={cn('plan-change-dialog', className)} {...rest}>
        {/* Plan Comparison */}
        <div className="plan-change-dialog__comparison flex items-center gap-4">
          <div className="plan-change-dialog__plan plan-change-dialog__plan--current flex-1 rounded-lg border border-gray-200 p-4">
            <span className="plan-change-dialog__plan-label text-xs font-medium uppercase tracking-wide text-gray-500">
              Current Plan
            </span>
            <h4 className="plan-change-dialog__plan-name mt-1 text-lg font-semibold">
              {currentPlan.name}
            </h4>
            <p className="plan-change-dialog__plan-price mt-1 text-sm text-gray-600">
              {formatPriceWithInterval(
                currentPlan.priceInCents,
                currentPlan.currency,
                currentPlan.interval,
              )}
            </p>
          </div>

          <div className="plan-change-dialog__arrow text-xl text-gray-400">{'\u2192'}</div>

          <div
            className={cn(
              'plan-change-dialog__plan plan-change-dialog__plan--new flex-1 rounded-lg border p-4',
              isUpgrade ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50',
            )}
          >
            <span
              className={cn(
                'plan-change-dialog__plan-label text-xs font-medium uppercase tracking-wide',
                isUpgrade ? 'text-green-600' : 'text-yellow-600',
              )}
            >
              {isUpgrade ? 'Upgrade' : 'Downgrade'}
            </span>
            <h4 className="plan-change-dialog__plan-name mt-1 text-lg font-semibold">
              {newPlan.name}
            </h4>
            <p className="plan-change-dialog__plan-price mt-1 text-sm text-gray-600">
              {formatPriceWithInterval(newPlan.priceInCents, newPlan.currency, newPlan.interval)}
            </p>
          </div>
        </div>

        {/* Proration Preview */}
        <div className="plan-change-dialog__proration mt-6 rounded-lg bg-gray-50 p-4">
          {isUpgrade ? (
            <>
              <p className="plan-change-dialog__proration-text text-sm text-gray-700">
                Change takes effect immediately. You&apos;ll be charged a prorated amount of{' '}
                <strong className="font-semibold">
                  {formatPrice(Math.abs(prorationAmount), newPlan.currency)}
                </strong>{' '}
                for the remainder of this billing period.
              </p>
              <p className="plan-change-dialog__proration-detail mt-2 text-xs text-gray-500">
                {remainingDays} day{remainingDays !== 1 ? 's' : ''} remaining in current period
                (ends {formattedPeriodEnd})
              </p>
            </>
          ) : (
            <>
              <p className="plan-change-dialog__proration-text text-sm text-gray-700">
                Change takes effect at the end of your billing period on{' '}
                <strong className="font-semibold">{formattedPeriodEnd}</strong>. You&apos;ll
                continue to have access to your current plan features until then.
              </p>
              {prorationAmount < 0 && (
                <p className="plan-change-dialog__proration-detail mt-2 text-xs text-gray-500">
                  A credit of{' '}
                  <strong>{formatPrice(Math.abs(prorationAmount), newPlan.currency)}</strong> will
                  be applied to your next invoice.
                </p>
              )}
            </>
          )}
        </div>

        {/* Price Change Summary */}
        <div className="plan-change-dialog__summary mt-4 flex items-center justify-between rounded-lg border border-gray-200 p-3">
          <span className="text-sm text-gray-600">New recurring price</span>
          <span className="text-sm font-semibold">
            {formatPriceWithInterval(newPlan.priceInCents, newPlan.currency, newPlan.interval)}
          </span>
        </div>

        {/* Actions */}
        <div className="plan-change-dialog__actions dialog-actions mt-6 flex justify-end gap-3">
          <Button variant="text" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            className={cn(
              'plan-change-dialog__confirm',
              isUpgrade
                ? 'plan-change-dialog__confirm--upgrade'
                : 'plan-change-dialog__confirm--downgrade',
            )}
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : isUpgrade ? 'Confirm Upgrade' : 'Confirm Downgrade'}
          </Button>
        </div>
      </div>
    );
  },
);

PlanChangeDialog.displayName = 'PlanChangeDialog';
