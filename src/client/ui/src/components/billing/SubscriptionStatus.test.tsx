// client/ui/src/components/billing/SubscriptionStatus.test.tsx
/**
 * Tests for SubscriptionStatus component.
 *
 * Tests subscription status display with actions.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SubscriptionStatus } from './SubscriptionStatus';

import type { Subscription, SubscriptionId, UserId, PlanId } from '@abe-stack/shared';

const createMockSubscription = (overrides?: Partial<Subscription>): Subscription => ({
  id: 'sub_123' as unknown as SubscriptionId,
  userId: 'user_123' as unknown as UserId,
  planId: 'plan_123' as unknown as PlanId,
  plan: {
    id: 'plan_123' as unknown as PlanId,
    name: 'Pro Plan',
    description: null,
    priceInCents: 2999,
    currency: 'usd',
    interval: 'month',
    trialDays: 14,
    isActive: true,
    sortOrder: 0,
    features: [],
  },
  provider: 'stripe',
  status: 'active',
  currentPeriodStart: '2024-01-01T00:00:00Z',
  currentPeriodEnd: '2024-02-01T00:00:00Z',
  cancelAtPeriodEnd: false,
  canceledAt: null,
  trialEnd: null,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('SubscriptionStatus', () => {
  describe('no subscription', () => {
    it('should show no subscription message', () => {
      render(<SubscriptionStatus subscription={null} />);

      expect(screen.getByText('No Active Subscription')).toBeInTheDocument();
      expect(
        screen.getByText('Subscribe to a plan to access premium features.'),
      ).toBeInTheDocument();
    });

    it('should not show action buttons', () => {
      render(<SubscriptionStatus subscription={null} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('active subscription', () => {
    it('should show plan name', () => {
      const subscription = createMockSubscription();
      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.getByText('Pro Plan')).toBeInTheDocument();
    });

    it('should show price', () => {
      const subscription = createMockSubscription();
      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.getByText('$29.99')).toBeInTheDocument();
      expect(screen.getByText('/mo')).toBeInTheDocument();
    });

    it('should show yearly price', () => {
      const subscription = createMockSubscription({
        plan: {
          id: 'plan_123' as unknown as PlanId,
          name: 'Pro Plan',
          description: null,
          priceInCents: 29900,
          currency: 'usd',
          interval: 'year',
          trialDays: 0,
          isActive: true,
          sortOrder: 0,
          features: [],
        },
      });

      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.getByText('$299.00')).toBeInTheDocument();
      expect(screen.getByText('/yr')).toBeInTheDocument();
    });

    it('should show active status badge', () => {
      const subscription = createMockSubscription();
      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should show renewal date', () => {
      const subscription = createMockSubscription();
      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.getByText('Renews on')).toBeInTheDocument();
    });

    it('should show change plan button', () => {
      const subscription = createMockSubscription();
      render(<SubscriptionStatus subscription={subscription} onChangePlan={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Change Plan' })).toBeInTheDocument();
    });

    it('should show cancel button', () => {
      const subscription = createMockSubscription();
      render(<SubscriptionStatus subscription={subscription} onCancel={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Cancel Subscription' })).toBeInTheDocument();
    });
  });

  describe('trialing subscription', () => {
    it('should show trial status', () => {
      const subscription = createMockSubscription({
        status: 'trialing',
        trialEnd: '2024-01-15T00:00:00Z',
      });

      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.getByText('Trial')).toBeInTheDocument();
    });

    it('should show trial end date', () => {
      const subscription = createMockSubscription({
        status: 'trialing',
        trialEnd: '2024-01-15T00:00:00Z',
      });

      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.getByText('Trial ends')).toBeInTheDocument();
    });

    it('should allow canceling during trial', () => {
      const subscription = createMockSubscription({
        status: 'trialing',
        trialEnd: '2024-01-15T00:00:00Z',
      });

      render(<SubscriptionStatus subscription={subscription} onCancel={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Cancel Subscription' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel Subscription' })).not.toBeDisabled();
    });
  });

  describe('canceling subscription', () => {
    it('should show canceling warning', () => {
      const subscription = createMockSubscription({
        cancelAtPeriodEnd: true,
      });

      render(<SubscriptionStatus subscription={subscription} />);

      expect(
        screen.getByText(/will cancel at the end of the current billing period/),
      ).toBeInTheDocument();
    });

    it('should show access until date', () => {
      const subscription = createMockSubscription({
        cancelAtPeriodEnd: true,
      });

      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.getByText('Access until')).toBeInTheDocument();
    });

    it('should show resume button', () => {
      const subscription = createMockSubscription({
        cancelAtPeriodEnd: true,
      });

      render(<SubscriptionStatus subscription={subscription} onResume={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Resume Subscription' })).toBeInTheDocument();
    });

    it('should not show cancel button', () => {
      const subscription = createMockSubscription({
        cancelAtPeriodEnd: true,
      });

      render(<SubscriptionStatus subscription={subscription} onCancel={vi.fn()} />);

      expect(screen.queryByRole('button', { name: 'Cancel Subscription' })).not.toBeInTheDocument();
    });
  });

  describe('canceled subscription', () => {
    it('should show canceled status', () => {
      const subscription = createMockSubscription({
        status: 'canceled',
        canceledAt: '2024-01-15T00:00:00Z',
      });

      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.getByText('Canceled')).toBeInTheDocument();
    });

    it('should not show action buttons', () => {
      const subscription = createMockSubscription({
        status: 'canceled',
        canceledAt: '2024-01-15T00:00:00Z',
      });

      render(
        <SubscriptionStatus
          subscription={subscription}
          onCancel={vi.fn()}
          onResume={vi.fn()}
          onChangePlan={vi.fn()}
        />,
      );

      expect(screen.queryByRole('button', { name: 'Cancel Subscription' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Resume Subscription' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Change Plan' })).not.toBeInTheDocument();
    });
  });

  describe('past due subscription', () => {
    it('should show past due status', () => {
      const subscription = createMockSubscription({
        status: 'past_due',
      });

      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.getByText('Past Due')).toBeInTheDocument();
    });

    it('should show warning message', () => {
      const subscription = createMockSubscription({
        status: 'past_due',
      });

      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.getByText(/payment is past due/)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const subscription = createMockSubscription();

      render(<SubscriptionStatus subscription={subscription} onCancel={onCancel} />);

      const button = screen.getByRole('button', { name: 'Cancel Subscription' });
      await user.click(button);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onResume when resume button clicked', async () => {
      const user = userEvent.setup();
      const onResume = vi.fn();
      const subscription = createMockSubscription({
        cancelAtPeriodEnd: true,
      });

      render(<SubscriptionStatus subscription={subscription} onResume={onResume} />);

      const button = screen.getByRole('button', { name: 'Resume Subscription' });
      await user.click(button);

      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it('should call onChangePlan when change plan button clicked', async () => {
      const user = userEvent.setup();
      const onChangePlan = vi.fn();
      const subscription = createMockSubscription();

      render(<SubscriptionStatus subscription={subscription} onChangePlan={onChangePlan} />);

      const button = screen.getByRole('button', { name: 'Change Plan' });
      await user.click(button);

      expect(onChangePlan).toHaveBeenCalledTimes(1);
    });

    it('should call onManagePaymentMethods when clicked', async () => {
      const user = userEvent.setup();
      const onManagePaymentMethods = vi.fn();
      const subscription = createMockSubscription();

      render(
        <SubscriptionStatus
          subscription={subscription}
          onManagePaymentMethods={onManagePaymentMethods}
        />,
      );

      const button = screen.getByRole('button', { name: 'Payment Methods' });
      await user.click(button);

      expect(onManagePaymentMethods).toHaveBeenCalledTimes(1);
    });

    it('should disable buttons when isActing is true', () => {
      const subscription = createMockSubscription();

      render(
        <SubscriptionStatus
          subscription={subscription}
          onCancel={vi.fn()}
          onChangePlan={vi.fn()}
          isActing
        />,
      );

      const changePlanButton = screen.getByRole('button', { name: 'Change Plan' });
      const cancelButton = screen.getByRole('button', { name: 'Canceling...' });

      expect(changePlanButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should show loading text when isActing', () => {
      const subscription = createMockSubscription();

      render(<SubscriptionStatus subscription={subscription} onCancel={vi.fn()} isActing />);

      expect(screen.getByRole('button', { name: 'Canceling...' })).toBeInTheDocument();
    });

    it('should show loading text for resume', () => {
      const subscription = createMockSubscription({
        cancelAtPeriodEnd: true,
      });

      render(<SubscriptionStatus subscription={subscription} onResume={vi.fn()} isActing />);

      expect(screen.getByRole('button', { name: 'Resuming...' })).toBeInTheDocument();
    });
  });

  describe('custom formatters', () => {
    it('should use custom formatDate', () => {
      const subscription = createMockSubscription();
      const formatDate = (): string => 'Custom Date';

      render(<SubscriptionStatus subscription={subscription} formatDate={formatDate} />);

      expect(screen.getByText('Custom Date')).toBeInTheDocument();
    });

    it('should use custom formatPrice', () => {
      const subscription = createMockSubscription();
      const formatPrice = (): string => 'Custom Price';

      render(<SubscriptionStatus subscription={subscription} formatPrice={formatPrice} />);

      expect(screen.getByText('Custom Price')).toBeInTheDocument();
    });
  });

  describe('props passthrough', () => {
    it('should pass className to container', () => {
      const subscription = createMockSubscription();
      render(<SubscriptionStatus subscription={subscription} className="custom-class" />);

      const container = document.querySelector('.subscription-status');
      expect(container).toHaveClass('custom-class');
    });

    it('should pass data attributes', () => {
      const subscription = createMockSubscription();
      render(<SubscriptionStatus subscription={subscription} data-testid="subscription-status" />);

      expect(screen.getByTestId('subscription-status')).toBeInTheDocument();
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to container element', () => {
      const ref = createRef<HTMLDivElement>();
      const subscription = createMockSubscription();

      render(<SubscriptionStatus ref={ref} subscription={subscription} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveClass('subscription-status');
    });
  });

  describe('accessibility', () => {
    it('should have accessible action buttons', () => {
      const subscription = createMockSubscription();

      render(
        <SubscriptionStatus
          subscription={subscription}
          onCancel={vi.fn()}
          onChangePlan={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: 'Change Plan' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel Subscription' })).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const subscription = createMockSubscription();

      render(<SubscriptionStatus subscription={subscription} onChangePlan={vi.fn()} />);

      await user.tab();
      const changePlanButton = screen.getByRole('button', { name: 'Change Plan' });
      expect(changePlanButton).toHaveFocus();
    });
  });

  describe('edge cases', () => {
    it('should handle missing trial end date', () => {
      const subscription = createMockSubscription({
        status: 'trialing',
        trialEnd: null,
      });

      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.queryByText('Trial ends')).not.toBeInTheDocument();
    });

    it('should handle empty trial end string', () => {
      const subscription = createMockSubscription({
        status: 'trialing',
        trialEnd: '',
      });

      render(<SubscriptionStatus subscription={subscription} />);

      expect(screen.queryByText('Trial ends')).not.toBeInTheDocument();
    });

    it('should handle all subscription statuses', () => {
      const statuses: Array<Subscription['status']> = [
        'active',
        'trialing',
        'past_due',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'paused',
        'unpaid',
      ];

      statuses.forEach((status) => {
        const subscription = createMockSubscription({ status });
        const { container } = render(<SubscriptionStatus subscription={subscription} />);
        expect(container.querySelector('.subscription-status')).toBeInTheDocument();
      });
    });
  });
});
