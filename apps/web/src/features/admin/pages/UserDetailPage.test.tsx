// apps/web/src/features/admin/pages/UserDetailPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserDetailPage } from './UserDetailPage';

// Mock @abe-stack/ui components
vi.mock('@abe-stack/ui', () => ({
  Alert: ({ children, tone }: { children: React.ReactNode; tone?: string }) => (
    <div role="alert" data-tone={tone}>
      {children}
    </div>
  ),
  Button: ({
    children,
    onClick,
    disabled,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
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
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'test-user-id' }),
}));

// Mock hooks
vi.mock('../hooks', () => ({
  useAdminUser: () => ({
    user: null,
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
}));

// Mock components
vi.mock('../components', () => ({
  UserActionsMenu: () => <div data-testid="user-actions-menu">User Actions Menu</div>,
  UserDetailCard: ({ user, isLoading }: { user?: unknown; isLoading?: boolean }) => (
    <div data-testid="user-detail-card" data-loading={isLoading}>
      {user !== null ? 'User loaded' : 'No user'}
    </div>
  ),
}));

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
});
