// apps/web/src/features/billing/pages/CheckoutSuccessPage.test.tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CheckoutSuccessPage } from './CheckoutSuccessPage';

// Mock useNavigate from @abe-stack/ui
const mockNavigate = vi.fn();
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

describe('CheckoutSuccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render the page title', () => {
    render(<CheckoutSuccessPage />);
    expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
  });

  it('should render the success message', () => {
    render(<CheckoutSuccessPage />);
    expect(screen.getByText(/Thank you for subscribing/)).toBeInTheDocument();
  });

  it('should render Go to Billing Settings button', () => {
    render(<CheckoutSuccessPage />);
    expect(screen.getByText('Go to Billing Settings')).toBeInTheDocument();
  });

  it('should render Go to Dashboard button', () => {
    render(<CheckoutSuccessPage />);
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('should display countdown timer', () => {
    render(<CheckoutSuccessPage />);
    expect(screen.getByText(/Redirecting to billing settings in 5 seconds/)).toBeInTheDocument();
  });

  it('should navigate to billing settings when Go to Billing Settings is clicked', () => {
    render(<CheckoutSuccessPage />);
    fireEvent.click(screen.getByText('Go to Billing Settings'));
    expect(mockNavigate).toHaveBeenCalledWith('/settings/billing');
  });

  it('should navigate to dashboard when Go to Dashboard is clicked', () => {
    render(<CheckoutSuccessPage />);
    fireEvent.click(screen.getByText('Go to Dashboard'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should decrement countdown every second', () => {
    render(<CheckoutSuccessPage />);
    expect(screen.getByText(/5 seconds/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/4 seconds/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/3 seconds/)).toBeInTheDocument();
  });

  it('should auto-redirect after countdown reaches zero', () => {
    render(<CheckoutSuccessPage />);

    // Advance timers one second at a time to trigger each state update
    // 5 -> 4 -> 3 -> 2 -> 1 -> 0 (navigate called when countdown reaches 0)
    for (let i = 0; i < 6; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    expect(mockNavigate).toHaveBeenCalledWith('/settings/billing');
  });
});
