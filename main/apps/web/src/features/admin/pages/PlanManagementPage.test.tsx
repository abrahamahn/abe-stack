// main/apps/web/src/features/admin/pages/PlanManagementPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanManagementPage } from './PlanManagementPage';

// Mock @bslt/ui components
vi.mock('@bslt/ui', () => {
  const badge = ({ children, tone }: { children: React.ReactNode; tone?: string }) => (
    <span data-testid="badge" data-tone={tone}>
      {children}
    </span>
  );
  const button = ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
  const cardBody = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const card = Object.assign(
    ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
    { Body: cardBody },
  );
  const dialogRoot = ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null;
  const dialogContent = ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="dialog-content">
      {title !== undefined && <h2>{title}</h2>}
      {children}
    </div>
  );
  const input = ({
    id,
    value,
    onChange,
    placeholder,
    disabled,
    type,
  }: {
    id?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    type?: string;
  }) => (
    <input
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      type={type}
    />
  );
  const pageContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-container">{children}</div>
  );
  const select = ({
    children,
    value,
    onChange,
    disabled,
  }: {
    children: React.ReactNode;
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select value={value} onChange={(e) => onChange?.(e.target.value)} disabled={disabled}>
      {children}
    </select>
  );
  const switchComponent = ({
    id,
    checked,
    onChange,
    disabled,
  }: {
    id?: string;
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onChange?.(e.target.checked)}
      disabled={disabled}
    />
  );
  const table = ({ children }: { children: React.ReactNode }) => <table>{children}</table>;
  const tableBody = ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>;
  const tableCell = ({ children }: { children: React.ReactNode }) => <td>{children}</td>;
  const tableHead = ({ children }: { children: React.ReactNode }) => <th>{children}</th>;
  const tableHeader = ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>;
  const tableRow = ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>;

  const heading = ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>;

  return {
    Badge: badge,
    Button: button,
    Card: card,
    Dialog: {
      Root: dialogRoot,
      Content: dialogContent,
    },
    Heading: heading,
    Input: input,
    PageContainer: pageContainer,
    Select: select,
    Switch: switchComponent,
    Table: table,
    TableBody: tableBody,
    TableCell: tableCell,
    TableHead: tableHead,
    TableHeader: tableHeader,
    TableRow: tableRow,
  };
});

// Mock @bslt/shared
vi.mock('@bslt/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bslt/shared')>();
  return {
    ...actual,
    tokenStore: {
      get: () => 'mock-token',
    },
  };
});

// Mock @bslt/react
vi.mock('@bslt/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bslt/react')>();
  return {
    ...actual,
    useAdminPlans: () => ({
      plans: [],
      isLoading: false,
      isActing: false,
      create: vi.fn(),
      update: vi.fn(),
      syncToStripe: vi.fn(),
      deactivate: vi.fn(),
      error: null,
    }),
  };
});

// Mock @app/ClientEnvironment
vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({
    config: {
      apiUrl: 'http://localhost:3000',
    },
  }),
}));

describe('PlanManagementPage', () => {
  it('should render the page container', () => {
    render(<PlanManagementPage />);
    expect(screen.getByTestId('page-container')).toBeInTheDocument();
  });

  it('should render the page title', () => {
    render(<PlanManagementPage />);
    expect(screen.getByText('Plan Management')).toBeInTheDocument();
  });

  it('should render the create plan button', () => {
    render(<PlanManagementPage />);
    expect(screen.getByText('Create Plan')).toBeInTheDocument();
  });
});
