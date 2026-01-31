// apps/web/src/features/admin/pages/SecurityEventsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SecurityEventsPage } from './SecurityEventsPage';

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => ({
  Button: ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
  Heading: ({ children, as, size }: { children: React.ReactNode; as?: string; size?: string }) => {
    const Tag = (as ?? 'h1') as keyof JSX.IntrinsicElements;
    return <Tag data-size={size}>{children}</Tag>;
  },
  PageContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-container">{children}</div>
  ),
  Select: ({
    children,
    value,
    onChange,
    className,
  }: {
    children: React.ReactNode;
    value?: string;
    onChange?: (value: string) => void;
    className?: string;
  }) => (
    <select value={value} onChange={(e) => onChange?.(e.target.value)} className={className}>
      {children}
    </select>
  ),
  Text: ({ children, tone, size }: { children: React.ReactNode; tone?: string; size?: string }) => (
    <span data-tone={tone} data-size={size}>
      {children}
    </span>
  ),
}));

// Mock hooks
vi.mock('../hooks', () => ({
  useSecurityEvents: () => ({
    data: undefined,
    isLoading: false,
    filter: {},
    pagination: { page: 1, totalPages: 1 },
    setFilter: vi.fn(),
    setPage: vi.fn(),
    refetch: vi.fn(),
  }),
  useSecurityMetrics: () => ({
    data: undefined,
    isLoading: false,
    period: 'day',
    setPeriod: vi.fn(),
  }),
}));

// Mock components
vi.mock('../components', () => ({
  ExportDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="export-dialog">Export Dialog</div> : null,
  SecurityEventsFilters: () => <div data-testid="security-events-filters">Filters</div>,
  SecurityEventsTable: () => <div data-testid="security-events-table">Events Table</div>,
  SecurityMetricsCard: () => <div data-testid="security-metrics-card">Metrics Card</div>,
}));

describe('SecurityEventsPage', () => {
  it('should render the page container', () => {
    render(<SecurityEventsPage />);
    expect(screen.getByTestId('page-container')).toBeInTheDocument();
  });

  it('should render the heading', () => {
    render(<SecurityEventsPage />);
    expect(screen.getByText('Security Events')).toBeInTheDocument();
  });

  it('should render the metrics card', () => {
    render(<SecurityEventsPage />);
    expect(screen.getByTestId('security-metrics-card')).toBeInTheDocument();
  });

  it('should render the events table', () => {
    render(<SecurityEventsPage />);
    expect(screen.getByTestId('security-events-table')).toBeInTheDocument();
  });

  it('should render the refresh button', () => {
    render(<SecurityEventsPage />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('should render the export button', () => {
    render(<SecurityEventsPage />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });
});
