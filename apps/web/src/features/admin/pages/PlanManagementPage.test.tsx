// apps/web/src/features/admin/pages/PlanManagementPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanManagementPage } from './PlanManagementPage';

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => ({
  Badge: ({ children, tone }: { children: React.ReactNode; tone?: string }) => (
    <span data-testid="badge" data-tone={tone}>
      {children}
    </span>
  ),
  Button: ({
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
  ),
  Card: Object.assign(
    ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
    { Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
  ),
  Dialog: {
    Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div data-testid="dialog">{children}</div> : null,
    Content: ({ children, title }: { children: React.ReactNode; title?: string }) => (
      <div data-testid="dialog-content">
        {title !== undefined && <h2>{title}</h2>}
        {children}
      </div>
    ),
  },
  Input: ({
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
  ),
  PageContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-container">{children}</div>
  ),
  Select: ({
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
  ),
  Switch: ({
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
  ),
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

// Mock @abe-stack/shared
vi.mock('@abe-stack/shared', () => ({
  tokenStore: {
    get: () => 'mock-token',
  },
}));

// Mock @abe-stack/engine
vi.mock('@abe-stack/engine', () => ({
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
}));

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
