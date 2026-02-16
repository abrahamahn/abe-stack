// main/apps/web/src/features/billing/pages/CheckoutCancelPage.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach } from 'vitest';

import { CheckoutCancelPage } from './CheckoutCancelPage';

// Mock useNavigate from @abe-stack/react/router
const mockNavigate = vi.fn();
vi.mock('@abe-stack/react/router', async () => {
  const actual = await vi.importActual('@abe-stack/react/router');
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

describe('CheckoutCancelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title', () => {
    render(<CheckoutCancelPage />);
    expect(screen.getByText('Checkout Canceled')).toBeInTheDocument();
  });

  it('should render the canceled message', () => {
    render(<CheckoutCancelPage />);
    expect(
      screen.getByText(/Your checkout was canceled and you have not been charged/),
    ).toBeInTheDocument();
  });

  it('should render Return to Pricing button', () => {
    render(<CheckoutCancelPage />);
    expect(screen.getByText('Return to Pricing')).toBeInTheDocument();
  });

  it('should render Go to Home button', () => {
    render(<CheckoutCancelPage />);
    expect(screen.getByText('Go to Home')).toBeInTheDocument();
  });

  it('should navigate to pricing when Return to Pricing is clicked', () => {
    render(<CheckoutCancelPage />);
    fireEvent.click(screen.getByText('Return to Pricing'));
    expect(mockNavigate).toHaveBeenCalledWith('/pricing');
  });

  it('should navigate to home when Go to Home is clicked', () => {
    render(<CheckoutCancelPage />);
    fireEvent.click(screen.getByText('Go to Home'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
