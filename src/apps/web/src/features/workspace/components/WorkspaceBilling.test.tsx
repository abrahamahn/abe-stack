// src/apps/web/src/features/workspace/components/WorkspaceBilling.test.tsx
/**
 * Tests for WorkspaceBilling component.
 */

import { QueryCache, QueryCacheProvider } from '@abe-stack/client-engine';
import { MemoryRouter } from '@abe-stack/ui';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../hooks/useWorkspaceBilling', () => ({
  useWorkspaceBilling: vi.fn(),
}));

import { useWorkspaceBilling } from '../hooks/useWorkspaceBilling';

import { WorkspaceBilling } from './WorkspaceBilling';

import type { Plan, Subscription } from '../hooks/useWorkspaceBilling';

const mockNavigate = vi.fn();
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual<typeof import('@abe-stack/ui')>('@abe-stack/ui');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ============================================================================
// Test Setup
// ============================================================================

function renderWithProviders(ui: React.ReactElement): ReturnType<typeof render> {
  const queryCache = new QueryCache();

  return render(
    <QueryCacheProvider cache={queryCache}>
      <MemoryRouter initialEntries={['/']}>{ui}</MemoryRouter>
    </QueryCacheProvider>,
  );
}

const mockPlan: Plan = {
  id: 'plan-pro',
  name: 'Pro',
  tier: 'pro',
  price: 2900,
  currency: 'usd',
  interval: 'month',
};

const mockSubscription: Subscription = {
  id: 'sub-1',
  userId: 'user-1',
  planId: 'plan-pro',
  plan: mockPlan,
  provider: 'stripe',
  status: 'active',
  currentPeriodStart: '2024-01-01T00:00:00Z',
  currentPeriodEnd: '2024-02-01T00:00:00Z',
  cancelAtPeriodEnd: false,
  canceledAt: null,
  trialEnd: null,
  createdAt: '2024-01-01T00:00:00Z',
};

// ============================================================================
// Tests
// ============================================================================

describe('WorkspaceBilling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(useWorkspaceBilling).mockReturnValue({
      plan: null,
      subscription: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<WorkspaceBilling tenantId="tenant-1" />);

    expect(screen.getByText('Billing')).toBeInTheDocument();
  });

  it('should render free plan state when no subscription', () => {
    vi.mocked(useWorkspaceBilling).mockReturnValue({
      plan: null,
      subscription: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<WorkspaceBilling tenantId="tenant-1" />);

    expect(screen.getByText('Current Plan:')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(
      screen.getByText('Upgrade to unlock premium features and increased limits.'),
    ).toBeInTheDocument();
  });

  it('should render active subscription details', () => {
    vi.mocked(useWorkspaceBilling).mockReturnValue({
      plan: mockPlan,
      subscription: mockSubscription,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<WorkspaceBilling tenantId="tenant-1" />);

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('$29.00 / month')).toBeInTheDocument();
    expect(screen.getByText('Billing Period:')).toBeInTheDocument();
    expect(screen.getByText('Next Renewal:')).toBeInTheDocument();
  });

  it('should navigate to pricing page on upgrade click', async () => {
    const user = userEvent.setup();

    vi.mocked(useWorkspaceBilling).mockReturnValue({
      plan: null,
      subscription: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<WorkspaceBilling tenantId="tenant-1" />);

    const upgradeButton = screen.getByText('Upgrade Plan');
    await user.click(upgradeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/billing/pricing');
  });

  it('should navigate to billing on manage payment click', async () => {
    const user = userEvent.setup();

    vi.mocked(useWorkspaceBilling).mockReturnValue({
      plan: mockPlan,
      subscription: mockSubscription,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<WorkspaceBilling tenantId="tenant-1" />);

    const manageButton = screen.getByText('Manage Payment Method');
    await user.click(manageButton);

    expect(mockNavigate).toHaveBeenCalledWith('/billing');
  });

  it('should display error message', () => {
    vi.mocked(useWorkspaceBilling).mockReturnValue({
      plan: null,
      subscription: null,
      isLoading: false,
      isError: true,
      error: new Error('Failed to load billing info'),
      refetch: vi.fn(),
    });

    renderWithProviders(<WorkspaceBilling tenantId="tenant-1" />);

    expect(screen.getByText('Failed to load billing info')).toBeInTheDocument();
  });

  it('should show cancellation notice when cancelAtPeriodEnd is true', () => {
    const canceledSubscription = {
      ...mockSubscription,
      cancelAtPeriodEnd: true,
    };

    vi.mocked(useWorkspaceBilling).mockReturnValue({
      plan: mockPlan,
      subscription: canceledSubscription,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<WorkspaceBilling tenantId="tenant-1" />);

    expect(screen.getByText('Subscription will cancel at period end')).toBeInTheDocument();
  });

  it('should navigate to billing on view invoices click', async () => {
    const user = userEvent.setup();

    vi.mocked(useWorkspaceBilling).mockReturnValue({
      plan: mockPlan,
      subscription: mockSubscription,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<WorkspaceBilling tenantId="tenant-1" />);

    const viewInvoicesButton = screen.getByText('View Invoices');
    await user.click(viewInvoicesButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/billing');
    });
  });
});
