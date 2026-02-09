// src/apps/web/src/features/admin/pages/SecurityEventsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SecurityEventsPage } from './SecurityEventsPage';

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => {
  const Button = ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }): React.ReactElement => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  );

  const Heading = ({
    children,
    as,
    size,
  }: {
    children: React.ReactNode;
    as?: string;
    size?: string;
  }): React.ReactElement => {
    const tagName = as ?? 'h1';
    if (tagName === 'h1') return <h1 data-size={size}>{children}</h1>;
    if (tagName === 'h2') return <h2 data-size={size}>{children}</h2>;
    if (tagName === 'h3') return <h3 data-size={size}>{children}</h3>;
    if (tagName === 'h4') return <h4 data-size={size}>{children}</h4>;
    if (tagName === 'h5') return <h5 data-size={size}>{children}</h5>;
    if (tagName === 'h6') return <h6 data-size={size}>{children}</h6>;
    return <h1 data-size={size}>{children}</h1>;
  };

  const PageContainer = ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <div data-testid="page-container">{children}</div>
  );

  const Select = ({
    children,
    value,
    onChange,
    className,
  }: {
    children: React.ReactNode;
    value?: string;
    onChange?: (value: string) => void;
    className?: string;
  }): React.ReactElement => (
    <select value={value} onChange={(e) => onChange?.(e.target.value)} className={className}>
      {children}
    </select>
  );

  const Text = ({
    children,
    tone,
    size,
  }: {
    children: React.ReactNode;
    tone?: string;
    size?: string;
  }): React.ReactElement => (
    <span data-tone={tone} data-size={size}>
      {children}
    </span>
  );

  return { Button, Heading, PageContainer, Select, Text };
});

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
vi.mock('../components', () => {
  const ExportDialog = ({ isOpen }: { isOpen: boolean }): React.ReactElement | null =>
    isOpen ? <div data-testid="export-dialog">Export Dialog</div> : null;
  const SecurityEventsFilters = (): React.ReactElement => (
    <div data-testid="security-events-filters">Filters</div>
  );
  const SecurityEventsTable = (): React.ReactElement => (
    <div data-testid="security-events-table">Events Table</div>
  );
  const SecurityMetricsCard = (): React.ReactElement => (
    <div data-testid="security-metrics-card">Metrics Card</div>
  );

  return { ExportDialog, SecurityEventsFilters, SecurityEventsTable, SecurityMetricsCard };
});

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
