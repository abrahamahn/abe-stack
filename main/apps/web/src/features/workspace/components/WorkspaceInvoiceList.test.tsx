// main/apps/web/src/features/workspace/components/WorkspaceInvoiceList.test.tsx
/**
 * Tests for WorkspaceInvoiceList component.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../hooks/useWorkspaceInvoices', () => ({
  useWorkspaceInvoices: vi.fn(),
}));

vi.mock('@bslt/ui/components/billing', () => ({
  InvoiceList: ({ invoices }: { invoices: unknown[] }) => (
    <div data-testid="invoice-list">
      {invoices.length === 0 ? 'No invoices' : `${invoices.length} invoice(s)`}
    </div>
  ),
}));

import { useWorkspaceInvoices } from '../hooks/useWorkspaceInvoices';

import { WorkspaceInvoiceList } from './WorkspaceInvoiceList';

// ============================================================================
// Tests
// ============================================================================

describe('WorkspaceInvoiceList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(useWorkspaceInvoices).mockReturnValue({
      invoices: [],
      hasMore: false,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<WorkspaceInvoiceList tenantId="t-1" />);
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    // Should have skeleton elements
    expect(container.querySelectorAll('[class*="h-10"]').length).toBeGreaterThan(0);
  });

  it('should render error state', () => {
    vi.mocked(useWorkspaceInvoices).mockReturnValue({
      invoices: [],
      hasMore: false,
      isLoading: false,
      isError: true,
      error: new Error('Failed to load invoices'),
      refetch: vi.fn(),
    });

    render(<WorkspaceInvoiceList tenantId="t-1" />);
    expect(screen.getByText('Failed to load invoices')).toBeInTheDocument();
  });

  it('should render invoice list', () => {
    const mockInvoices = [
      { id: 'inv-1', amount: 2900, currency: 'usd', status: 'paid', createdAt: '2024-01-15' },
      { id: 'inv-2', amount: 2900, currency: 'usd', status: 'paid', createdAt: '2024-02-15' },
    ];

    vi.mocked(useWorkspaceInvoices).mockReturnValue({
      invoices: mockInvoices as never[],
      hasMore: false,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<WorkspaceInvoiceList tenantId="t-1" />);
    expect(screen.getByTestId('invoice-list')).toHaveTextContent('2 invoice(s)');
  });

  it('should show description text', () => {
    vi.mocked(useWorkspaceInvoices).mockReturnValue({
      invoices: [],
      hasMore: false,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<WorkspaceInvoiceList tenantId="t-1" />);
    expect(screen.getByText('View and download your past invoices.')).toBeInTheDocument();
  });
});
