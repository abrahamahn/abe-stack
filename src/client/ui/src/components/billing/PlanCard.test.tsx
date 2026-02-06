// client/ui/src/components/billing/PlanCard.test.tsx
/**
 * Tests for PlanCard component.
 *
 * Tests single pricing plan card display with features and CTA.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PlanCard } from './PlanCard';

import type { Plan, PlanFeature, PlanId } from '@abe-stack/shared';

const createMockPlan = (overrides?: Partial<Plan>): Plan => ({
  id: 'basic' as unknown as PlanId,
  name: 'Basic Plan',
  description: 'Perfect for individuals',
  priceInCents: 999,
  currency: 'usd',
  interval: 'month',
  trialDays: 14,
  isActive: true,
  sortOrder: 0,
  features: [
    { key: 'storage:limit', name: '10 GB Storage', included: true, value: 10 },
    { key: 'projects:limit', name: '5 Projects', included: true, value: 5 },
    { key: 'team:invite', name: 'Email Support', included: true },
    { key: 'team:invite', name: 'Priority Support', included: false },
  ],
  ...overrides,
});

describe('PlanCard', () => {
  describe('rendering', () => {
    it('should render plan name', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} />);

      expect(screen.getByText('Basic Plan')).toBeInTheDocument();
    });

    it('should render plan description', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} />);

      expect(screen.getByText('Perfect for individuals')).toBeInTheDocument();
    });

    it('should render without description', () => {
      const plan = createMockPlan({ description: '' });
      render(<PlanCard plan={plan} />);

      expect(screen.queryByText('Perfect for individuals')).not.toBeInTheDocument();
    });

    it('should render price', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} />);

      expect(screen.getByText('$9.99/mo')).toBeInTheDocument();
    });

    it('should render yearly price', () => {
      const plan = createMockPlan({ interval: 'year', priceInCents: 9900 });
      render(<PlanCard plan={plan} />);

      expect(screen.getByText('$99.00/yr')).toBeInTheDocument();
    });

    it('should render trial days', () => {
      const plan = createMockPlan({ trialDays: 14 });
      render(<PlanCard plan={plan} />);

      expect(screen.getByText('14 day free trial')).toBeInTheDocument();
    });

    it('should not render trial when zero days', () => {
      const plan = createMockPlan({ trialDays: 0 });
      render(<PlanCard plan={plan} />);

      expect(screen.queryByText(/free trial/)).not.toBeInTheDocument();
    });

    it('should render features list', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} />);

      expect(screen.getByText('10 GB Storage')).toBeInTheDocument();
      expect(screen.getByText('5 Projects')).toBeInTheDocument();
      expect(screen.getByText('Email Support')).toBeInTheDocument();
      expect(screen.getByText('Priority Support')).toBeInTheDocument();
    });

    it('should render action button', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} />);

      expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
    });
  });

  describe('badge', () => {
    it('should render badge when provided', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} badge="Most Popular" />);

      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });

    it('should not render badge when not provided', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} />);

      const card = screen.getByRole('button').closest('.plan-card');
      expect(card?.querySelector('.plan-card__badge')).not.toBeInTheDocument();
    });

    it('should not render badge when empty string', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} badge="" />);

      const card = screen.getByRole('button').closest('.plan-card');
      expect(card?.querySelector('.plan-card__badge')).not.toBeInTheDocument();
    });
  });

  describe('states', () => {
    it('should apply highlighted class', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} isHighlighted />);

      const card = screen.getByRole('button').closest('.plan-card');
      expect(card).toHaveClass('plan-card--highlighted');
    });

    it('should apply current class', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} isCurrent />);

      const card = screen.getByRole('button').closest('.plan-card');
      expect(card).toHaveClass('plan-card--current');
    });

    it('should show "Current Plan" for current subscription', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} isCurrent />);

      expect(screen.getByRole('button', { name: 'Current Plan' })).toBeInTheDocument();
    });

    it('should disable button when isCurrent is true', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} isCurrent />);

      const button = screen.getByRole('button', { name: 'Current Plan' });
      expect(button).toBeDisabled();
    });

    it('should show loading state', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} isLoading />);

      expect(screen.getByRole('button', { name: 'Loading...' })).toBeInTheDocument();
    });

    it('should disable button when loading', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} isLoading />);

      const button = screen.getByRole('button', { name: 'Loading...' });
      expect(button).toBeDisabled();
    });

    it('should disable button when isDisabled is true', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} isDisabled />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('should call onAction when button clicked', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const plan = createMockPlan();

      render(<PlanCard plan={plan} onAction={onAction} />);

      const button = screen.getByRole('button', { name: 'Get Started' });
      await user.click(button);

      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledWith(plan);
    });

    it('should not call onAction when disabled', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const plan = createMockPlan();

      render(<PlanCard plan={plan} onAction={onAction} isDisabled />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onAction).not.toHaveBeenCalled();
    });

    it('should not call onAction when loading', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const plan = createMockPlan();

      render(<PlanCard plan={plan} onAction={onAction} isLoading />);

      const button = screen.getByRole('button', { name: 'Loading...' });
      await user.click(button);

      expect(onAction).not.toHaveBeenCalled();
    });

    it('should not call onAction when current', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const plan = createMockPlan();

      render(<PlanCard plan={plan} onAction={onAction} isCurrent />);

      const button = screen.getByRole('button', { name: 'Current Plan' });
      await user.click(button);

      expect(onAction).not.toHaveBeenCalled();
    });

    it('should handle missing onAction', async () => {
      const user = userEvent.setup();
      const plan = createMockPlan();

      render(<PlanCard plan={plan} />);

      const button = screen.getByRole('button', { name: 'Get Started' });

      await expect(user.click(button)).resolves.not.toThrow();
    });
  });

  describe('custom formatters', () => {
    it('should use custom formatPrice', () => {
      const plan = createMockPlan();
      const formatPrice = (): string => 'Custom Price';

      render(<PlanCard plan={plan} formatPrice={formatPrice} />);

      expect(screen.getByText('Custom Price')).toBeInTheDocument();
    });

    it('should use custom renderFeature', () => {
      const plan = createMockPlan();
      const renderFeature = (): React.ReactNode => <span>Custom Feature</span>;

      render(<PlanCard plan={plan} renderFeature={renderFeature} />);

      const customFeatures = screen.getAllByText('Custom Feature');
      expect(customFeatures).toHaveLength(plan.features.length);
    });
  });

  describe('action label', () => {
    it('should use custom action label', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} actionLabel="Subscribe Now" />);

      expect(screen.getByRole('button', { name: 'Subscribe Now' })).toBeInTheDocument();
    });

    it('should default to "Get Started" when not current', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} />);

      expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
    });

    it('should use custom label over "Current Plan"', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} isCurrent actionLabel="Active" />);

      expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
    });
  });

  describe('button variants', () => {
    it('should apply primary variant when highlighted', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} isHighlighted />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('plan-card__button--primary');
    });

    it('should apply current variant when current', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} isCurrent />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('plan-card__button--current');
    });

    it('should have base class', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('plan-card__button');
    });
  });

  describe('features rendering', () => {
    it('should show included features with checkmark', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} />);

      const includedFeatures = plan.features.filter((f: PlanFeature) => f.included);
      includedFeatures.forEach((feature: PlanFeature) => {
        expect(screen.getByText(feature.name)).toBeInTheDocument();
      });
    });

    it('should show excluded features with X', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} />);

      const excludedFeatures = plan.features.filter((f: PlanFeature) => !f.included);
      excludedFeatures.forEach((feature: PlanFeature) => {
        expect(screen.getByText(feature.name)).toBeInTheDocument();
      });
    });

    it('should render feature descriptions', () => {
      const plan = createMockPlan({
        features: [
          {
            key: 'storage:limit',
            name: 'Storage',
            description: 'Cloud storage space',
            included: true,
            value: 10,
          },
        ],
      });

      render(<PlanCard plan={plan} />);

      expect(screen.getByText('Cloud storage space')).toBeInTheDocument();
    });

    it('should not render empty feature descriptions', () => {
      const plan = createMockPlan({
        features: [
          { key: 'storage:limit', name: 'Storage', description: '', included: true, value: 10 },
        ],
      });

      render(<PlanCard plan={plan} />);

      const feature = screen.getByText('Storage').closest('.plan-card__feature');
      expect(feature?.querySelector('.plan-card__feature-description')).not.toBeInTheDocument();
    });
  });

  describe('props passthrough', () => {
    it('should pass className to container', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} className="custom-class" />);

      const card = screen.getByRole('button').closest('.plan-card');
      expect(card).toHaveClass('custom-class');
    });

    it('should pass data attributes', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} data-testid="plan-card" data-plan-id={plan.id} />);

      const card = screen.getByTestId('plan-card');
      expect(card).toHaveAttribute('data-plan-id', 'basic');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to container element', () => {
      const ref = createRef<HTMLDivElement>();
      const plan = createMockPlan();

      render(<PlanCard ref={ref} plan={plan} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveClass('plan-card');
    });
  });

  describe('edge cases', () => {
    it('should handle zero price', () => {
      const plan = createMockPlan({ priceInCents: 0 });
      render(<PlanCard plan={plan} />);

      expect(screen.getByText('$0.00/mo')).toBeInTheDocument();
    });

    it('should handle large prices', () => {
      const plan = createMockPlan({ priceInCents: 999999 });
      render(<PlanCard plan={plan} />);

      expect(screen.getByText('$9999.99/mo')).toBeInTheDocument();
    });

    it('should handle empty features array', () => {
      const plan = createMockPlan({ features: [] });
      render(<PlanCard plan={plan} />);

      const card = screen.getByRole('button').closest('.plan-card');
      const featuresList = card?.querySelector('.plan-card__features');
      expect(featuresList?.children).toHaveLength(0);
    });

    it('should handle non-USD currency', () => {
      const plan = createMockPlan({ currency: 'eur' });
      render(<PlanCard plan={plan} />);

      expect(screen.getByText('EUR9.99/mo')).toBeInTheDocument();
    });

    it('should handle multiple states simultaneously', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} isHighlighted isCurrent isLoading />);

      const card = screen.getByRole('button').closest('.plan-card');
      expect(card).toHaveClass('plan-card--highlighted');
      expect(card).toHaveClass('plan-card--current');

      const button = screen.getByRole('button', { name: 'Loading...' });
      expect(button).toBeDisabled();
    });

    it('should handle long plan names', () => {
      const plan = createMockPlan({
        name: 'Premium Enterprise Professional Business Ultimate Plan',
      });

      render(<PlanCard plan={plan} />);

      expect(
        screen.getByText('Premium Enterprise Professional Business Ultimate Plan'),
      ).toBeInTheDocument();
    });

    it('should handle long descriptions', () => {
      const plan = createMockPlan({
        description: 'A'.repeat(200),
      });

      render(<PlanCard plan={plan} />);

      expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
    });

    it('should handle plan with description containing null', () => {
      const plan = createMockPlan({ description: null as unknown as string });
      render(<PlanCard plan={plan} />);

      expect(screen.getByText('Basic Plan')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have clickable button', () => {
      const plan = createMockPlan();
      render(<PlanCard plan={plan} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const plan = createMockPlan();

      render(<PlanCard plan={plan} />);

      await user.tab();
      const button = screen.getByRole('button');
      expect(button).toHaveFocus();
    });

    it('should support keyboard interaction', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const plan = createMockPlan();

      render(<PlanCard plan={plan} onAction={onAction} />);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('[Enter]');
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });
});
