// packages/ui/src/components/billing/InvoiceRow.tsx
/**
 * InvoiceRow Component
 *
 * Displays a single invoice in a list/table format.
 */

import { forwardRef, type ComponentPropsWithoutRef, type ReactElement } from 'react';

import { cn } from '../../utils/cn';

import type { Invoice, InvoiceStatus } from '@abe-stack/core';

// ============================================================================
// Types
// ============================================================================

export interface InvoiceRowProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** The invoice to display */
  invoice: Invoice;
  /** Custom date formatter */
  formatDate?: (dateString: string) => string;
  /** Custom price formatter */
  formatPrice?: (amountInCents: number, currency: string) => string;
  /** Custom period formatter */
  formatPeriod?: (start: string, end: string) => string;
}

// ============================================================================
// Helpers
// ============================================================================

function defaultFormatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function defaultFormatPrice(amountInCents: number, currency: string): string {
  const amount = amountInCents / 100;
  const currencySymbol = currency.toUpperCase() === 'USD' ? '$' : currency.toUpperCase();
  return `${currencySymbol}${amount.toFixed(2)}`;
}

function defaultFormatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  // If same year, don't repeat it
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, { ...options, year: 'numeric' })}`;
  }

  return `${startDate.toLocaleDateString(undefined, { ...options, year: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { ...options, year: 'numeric' })}`;
}

function getStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'open':
      return 'Open';
    case 'draft':
      return 'Draft';
    case 'void':
      return 'Void';
    case 'uncollectible':
      return 'Uncollectible';
    default:
      return status;
  }
}

function getStatusVariant(status: InvoiceStatus): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'paid':
      return 'success';
    case 'open':
      return 'warning';
    case 'draft':
      return 'neutral';
    case 'void':
      return 'neutral';
    case 'uncollectible':
      return 'error';
    default:
      return 'neutral';
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * InvoiceRow displays a single invoice.
 *
 * @example
 * ```tsx
 * <InvoiceRow invoice={invoice} />
 *
 * // In a list
 * <div className="invoice-list">
 *   {invoices.map(invoice => (
 *     <InvoiceRow key={invoice.id} invoice={invoice} />
 *   ))}
 * </div>
 * ```
 */
export const InvoiceRow = forwardRef<HTMLDivElement, InvoiceRowProps>(
  (
    {
      invoice,
      formatDate = defaultFormatDate,
      formatPrice = defaultFormatPrice,
      formatPeriod = defaultFormatPeriod,
      className,
      ...rest
    },
    ref,
  ): ReactElement => {
    const {
      status,
      amountPaid,
      currency,
      periodStart,
      periodEnd,
      paidAt,
      invoicePdfUrl,
      createdAt,
    } = invoice;
    const statusVariant = getStatusVariant(status);

    return (
      <div ref={ref} className={cn('invoice-row', `invoice-row--${status}`, className)} {...rest}>
        <div className="invoice-row__date">
          <span className="invoice-row__date-label">
            {paidAt ? formatDate(paidAt) : formatDate(createdAt)}
          </span>
        </div>

        <div className="invoice-row__period">
          <span className="invoice-row__period-label">{formatPeriod(periodStart, periodEnd)}</span>
        </div>

        <div className="invoice-row__amount">
          <span className="invoice-row__amount-value">{formatPrice(amountPaid, currency)}</span>
        </div>

        <div className="invoice-row__status">
          <span
            className={cn(
              'invoice-row__status-badge',
              `invoice-row__status-badge--${statusVariant}`,
            )}
          >
            {getStatusLabel(status)}
          </span>
        </div>

        <div className="invoice-row__actions">
          {invoicePdfUrl && (
            <a
              href={invoicePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="invoice-row__download"
              title="Download PDF"
            >
              Download
            </a>
          )}
        </div>
      </div>
    );
  },
);

InvoiceRow.displayName = 'InvoiceRow';

// ============================================================================
// InvoiceList Component
// ============================================================================

export interface InvoiceListProps extends ComponentPropsWithoutRef<'div'> {
  /** List of invoices to display */
  invoices: Invoice[];
  /** Whether loading */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Whether there are more invoices */
  hasMore?: boolean;
  /** Callback to load more */
  onLoadMore?: () => void;
  /** Custom date formatter */
  formatDate?: (dateString: string) => string;
  /** Custom price formatter */
  formatPrice?: (amountInCents: number, currency: string) => string;
  /** Custom period formatter */
  formatPeriod?: (start: string, end: string) => string;
}

/**
 * InvoiceList displays a list of invoices.
 *
 * @example
 * ```tsx
 * <InvoiceList
 *   invoices={invoices}
 *   hasMore={hasMore}
 *   onLoadMore={loadMore}
 * />
 * ```
 */
export const InvoiceList = forwardRef<HTMLDivElement, InvoiceListProps>(
  (
    {
      invoices,
      isLoading = false,
      error,
      hasMore = false,
      onLoadMore,
      formatDate,
      formatPrice,
      formatPeriod,
      className,
      children,
      ...rest
    },
    ref,
  ): ReactElement => {
    if (isLoading && invoices.length === 0) {
      return (
        <div ref={ref} className={cn('invoice-list', 'invoice-list--loading', className)} {...rest}>
          <div className="invoice-list__loading">Loading invoices...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div ref={ref} className={cn('invoice-list', 'invoice-list--error', className)} {...rest}>
          <div className="invoice-list__error">{error}</div>
        </div>
      );
    }

    if (invoices.length === 0) {
      return (
        <div ref={ref} className={cn('invoice-list', 'invoice-list--empty', className)} {...rest}>
          <div className="invoice-list__empty">No invoices yet</div>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('invoice-list', className)} {...rest}>
        <div className="invoice-list__header">
          <span className="invoice-list__header-date">Date</span>
          <span className="invoice-list__header-period">Period</span>
          <span className="invoice-list__header-amount">Amount</span>
          <span className="invoice-list__header-status">Status</span>
          <span className="invoice-list__header-actions" />
        </div>

        <div className="invoice-list__items">
          {invoices.map((invoice) => (
            <InvoiceRow
              key={invoice.id}
              invoice={invoice}
              formatDate={formatDate}
              formatPrice={formatPrice}
              formatPeriod={formatPeriod}
            />
          ))}
        </div>

        {hasMore && onLoadMore && (
          <div className="invoice-list__load-more">
            <button
              type="button"
              className="invoice-list__load-more-button"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}

        {children}
      </div>
    );
  },
);

InvoiceList.displayName = 'InvoiceList';
