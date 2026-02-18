// main/apps/web/src/features/admin/pages/AuditEventsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuditEventsPage } from './AuditEventsPage';

vi.mock('@bslt/ui', () => ({
  Badge: ({ children, tone }: { children: React.ReactNode; tone?: string }) => (
    <span data-tone={tone}>{children}</span>
  ),
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  Heading: ({ children, as }: { children: React.ReactNode; as?: string }) => {
    if (as === 'h1') return <h1>{children}</h1>;
    return <h2>{children}</h2>;
  },
  Input: ({
    onChange,
    ...props
  }: {
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
    value?: string;
  }) => <input {...props} onChange={(e) => onChange?.(e)} />,
  PageContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Select: ({
    children,
    onChange,
    value,
  }: {
    children: React.ReactNode;
    onChange?: (value: string) => void;
    value?: string;
  }) => (
    <select value={value} onChange={(e) => onChange?.(e.target.value)}>
      {children}
    </select>
  ),
  Skeleton: (props: { width?: string | number; height?: string | number }) => (
    <div data-testid="skeleton" style={{ width: props.width, height: props.height }} />
  ),
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  Text: ({
    children,
  }: {
    children: React.ReactNode;
    tone?: string;
    size?: string;
    as?: string;
    className?: string;
  }) => <span>{children}</span>,
}));

const mockUseAuditEvents = vi.fn();
vi.mock('../hooks/useAuditEvents', () => ({
  useAuditEvents: () => mockUseAuditEvents(),
}));

const mockEvents = [
  {
    id: '1',
    tenantId: null,
    actorId: 'user-123',
    action: 'user.login',
    category: 'security',
    severity: 'info',
    resource: 'auth',
    resourceId: null,
    metadata: {},
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: '2026-02-11T10:00:00Z',
  },
  {
    id: '2',
    tenantId: 'tenant-1',
    actorId: 'user-456',
    action: 'admin.lock_user',
    category: 'admin',
    severity: 'warn',
    resource: 'user',
    resourceId: 'user-789',
    metadata: { reason: 'TOS violation' },
    ipAddress: '10.0.0.1',
    userAgent: null,
    createdAt: '2026-02-11T09:00:00Z',
  },
];

describe('AuditEventsPage', () => {
  it('should show skeleton placeholders while data is loading', () => {
    mockUseAuditEvents.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    render(<AuditEventsPage />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('should show error message on failure', () => {
    mockUseAuditEvents.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network failure'),
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    render(<AuditEventsPage />);
    expect(screen.getByText(/Network failure/)).toBeInTheDocument();
  });

  it('should render audit events in a table', () => {
    mockUseAuditEvents.mockReturnValue({
      data: { events: mockEvents },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    render(<AuditEventsPage />);
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    expect(screen.getByText('2 events')).toBeInTheDocument();
    expect(screen.getByText('user.login')).toBeInTheDocument();
    expect(screen.getByText('admin.lock_user')).toBeInTheDocument();
    expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
  });

  it('should show empty state when no events', () => {
    mockUseAuditEvents.mockReturnValue({
      data: { events: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    render(<AuditEventsPage />);
    expect(screen.getByText('0 events')).toBeInTheDocument();
    expect(screen.getByText('No audit events found')).toBeInTheDocument();
  });
});
