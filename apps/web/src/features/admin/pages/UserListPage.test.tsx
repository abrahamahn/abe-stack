// apps/web/src/features/admin/pages/UserListPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserListPage } from './UserListPage';

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => ({
  Alert: ({ children, tone }: { children: React.ReactNode; tone?: string }) => (
    <div role="alert" data-tone={tone}>{children}</div>
  ),
  Button: ({ children, onClick, disabled }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Heading: ({ children, as, size }: { children: React.ReactNode; as?: string; size?: string }) => {
    const Tag = (as ?? 'h1') as keyof JSX.IntrinsicElements;
    return <Tag data-size={size}>{children}</Tag>;
  },
  PageContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="page-container">{children}</div>,
}));

// Mock hooks
vi.mock('../hooks', () => ({
  useAdminUsers: () => ({
    users: [],
    total: 0,
    page: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    isLoading: false,
    error: null,
    filters: { limit: 20 },
    setFilters: vi.fn(),
    setPage: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock components
vi.mock('../components', () => ({
  UserFilters: ({ isLoading }: { isLoading?: boolean }) => (
    <div data-testid="user-filters" data-loading={isLoading}>User Filters</div>
  ),
  UserTable: ({ isLoading }: { isLoading?: boolean }) => (
    <div data-testid="user-table" data-loading={isLoading}>User Table</div>
  ),
}));

describe('UserListPage', () => {
  it('should render the page container', () => {
    render(<UserListPage />);
    expect(screen.getByTestId('page-container')).toBeInTheDocument();
  });

  it('should render the heading', () => {
    render(<UserListPage />);
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('should render the refresh button', () => {
    render(<UserListPage />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('should render the user filters', () => {
    render(<UserListPage />);
    expect(screen.getByTestId('user-filters')).toBeInTheDocument();
  });

  it('should render the user table', () => {
    render(<UserListPage />);
    expect(screen.getByTestId('user-table')).toBeInTheDocument();
  });
});
