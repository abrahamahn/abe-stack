// apps/web/src/features/admin/pages/UserListPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserListPage } from './UserListPage';

import type { ReactNode } from 'react';

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => {
  const mockAlert = ({ children, tone }: { children: ReactNode; tone?: string }) => (
    <div role="alert" data-tone={tone}>
      {children}
    </div>
  );

  const mockButton = ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );

  const mockHeading = ({
    children,
    as,
    size,
  }: {
    children: ReactNode;
    as?: string;
    size?: string;
  }) => {
    const tagName = as ?? 'h1';
    if (tagName === 'h1') return <h1 data-size={size}>{children}</h1>;
    if (tagName === 'h2') return <h2 data-size={size}>{children}</h2>;
    if (tagName === 'h3') return <h3 data-size={size}>{children}</h3>;
    if (tagName === 'h4') return <h4 data-size={size}>{children}</h4>;
    if (tagName === 'h5') return <h5 data-size={size}>{children}</h5>;
    if (tagName === 'h6') return <h6 data-size={size}>{children}</h6>;
    return <h1 data-size={size}>{children}</h1>;
  };

  const mockPageContainer = ({ children }: { children: ReactNode }) => (
    <div data-testid="page-container">{children}</div>
  );

  return {
    Alert: mockAlert,
    Button: mockButton,
    Heading: mockHeading,
    PageContainer: mockPageContainer,
  };
});

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
vi.mock('../components', () => {
  const mockUserFilters = ({ isLoading }: { isLoading?: boolean }) => (
    <div data-testid="user-filters" data-loading={isLoading}>
      User Filters
    </div>
  );

  const mockUserTable = ({ isLoading }: { isLoading?: boolean }) => (
    <div data-testid="user-table" data-loading={isLoading}>
      User Table
    </div>
  );

  return {
    UserFilters: mockUserFilters,
    UserTable: mockUserTable,
  };
});

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
