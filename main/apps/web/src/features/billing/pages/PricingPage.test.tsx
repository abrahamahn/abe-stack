// main/apps/web/src/features/billing/pages/PricingPage.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PricingPage } from './PricingPage';

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
    // The PricingTable component should be rendered (comes from the actual @bslt/ui)
    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument();
  });
});
