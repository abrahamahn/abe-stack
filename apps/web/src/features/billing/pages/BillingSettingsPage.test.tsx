// apps/web/src/features/billing/pages/BillingSettingsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingSettingsPage } from './BillingSettingsPage';

// Mock useNavigate from @abe-stack/ui
const mockNavigate = vi.fn();
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

// Mock @abe-stack/sdk hooks
vi.mock('@abe-stack/sdk', () => ({
  useSubscription: vi.fn(() => ({
    subscription: null,
    isLoading: false,
    isActing: false,
    cancel: vi.fn(),
    resume: vi.fn(),
  })),
  usePaymentMethods: vi.fn(() => ({
    paymentMethods: [],
    isLoading: false,
    isActing: false,
    getSetupIntent: vi.fn(),
    removePaymentMethod: vi.fn(),
    setDefault: vi.fn(),
  })),
  useInvoices: vi.fn(() => ({
    invoices: [],
    hasMore: false,
    isLoading: false,
    error: null,
  })),
}));

// Mock @app/ClientEnvironment
vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: vi.fn(() => ({
    config: {
      apiUrl: 'http://localhost:3000',
    },
  })),
}));

// Mock @abe-stack/core tokenStore
vi.mock('@abe-stack/core', () => ({
  tokenStore: {
    get: vi.fn(() => 'mock-token'),
  },
}));

describe('BillingSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title', () => {
    render(<BillingSettingsPage />);
    expect(screen.getByText('Billing Settings')).toBeInTheDocument();
  });

  it('should render subscription section', () => {
    render(<BillingSettingsPage />);
    expect(screen.getByText('Subscription')).toBeInTheDocument();
  });

  it('should render payment methods section', () => {
    render(<BillingSettingsPage />);
    expect(screen.getByText('Payment Methods')).toBeInTheDocument();
  });

  it('should render invoice history section', () => {
    render(<BillingSettingsPage />);
    expect(screen.getByText('Invoice History')).toBeInTheDocument();
  });

  it('should render add payment method button', () => {
    render(<BillingSettingsPage />);
    expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
  });
});
