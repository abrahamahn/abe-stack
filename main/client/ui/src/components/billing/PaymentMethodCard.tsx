// main/client/ui/src/components/billing/PaymentMethodCard.tsx
import { getCardBrandLabel, getPaymentMethodIcon, getPaymentMethodLabel } from '@abe-stack/shared';
import { forwardRef, type ComponentPropsWithoutRef, type ReactElement } from 'react';

import { cn } from '../../utils/cn';

import type { PaymentMethod } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export interface PaymentMethodCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** The payment method to display */
  paymentMethod: PaymentMethod;
  /** Whether an action is in progress */
  isActing?: boolean;
  /** Callback when remove is clicked */
  onRemove?: (paymentMethod: PaymentMethod) => void;
  /** Callback when set default is clicked */
  onSetDefault?: (paymentMethod: PaymentMethod) => void;
  /** Whether removal is disabled (e.g., only payment method with active subscription) */
  removeDisabled?: boolean;
  /** Custom expiry formatter */
  formatExpiry?: (month: number, year: number) => string;
}

// ============================================================================
// Helpers
// ============================================================================

function defaultFormatExpiry(month: number, year: number): string {
  return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * PaymentMethodCard displays a single payment method.
 *
 * @example
 * ```tsx
 * <PaymentMethodCard
 *   paymentMethod={paymentMethod}
 *   onRemove={handleRemove}
 *   onSetDefault={handleSetDefault}
 * />
 * ```
 */
export const PaymentMethodCard = forwardRef<HTMLDivElement, PaymentMethodCardProps>(
  (
    {
      paymentMethod,
      isActing = false,
      onRemove,
      onSetDefault,
      removeDisabled = false,
      formatExpiry = defaultFormatExpiry,
      className,
      ...rest
    },
    ref,
  ): ReactElement => {
    const { type, isDefault, cardDetails } = paymentMethod;
    const isCard = type === 'card' && cardDetails != null;

    const handleRemove = (): void => {
      if (!isActing && !removeDisabled && onRemove != null) {
        onRemove(paymentMethod);
      }
    };

    const handleSetDefault = (): void => {
      if (!isActing && !isDefault && onSetDefault != null) {
        onSetDefault(paymentMethod);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'payment-method-card',
          isDefault && 'payment-method-card--default',
          className,
        )}
        {...rest}
      >
        <div className="payment-method-card__icon">
          {isCard ? getCardBrandLabel(cardDetails.brand) : getPaymentMethodIcon(type)}
        </div>

        <div className="payment-method-card__details">
          {isCard ? (
            <>
              <span className="payment-method-card__brand">{cardDetails.brand}</span>
              <span className="payment-method-card__last4">**** {cardDetails.last4}</span>
              <span className="payment-method-card__expiry">
                Expires {formatExpiry(cardDetails.expMonth, cardDetails.expYear)}
              </span>
            </>
          ) : (
            <span className="payment-method-card__type">{getPaymentMethodLabel(type)}</span>
          )}
        </div>

        {isDefault && <span className="payment-method-card__badge">Default</span>}

        <div className="payment-method-card__actions">
          {!isDefault && onSetDefault != null && (
            <button
              type="button"
              className="payment-method-card__action payment-method-card__action--default"
              onClick={handleSetDefault}
              disabled={isActing}
            >
              Set Default
            </button>
          )}

          {onRemove != null && (
            <button
              type="button"
              className="payment-method-card__action payment-method-card__action--remove"
              onClick={handleRemove}
              disabled={isActing || removeDisabled}
              title={
                removeDisabled
                  ? 'Cannot remove default payment method with active subscription'
                  : 'Remove payment method'
              }
            >
              Remove
            </button>
          )}
        </div>
      </div>
    );
  },
);

PaymentMethodCard.displayName = 'PaymentMethodCard';
