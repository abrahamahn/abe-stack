// src/apps/web/src/features/admin/pages/UserDetailPage.test.tsx
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UserDetailPage } from './UserDetailPage';

import type { ReactNode } from 'react';

// Mock router hooks
vi.mock('@abe-stack/react/router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'test-user-id' }),
}));

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
    variant,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
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

// Mock hooks - use mutable state to allow per-test overrides
let mockUser: Record<string, unknown> | null = null;
const mockStartImpersonation = vi.fn();

vi.mock('../hooks', () => ({
  useAdminUser: () => ({
    user: mockUser,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    setUser: vi.fn(),
  }),
  useUserActions: () => ({
    updateUserAction: vi.fn(),
    lockUserAction: vi.fn(),
    unlockUserAction: vi.fn(),
    isUpdating: false,
    isLocking: false,
    isUnlocking: false,
    error: null,
    clearError: vi.fn(),
  }),
  useImpersonation: () => ({
    isImpersonating: false,
    targetEmail: null,
    startImpersonation: mockStartImpersonation,
    endImpersonation: vi.fn(),
  }),
}));

// Mock components
vi.mock('../components', () => {
  const mockUserActionsMenu = () => <div data-testid="user-actions-menu">User Actions Menu</div>;

  const mockUserDetailCard = ({ user, isLoading }: { user?: unknown; isLoading?: boolean }) => (
    <div data-testid="user-detail-card" data-loading={isLoading}>
      {user !== null ? 'User loaded' : 'No user'}
    </div>
  );

  return {
    UserActionsMenu: mockUserActionsMenu,
    UserDetailCard: mockUserDetailCard,
  };
});

describe('UserDetailPage', () => {
  it('should render the page container', () => {
    render(<UserDetailPage />);
    expect(screen.getByTestId('page-container')).toBeInTheDocument();
  });

  it('should render the back button', () => {
    render(<UserDetailPage />);
    expect(screen.getByText('Back to Users')).toBeInTheDocument();
  });

  it('should render the refresh button', () => {
    render(<UserDetailPage />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('should render the user detail card', () => {
    render(<UserDetailPage />);
    expect(screen.getByTestId('user-detail-card')).toBeInTheDocument();
  });

  it('should not show impersonate button when user is null', () => {
    render(<UserDetailPage />);
    expect(screen.queryByText('Impersonate')).not.toBeInTheDocument();
  });
});

describe('UserDetailPage with non-admin user', () => {
  afterEach(() => {
    mockUser = null;
  });

  it('should show impersonate button for non-admin user', () => {
    mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      emailVerified: true,
      emailVerifiedAt: '2026-01-01',
      lockedUntil: null,
      lockReason: null,
      failedLoginAttempts: 0,
      phone: null,
      phoneVerified: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    render(<UserDetailPage />);
    expect(screen.getByText('Impersonate')).toBeInTheDocument();
  });

  it('should not show impersonate button for admin user', () => {
    mockUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      username: 'adminuser',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      emailVerified: true,
      emailVerifiedAt: '2026-01-01',
      lockedUntil: null,
      lockReason: null,
      failedLoginAttempts: 0,
      phone: null,
      phoneVerified: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    render(<UserDetailPage />);
    expect(screen.queryByText('Impersonate')).not.toBeInTheDocument();
  });
});
