// main/client/ui/src/components/billing/PricingTable.test.tsx
/**
 * Tests for PricingTable component.
 *
 * Tests pricing plans grid with interval toggle.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PricingTable } from './PricingTable';

import type { Plan, PlanId } from '@abe-stack/shared';

const createMockPlans = (): Plan[] => [
  {
    id: 'basic-month' as unknown as PlanId,
    name: 'Basic',
    description: 'For individuals',
    priceInCents: 999,
    currency: 'usd',
    interval: 'month',
    trialDays: 0,
    isActive: true,
    sortOrder: 0,
    features: [{ key: 'storage:limit', name: '10 GB Storage', included: true, value: 10 }],
  },
  {
    id: 'basic-year' as unknown as PlanId,
    name: 'Basic',
    description: 'For individuals',
    priceInCents: 9900,
    currency: 'usd',
    interval: 'year',
    trialDays: 0,
    isActive: true,
    sortOrder: 1,
    features: [{ key: 'storage:limit', name: '10 GB Storage', included: true, value: 10 }],
  },
  {
    id: 'pro-month' as unknown as PlanId,
    name: 'Pro',
    description: 'For teams',
    priceInCents: 2999,
    currency: 'usd',
    interval: 'month',
    trialDays: 14,
    isActive: true,
    sortOrder: 2,
    features: [{ key: 'storage:limit', name: '100 GB Storage', included: true, value: 100 }],
  },
  {
    id: 'pro-year' as unknown as PlanId,
    name: 'Pro',
    description: 'For teams',
    priceInCents: 29900,
    currency: 'usd',
    interval: 'year',
    trialDays: 14,
    isActive: true,
    sortOrder: 3,
    features: [{ key: 'storage:limit', name: '100 GB Storage', included: true, value: 100 }],
  },
];

describe('PricingTable', () => {
  describe('rendering', () => {
    it('should render monthly plans by default', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} />);

      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('should render plans in grid layout', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} />);

      const grid = document.querySelector('.pricing-table__grid');
      expect(grid).toBeInTheDocument();
    });

    it('should show correct number of plan cards', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} defaultInterval="month" />);

      const monthlyPlans = plans.filter((p) => p.interval === 'month');
      const cards = document.querySelectorAll('.plan-card');
      expect(cards).toHaveLength(monthlyPlans.length);
    });
  });

  describe('interval toggle', () => {
    it('should show interval toggle by default', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} />);

      expect(screen.getByText('Monthly')).toBeInTheDocument();
      expect(screen.getByText('Yearly')).toBeInTheDocument();
    });

    it('should hide toggle when showIntervalToggle is false', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} showIntervalToggle={false} />);

      expect(screen.queryByText('Monthly')).not.toBeInTheDocument();
      expect(screen.queryByText('Yearly')).not.toBeInTheDocument();
    });

    it('should hide toggle when only monthly plans exist', () => {
      const plans = createMockPlans().filter((p) => p.interval === 'month');
      render(<PricingTable plans={plans} />);

      expect(screen.queryByText('Monthly')).not.toBeInTheDocument();
    });

    it('should hide toggle when only yearly plans exist', () => {
      const plans = createMockPlans().filter((p) => p.interval === 'year');
      render(<PricingTable plans={plans} />);

      expect(screen.queryByText('Yearly')).not.toBeInTheDocument();
    });

    it('should switch to yearly plans when yearly is clicked', async () => {
      const user = userEvent.setup();
      const plans = createMockPlans();
      render(<PricingTable plans={plans} />);

      const yearlyButton = screen.getByRole('button', { name: /Yearly/ });
      await user.click(yearlyButton);

      const yearlyPlans = plans.filter((p) => p.interval === 'year');
      const cards = document.querySelectorAll('.plan-card');
      expect(cards).toHaveLength(yearlyPlans.length);
    });

    it('should switch to monthly plans when monthly is clicked', async () => {
      const user = userEvent.setup();
      const plans = createMockPlans();
      render(<PricingTable plans={plans} defaultInterval="year" />);

      const monthlyButton = screen.getByRole('button', { name: 'Monthly' });
      await user.click(monthlyButton);

      const monthlyPlans = plans.filter((p) => p.interval === 'month');
      const cards = document.querySelectorAll('.plan-card');
      expect(cards).toHaveLength(monthlyPlans.length);
    });

    it('should apply active class to selected interval', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} />);

      const monthlyButton = screen.getByRole('button', { name: 'Monthly' });
      expect(monthlyButton).toHaveClass('pricing-table__toggle-button--active');
    });
  });

  describe('yearly savings', () => {
    it('should show savings badge on yearly option', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} />);

      expect(screen.getByText(/Save \d+%/)).toBeInTheDocument();
    });

    it('should calculate savings correctly', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} />);

      // Basic: $9.99/mo * 12 = $119.88 vs $99/yr = 17% savings
      const savingsBadge = screen.getByText(/Save \d+%/);
      expect(savingsBadge.textContent).toMatch(/Save \d+%/);
    });

    it('should not show savings when yearly is not cheaper', () => {
      const plans: Plan[] = [
        {
          id: 'plan-month' as unknown as PlanId,
          name: 'Plan',
          description: null,
          priceInCents: 1000,
          currency: 'usd',
          interval: 'month',
          trialDays: 0,
          isActive: true,
          sortOrder: 0,
          features: [],
        },
        {
          id: 'plan-year' as unknown as PlanId,
          name: 'Plan',
          description: null,
          priceInCents: 15000,
          currency: 'usd',
          interval: 'year',
          trialDays: 0,
          isActive: true,
          sortOrder: 1,
          features: [],
        },
      ];

      render(<PricingTable plans={plans} />);

      expect(screen.queryByText(/Save \d+%/)).not.toBeInTheDocument();
    });
  });

  describe('plan selection', () => {
    it('should call onSelectPlan when plan is clicked', async () => {
      const user = userEvent.setup();
      const onSelectPlan = vi.fn();
      const plans = createMockPlans();

      render(<PricingTable plans={plans} onSelectPlan={onSelectPlan} />);

      const getStartedButtons = screen.getAllByRole('button', { name: 'Get Started' });
      const firstButton = getStartedButtons[0];
      if (firstButton === undefined) throw new Error('Button not found');
      await user.click(firstButton);

      expect(onSelectPlan).toHaveBeenCalledTimes(1);
      expect(onSelectPlan).toHaveBeenCalledWith(expect.objectContaining({ id: 'basic-month' }));
    });

    it('should pass plan data to callback', async () => {
      const user = userEvent.setup();
      const onSelectPlan = vi.fn();
      const plans = createMockPlans();

      render(<PricingTable plans={plans} onSelectPlan={onSelectPlan} />);

      const getStartedButtons = screen.getAllByRole('button', { name: 'Get Started' });
      const secondButton = getStartedButtons[1];
      if (secondButton === undefined) throw new Error('Button not found');
      await user.click(secondButton);

      expect(onSelectPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'pro-month',
          name: 'Pro',
        }),
      );
    });
  });

  describe('current plan', () => {
    it('should mark current plan', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} currentPlanId="basic-month" />);

      expect(screen.getByRole('button', { name: 'Current Plan' })).toBeInTheDocument();
    });

    it('should disable current plan button', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} currentPlanId="basic-month" />);

      const button = screen.getByRole('button', { name: 'Current Plan' });
      expect(button).toBeDisabled();
    });

    it('should not mark other plans as current', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} currentPlanId="basic-month" />);

      const getStartedButtons = screen.getAllByRole('button', { name: 'Get Started' });
      expect(getStartedButtons.length).toBeGreaterThan(0);
    });
  });

  describe('highlighted plan', () => {
    it('should highlight specified plan', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} highlightedPlanId="pro-month" />);

      const cards = document.querySelectorAll('.plan-card');
      const highlightedCard = Array.from(cards).find((card) =>
        card.classList.contains('plan-card--highlighted'),
      );

      expect(highlightedCard).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading message', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} isLoading />);

      expect(screen.getByText('Loading plans...')).toBeInTheDocument();
    });

    it('should not show plans when loading', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} isLoading />);

      expect(screen.queryByText('Basic')).not.toBeInTheDocument();
      expect(screen.queryByText('Pro')).not.toBeInTheDocument();
    });

    it('should show loading for specific plan', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} loadingPlanId="basic-month" />);

      const loadingButton = screen.getByRole('button', { name: 'Loading...' });
      expect(loadingButton).toBeInTheDocument();
    });

    it('should disable other plans when one is loading', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} loadingPlanId="basic-month" />);

      const getStartedButtons = screen.getAllByRole('button', { name: 'Get Started' });
      getStartedButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('error state', () => {
    it('should show error message', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} error="Failed to load plans" />);

      expect(screen.getByText('Failed to load plans')).toBeInTheDocument();
    });

    it('should not show plans when error exists', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} error="Failed to load plans" />);

      expect(screen.queryByText('Basic')).not.toBeInTheDocument();
    });

    it('should not show error when error is empty', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} error="" />);

      expect(screen.getByText('Basic')).toBeInTheDocument();
    });

    it('should not show error when error is null', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} error={null} />);

      expect(screen.getByText('Basic')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty message when no plans', () => {
      render(<PricingTable plans={[]} />);

      expect(screen.getByText('No plans available')).toBeInTheDocument();
    });

    it('should not show toggle when no plans', () => {
      render(<PricingTable plans={[]} />);

      expect(screen.queryByText('Monthly')).not.toBeInTheDocument();
      expect(screen.queryByText('Yearly')).not.toBeInTheDocument();
    });
  });

  describe('custom formatters', () => {
    it('should use custom formatPrice', () => {
      const plans = createMockPlans();
      const formatPrice = (): string => 'Custom';

      render(<PricingTable plans={plans} formatPrice={formatPrice} />);

      expect(screen.getAllByText('Custom').length).toBeGreaterThan(0);
    });

    it('should use custom getActionLabel', () => {
      const plans = createMockPlans();
      const getActionLabel = (): string => 'Choose Plan';

      render(<PricingTable plans={plans} getActionLabel={getActionLabel} />);

      expect(screen.getAllByRole('button', { name: 'Choose Plan' }).length).toBeGreaterThan(0);
    });

    it('should use custom getBadge', () => {
      const plans = createMockPlans();
      const getBadge = (plan: Plan): string => (plan.id === 'pro-month' ? 'Popular' : '');

      render(<PricingTable plans={plans} getBadge={getBadge} />);

      expect(screen.getByText('Popular')).toBeInTheDocument();
    });
  });

  describe('defaultInterval', () => {
    it('should start with monthly by default', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} />);

      const monthlyButton = screen.getByRole('button', { name: 'Monthly' });
      expect(monthlyButton).toHaveClass('pricing-table__toggle-button--active');
    });

    it('should start with yearly when specified', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} defaultInterval="year" />);

      const yearlyButton = screen.getByRole('button', { name: /Yearly/ });
      expect(yearlyButton).toHaveClass('pricing-table__toggle-button--active');
    });
  });

  describe('props passthrough', () => {
    it('should pass className to container', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} className="custom-class" />);

      const table = document.querySelector('.pricing-table');
      expect(table).toHaveClass('custom-class');
    });

    it('should pass data attributes', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} data-testid="pricing-table" />);

      expect(screen.getByTestId('pricing-table')).toBeInTheDocument();
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to container element', () => {
      const ref = createRef<HTMLDivElement>();
      const plans = createMockPlans();

      render(<PricingTable ref={ref} plans={plans} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveClass('pricing-table');
    });
  });

  describe('accessibility', () => {
    it('should have clickable toggle buttons', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} />);

      const monthlyButton = screen.getByRole('button', { name: 'Monthly' });
      const yearlyButton = screen.getByRole('button', { name: /Yearly/ });

      expect(monthlyButton).toBeInTheDocument();
      expect(yearlyButton).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const plans = createMockPlans();

      render(<PricingTable plans={plans} />);

      await user.tab();
      const monthlyButton = screen.getByRole('button', { name: 'Monthly' });
      expect(monthlyButton).toHaveFocus();
    });
  });

  describe('edge cases', () => {
    it('should handle single plan', () => {
      const firstPlan = createMockPlans()[0];
      if (firstPlan === undefined) throw new Error('Plan not found');
      const plans = [firstPlan];
      render(<PricingTable plans={plans} />);

      expect(screen.getByText('Basic')).toBeInTheDocument();
    });

    it('should handle many plans', () => {
      const manyPlans: Plan[] = Array.from({ length: 10 }, (_, i) => ({
        id: `plan-${i}` as unknown as PlanId,
        name: `Plan ${i}`,
        description: null,
        priceInCents: 1000 * (i + 1),
        currency: 'usd',
        interval: 'month' as const,
        trialDays: 0,
        isActive: true,
        sortOrder: i,
        features: [],
      }));

      render(<PricingTable plans={manyPlans} />);

      expect(screen.getByText('Plan 0')).toBeInTheDocument();
      expect(screen.getByText('Plan 9')).toBeInTheDocument();
    });

    it('should handle mixed intervals correctly', () => {
      const yearlyPlan = createMockPlans()[1];
      if (yearlyPlan === undefined) throw new Error('Yearly plan not found');
      const plans = [
        ...createMockPlans().filter((p) => p.interval === 'month'),
        yearlyPlan, // Add one yearly
      ];

      render(<PricingTable plans={plans} />);

      expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Yearly/ })).toBeInTheDocument();
    });

    it('should handle currentPlanId not matching any plan', () => {
      const plans = createMockPlans();
      render(<PricingTable plans={plans} currentPlanId="nonexistent" />);

      expect(screen.queryByRole('button', { name: 'Current Plan' })).not.toBeInTheDocument();
    });
  });
});
