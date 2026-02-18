// main/apps/web/src/features/billing/pages/BillingSettingsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingSettingsPage } from './BillingSettingsPage';

// Mock useNavigate from @bslt/react/router
const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));
vi.mock('@bslt/react/router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bslt/react/router')>();
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

// Mock @bslt/react hooks
vi.mock('@bslt/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bslt/react')>();
  return {
    ...actual,
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
  };
});

// Mock @app/ClientEnvironment
vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: vi.fn(() => ({
    config: {
      apiUrl: 'http://localhost:3000',
    },
  })),
}));

// Mock @bslt/shared tokenStore - use importOriginal to preserve AppError and other exports
vi.mock('@bslt/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bslt/shared')>();
  return {
    ...actual,
    tokenStore: {
      get: vi.fn(() => 'mock-token'),
    },
  };
});

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
    expect(screen.getAllByText('Add Payment Method').length).toBeGreaterThan(0);
  });
});
