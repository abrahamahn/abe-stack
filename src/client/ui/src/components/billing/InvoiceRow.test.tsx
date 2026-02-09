// src/client/ui/src/components/billing/InvoiceRow.test.tsx
/**
 * Tests for InvoiceRow and InvoiceList components.
 *
 * Tests invoice display with various statuses and formatting options.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InvoiceList, InvoiceRow } from './InvoiceRow';

import type { Invoice } from '@abe-stack/shared';

const mockInvoice: Invoice = {
  id: 'inv_123',
  status: 'paid',
  amountDue: 2999,
  amountPaid: 2999,
  currency: 'usd',
  periodStart: '2024-01-01T00:00:00Z',
  periodEnd: '2024-01-31T23:59:59Z',
  paidAt: '2024-01-05T10:30:00Z',
  invoicePdfUrl: 'https://example.com/invoice.pdf',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('InvoiceRow', () => {
  describe('rendering', () => {
    it('should render invoice with paid status', () => {
      render(<InvoiceRow invoice={mockInvoice} />);

      expect(screen.getByText('Paid')).toBeInTheDocument();
      expect(screen.getByText('$29.99')).toBeInTheDocument();
    });

    it('should render invoice date', () => {
      render(<InvoiceRow invoice={mockInvoice} />);

      // Default formatter shows date
      expect(screen.getByText('Jan 5, 2024')).toBeInTheDocument();
    });

    it('should render billing period', () => {
      render(<InvoiceRow invoice={mockInvoice} />);

      // Period should be displayed
      const periodElement = screen.getByText('Jan 1 - Jan 31, 2024');
      expect(periodElement).toBeInTheDocument();
    });

    it('should render download link when PDF URL is present', () => {
      render(<InvoiceRow invoice={mockInvoice} />);

      const downloadLink = screen.getByRole('link', { name: 'Download' });
      expect(downloadLink).toHaveAttribute('href', 'https://example.com/invoice.pdf');
      expect(downloadLink).toHaveAttribute('target', '_blank');
      expect(downloadLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not render download link when PDF URL is null', () => {
      const invoiceWithoutPdf: Invoice = { ...mockInvoice, invoicePdfUrl: null };

      render(<InvoiceRow invoice={invoiceWithoutPdf} />);

      expect(screen.queryByRole('link', { name: 'Download' })).not.toBeInTheDocument();
    });

    it('should not render download link when PDF URL is empty string', () => {
      const invoiceWithEmptyPdf: Invoice = { ...mockInvoice, invoicePdfUrl: '' };

      render(<InvoiceRow invoice={invoiceWithEmptyPdf} />);

      expect(screen.queryByRole('link', { name: 'Download' })).not.toBeInTheDocument();
    });
  });

  describe('status variants', () => {
    it('should render open status', () => {
      const openInvoice: Invoice = { ...mockInvoice, status: 'open' };

      render(<InvoiceRow invoice={openInvoice} />);

      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('should render draft status', () => {
      const draftInvoice: Invoice = { ...mockInvoice, status: 'draft' };

      render(<InvoiceRow invoice={draftInvoice} />);

      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('should render void status', () => {
      const voidInvoice: Invoice = { ...mockInvoice, status: 'void' };

      render(<InvoiceRow invoice={voidInvoice} />);

      expect(screen.getByText('Void')).toBeInTheDocument();
    });

    it('should render uncollectible status', () => {
      const uncollectibleInvoice: Invoice = { ...mockInvoice, status: 'uncollectible' };

      render(<InvoiceRow invoice={uncollectibleInvoice} />);

      expect(screen.getByText('Uncollectible')).toBeInTheDocument();
    });
  });

  describe('custom formatters', () => {
    it('should use custom date formatter', () => {
      const formatDate = vi.fn((date: string) => `Custom: ${date}`);

      render(<InvoiceRow invoice={mockInvoice} formatDate={formatDate} />);

      expect(formatDate).toHaveBeenCalled();
      expect(screen.getByText(/Custom:/)).toBeInTheDocument();
    });

    it('should use custom price formatter', () => {
      const formatPrice = vi.fn(() => '€29,99');

      render(<InvoiceRow invoice={mockInvoice} formatPrice={formatPrice} />);

      expect(formatPrice).toHaveBeenCalledWith(2999, 'usd');
      expect(screen.getByText('€29,99')).toBeInTheDocument();
    });

    it('should use custom period formatter', () => {
      const formatPeriod = vi.fn(() => 'January 2024');

      render(<InvoiceRow invoice={mockInvoice} formatPeriod={formatPeriod} />);

      expect(formatPeriod).toHaveBeenCalled();
      expect(screen.getByText('January 2024')).toBeInTheDocument();
    });
  });

  describe('date handling', () => {
    it('should show paidAt date when present', () => {
      render(<InvoiceRow invoice={mockInvoice} />);

      // Should show Jan 5 (paidAt) not Jan 1 (createdAt)
      expect(screen.getByText(/Jan 5/)).toBeInTheDocument();
    });

    it('should show createdAt date when paidAt is null', () => {
      const unpaidInvoice: Invoice = { ...mockInvoice, paidAt: null };

      render(<InvoiceRow invoice={unpaidInvoice} />);

      // Should fall back to createdAt
      expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    });

    it('should show createdAt date when paidAt is empty string', () => {
      const unpaidInvoice: Invoice = { ...mockInvoice, paidAt: '' };

      render(<InvoiceRow invoice={unpaidInvoice} />);

      expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper structure', () => {
      const { container } = render(<InvoiceRow invoice={mockInvoice} />);

      expect(container.firstChild).toHaveClass('invoice-row');
    });

    it('should forward ref correctly', () => {
      const ref = vi.fn();

      render(<InvoiceRow ref={ref} invoice={mockInvoice} />);

      expect(ref).toHaveBeenCalled();
    });

    it('should accept custom className', () => {
      const { container } = render(<InvoiceRow invoice={mockInvoice} className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('InvoiceList', () => {
  const mockInvoices: Invoice[] = [
    mockInvoice,
    { ...mockInvoice, id: 'inv_124', paidAt: '2024-02-05T10:30:00Z' },
    { ...mockInvoice, id: 'inv_125', paidAt: '2024-03-05T10:30:00Z' },
  ];

  describe('rendering', () => {
    it('should render list of invoices', () => {
      render(<InvoiceList invoices={mockInvoices} />);

      expect(screen.getAllByText('Paid')).toHaveLength(3);
      expect(screen.getAllByText('$29.99')).toHaveLength(3);
    });

    it('should render table header', () => {
      render(<InvoiceList invoices={mockInvoices} />);

      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Period')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render each invoice with unique key', () => {
      const { container } = render(<InvoiceList invoices={mockInvoices} />);

      const invoiceRows = container.querySelectorAll('.invoice-row');
      expect(invoiceRows).toHaveLength(3);
    });
  });

  describe('loading state', () => {
    it('should show loading message when loading with empty invoices', () => {
      render(<InvoiceList invoices={[]} isLoading />);

      expect(screen.getByText('Loading invoices...')).toBeInTheDocument();
    });

    it('should not show loading message when loading with existing invoices', () => {
      render(<InvoiceList invoices={mockInvoices} isLoading />);

      expect(screen.queryByText('Loading invoices...')).not.toBeInTheDocument();
      expect(screen.getAllByText('Paid')).toHaveLength(3);
    });
  });

  describe('error state', () => {
    it('should show error message', () => {
      render(<InvoiceList invoices={[]} error="Failed to load invoices" />);

      expect(screen.getByText('Failed to load invoices')).toBeInTheDocument();
    });

    it('should not show error when error is null', () => {
      render(<InvoiceList invoices={mockInvoices} error={null} />);

      expect(screen.getAllByText('Paid')).toHaveLength(3);
    });

    it('should not show error when error is empty string', () => {
      render(<InvoiceList invoices={mockInvoices} error="" />);

      expect(screen.getAllByText('Paid')).toHaveLength(3);
    });
  });

  describe('empty state', () => {
    it('should show empty message when no invoices', () => {
      render(<InvoiceList invoices={[]} />);

      expect(screen.getByText('No invoices yet')).toBeInTheDocument();
    });

    it('should not show empty message when invoices exist', () => {
      render(<InvoiceList invoices={mockInvoices} />);

      expect(screen.queryByText('No invoices yet')).not.toBeInTheDocument();
    });
  });

  describe('load more', () => {
    it('should show load more button when hasMore is true', () => {
      render(<InvoiceList invoices={mockInvoices} hasMore onLoadMore={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument();
    });

    it('should not show load more button when hasMore is false', () => {
      render(<InvoiceList invoices={mockInvoices} hasMore={false} onLoadMore={vi.fn()} />);

      expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument();
    });

    it('should not show load more button when onLoadMore is undefined', () => {
      render(<InvoiceList invoices={mockInvoices} hasMore />);

      expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument();
    });

    it('should call onLoadMore when clicked', async () => {
      const user = userEvent.setup();
      const onLoadMore = vi.fn();

      render(<InvoiceList invoices={mockInvoices} hasMore onLoadMore={onLoadMore} />);

      await user.click(screen.getByRole('button', { name: 'Load More' }));

      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('should disable load more button when loading', () => {
      render(<InvoiceList invoices={mockInvoices} hasMore onLoadMore={vi.fn()} isLoading />);

      const button = screen.getByRole('button', { name: 'Loading...' });
      expect(button).toBeDisabled();
    });

    it('should show loading text on button when loading', () => {
      render(<InvoiceList invoices={mockInvoices} hasMore onLoadMore={vi.fn()} isLoading />);

      expect(screen.getByRole('button', { name: 'Loading...' })).toBeInTheDocument();
    });
  });

  describe('custom formatters', () => {
    it('should pass custom formatters to invoice rows', () => {
      const formatDate = vi.fn((date: string) => `Custom: ${date}`);
      const formatPrice = vi.fn(() => '€29,99');
      const formatPeriod = vi.fn(() => 'January 2024');

      render(
        <InvoiceList
          invoices={mockInvoices}
          formatDate={formatDate}
          formatPrice={formatPrice}
          formatPeriod={formatPeriod}
        />,
      );

      expect(formatDate).toHaveBeenCalled();
      expect(formatPrice).toHaveBeenCalled();
      expect(formatPeriod).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should forward ref correctly', () => {
      const ref = vi.fn();

      render(<InvoiceList ref={ref} invoices={mockInvoices} />);

      expect(ref).toHaveBeenCalled();
    });

    it('should accept custom className', () => {
      const { container } = render(<InvoiceList invoices={mockInvoices} className="custom-list" />);

      expect(container.firstChild).toHaveClass('custom-list');
    });

    it('should render children', () => {
      render(
        <InvoiceList invoices={mockInvoices}>
          <div>Custom content</div>
        </InvoiceList>,
      );

      expect(screen.getByText('Custom content')).toBeInTheDocument();
    });
  });
});
