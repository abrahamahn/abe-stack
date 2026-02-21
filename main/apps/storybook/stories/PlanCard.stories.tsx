// main/apps/storybook/stories/PlanCard.stories.tsx
/**
 * PlanCard Stories
 *
 * Displays a single pricing plan with features, price, and action button.
 */
import { Container, PlanCard } from '@bslt/ui';
import type { Meta, StoryObj } from '@storybook/react';
import type { Plan } from '@bslt/shared';

const meta: Meta<typeof PlanCard> = {
  title: 'Billing/PlanCard',
  component: PlanCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Container size="sm" style={{ padding: 'var(--ui-gap-xl) 0' }}>
        <Story />
      </Container>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof PlanCard>;

const freePlan: Plan = {
  id: 'free_monthly' as Plan['id'],
  name: 'Free',
  description: 'For individuals getting started',
  interval: 'month',
  priceInCents: 0,
  currency: 'usd',
  features: [
    {
      key: 'projects:max',
      name: 'Projects',
      included: true,
      value: 3,
      description: 'Up to 3 projects',
    },
    {
      key: 'storage:max_gb',
      name: 'Storage',
      included: true,
      value: 1,
      description: '1 GB storage',
    },
    { key: 'team:members', name: 'Team Members', included: false },
    { key: 'api:access', name: 'API Access', included: false },
    { key: 'branding:custom', name: 'Custom Branding', included: false },
  ],
  trialDays: 0,
  isActive: true,
  sortOrder: 0,
};

const proPlan: Plan = {
  id: 'pro_monthly' as Plan['id'],
  name: 'Pro',
  description: 'For professionals and small teams',
  interval: 'month',
  priceInCents: 2900,
  currency: 'usd',
  features: [
    {
      key: 'projects:max',
      name: 'Projects',
      included: true,
      value: 25,
      description: 'Up to 25 projects',
    },
    {
      key: 'storage:max_gb',
      name: 'Storage',
      included: true,
      value: 50,
      description: '50 GB storage',
    },
    { key: 'team:members', name: 'Team Members', included: true, description: 'Up to 10 members' },
    { key: 'api:access', name: 'API Access', included: true },
    { key: 'branding:custom', name: 'Custom Branding', included: false },
  ],
  trialDays: 14,
  isActive: true,
  sortOrder: 1,
};

const enterprisePlan: Plan = {
  id: 'enterprise_monthly' as Plan['id'],
  name: 'Enterprise',
  description: 'For large teams and organizations',
  interval: 'month',
  priceInCents: 29900,
  currency: 'usd',
  features: [
    {
      key: 'projects:max',
      name: 'Projects',
      included: true,
      value: 999,
      description: 'Unlimited projects',
    },
    {
      key: 'storage:max_gb',
      name: 'Storage',
      included: true,
      value: 500,
      description: '500 GB storage',
    },
    { key: 'team:members', name: 'Team Members', included: true, description: 'Unlimited members' },
    { key: 'api:access', name: 'API Access', included: true },
    { key: 'branding:custom', name: 'Custom Branding', included: true },
  ],
  trialDays: 0,
  isActive: true,
  sortOrder: 2,
};

export const Free: Story = {
  args: {
    plan: freePlan,
    actionLabel: 'Get Started',
    onAction: () => {},
  },
};

export const Pro: Story = {
  args: {
    plan: proPlan,
    actionLabel: 'Start Free Trial',
    onAction: () => {},
  },
};

export const ProHighlighted: Story = {
  args: {
    plan: proPlan,
    isHighlighted: true,
    badge: 'Most Popular',
    actionLabel: 'Start Free Trial',
    onAction: () => {},
  },
};

export const Enterprise: Story = {
  args: {
    plan: enterprisePlan,
    actionLabel: 'Contact Sales',
    onAction: () => {},
  },
};

export const CurrentPlan: Story = {
  args: {
    plan: proPlan,
    isCurrent: true,
    actionLabel: 'Current Plan',
  },
};

export const Loading: Story = {
  args: {
    plan: proPlan,
    isLoading: true,
    onAction: () => {},
  },
};

export const Disabled: Story = {
  args: {
    plan: proPlan,
    isDisabled: true,
    actionLabel: 'Unavailable',
    onAction: () => {},
  },
};

export const AllPlans: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--ui-gap-md)',
      }}
    >
      <PlanCard plan={freePlan} actionLabel="Get Started" onAction={() => {}} />
      <PlanCard
        plan={proPlan}
        isHighlighted
        badge="Most Popular"
        actionLabel="Start Free Trial"
        onAction={() => {}}
      />
      <PlanCard plan={enterprisePlan} actionLabel="Contact Sales" onAction={() => {}} />
    </div>
  ),
};
