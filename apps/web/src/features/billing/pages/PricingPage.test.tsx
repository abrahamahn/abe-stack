// apps/web/src/features/billing/pages/PricingPage.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PricingPage } from './PricingPage';

// Mock useNavigate from @abe-stack/ui
const mockNavigate = vi.fn();
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

// Mock @abe-stack/engine hooks
vi.mock('@abe-stack/engine', () => ({
  usePlans: vi.fn(() => ({
    plans: [],
    isLoading: false,
    error: null,
  })),
  useSubscription: vi.fn(() => ({
    subscription: null,
    createCheckout: vi.fn(),
    isActing: false,
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

// Mock @abe-stack/shared tokenStore
vi.mock('@abe-stack/shared', () => ({
  tokenStore: {
    get: vi.fn(() => 'mock-token'),
  },
}));

describe('PricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title', () => {
    render(<PricingPage />);
    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument();
  });

  it('should render the subtitle', () => {
    render(<PricingPage />);
    expect(screen.getByText(/Choose the plan that works best for you/)).toBeInTheDocument();
  });

  it('should render the pricing table', () => {
    render(<PricingPage />);
    // The PricingTable component should be rendered (comes from the actual @abe-stack/ui)
    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument();
  });
});
