// main/apps/storybook/stories/PricingTable.stories.tsx
/**
 * PricingTable Stories
 *
 * Displays a grid of pricing plans with interval toggle and comparison.
 */
import { Container, PricingTable } from '@bslt/ui';
import type { Meta, StoryObj } from '@storybook/react';
import type { Plan } from '@bslt/shared';

const meta: Meta<typeof PricingTable> = {
  title: 'Billing/PricingTable',
  component: PricingTable,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Container size="lg" style={{ padding: 'var(--ui-gap-xl) 0' }}>
        <Story />
      </Container>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof PricingTable>;

/** Monthly plans */
const monthlyPlans: Plan[] = [
  {
    id: 'free_monthly' as Plan['id'],
    name: 'Free',
    description: 'For individuals getting started',
    interval: 'month',
    priceInCents: 0,
    currency: 'usd',
    features: [
      { key: 'projects:max', name: 'Projects', included: true, value: 3, description: 'Up to 3 projects' },
      { key: 'storage:max_gb', name: 'Storage', included: true, value: 1, description: '1 GB storage' },
      { key: 'team:members', name: 'Team Members', included: false },
      { key: 'api:access', name: 'API Access', included: false },
      { key: 'branding:custom', name: 'Custom Branding', included: false },
    ],
    trialDays: 0,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'pro_monthly' as Plan['id'],
    name: 'Pro',
    description: 'For professionals and small teams',
    interval: 'month',
    priceInCents: 2900,
    currency: 'usd',
    features: [
      { key: 'projects:max', name: 'Projects', included: true, value: 25, description: 'Up to 25 projects' },
      { key: 'storage:max_gb', name: 'Storage', included: true, value: 50, description: '50 GB storage' },
      { key: 'team:members', name: 'Team Members', included: true, description: 'Up to 10 members' },
      { key: 'api:access', name: 'API Access', included: true },
      { key: 'branding:custom', name: 'Custom Branding', included: false },
    ],
    trialDays: 14,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'enterprise_monthly' as Plan['id'],
    name: 'Enterprise',
    description: 'For large teams and organizations',
    interval: 'month',
    priceInCents: 29900,
    currency: 'usd',
    features: [
      { key: 'projects:max', name: 'Projects', included: true, value: 999, description: 'Unlimited projects' },
      { key: 'storage:max_gb', name: 'Storage', included: true, value: 500, description: '500 GB storage' },
      { key: 'team:members', name: 'Team Members', included: true, description: 'Unlimited members' },
      { key: 'api:access', name: 'API Access', included: true },
      { key: 'branding:custom', name: 'Custom Branding', included: true },
    ],
    trialDays: 0,
    isActive: true,
    sortOrder: 2,
  },
];

/** Yearly plans (with discount) */
const yearlyPlans: Plan[] = [
  {
    id: 'free_yearly' as Plan['id'],
    name: 'Free',
    description: 'For individuals getting started',
    interval: 'year',
    priceInCents: 0,
    currency: 'usd',
    features: monthlyPlans[0].features,
    trialDays: 0,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'pro_yearly' as Plan['id'],
    name: 'Pro',
    description: 'For professionals and small teams',
    interval: 'year',
    priceInCents: 27800,
    currency: 'usd',
    features: monthlyPlans[1].features,
    trialDays: 14,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'enterprise_yearly' as Plan['id'],
    name: 'Enterprise',
    description: 'For large teams and organizations',
    interval: 'year',
    priceInCents: 287000,
    currency: 'usd',
    features: monthlyPlans[2].features,
    trialDays: 0,
    isActive: true,
    sortOrder: 2,
  },
];

const allPlans = [...monthlyPlans, ...yearlyPlans];

export const Default: Story = {
  args: {
    plans: allPlans,
    highlightedPlanId: 'pro_monthly',
    onSelectPlan: () => {},
    getBadge: (plan) => (plan.name === 'Pro' ? 'Most Popular' : undefined),
  },
};

export const MonthlyOnly: Story = {
  args: {
    plans: monthlyPlans,
    showIntervalToggle: false,
    highlightedPlanId: 'pro_monthly',
    onSelectPlan: () => {},
    getBadge: (plan) => (plan.name === 'Pro' ? 'Most Popular' : undefined),
  },
};

export const WithCurrentPlan: Story = {
  args: {
    plans: allPlans,
    currentPlanId: 'pro_monthly',
    highlightedPlanId: 'pro_monthly',
    onSelectPlan: () => {},
    getBadge: (plan) => (plan.name === 'Pro' ? 'Current Plan' : undefined),
    getActionLabel: (_plan, isCurrent) => (isCurrent ? 'Current Plan' : 'Select Plan'),
  },
};

export const WithLoadingPlan: Story = {
  args: {
    plans: monthlyPlans,
    showIntervalToggle: false,
    highlightedPlanId: 'pro_monthly',
    loadingPlanId: 'pro_monthly',
    onSelectPlan: () => {},
    getBadge: (plan) => (plan.name === 'Pro' ? 'Most Popular' : undefined),
  },
};

export const LoadingState: Story = {
  args: {
    plans: [],
    isLoading: true,
  },
};

export const ErrorState: Story = {
  args: {
    plans: [],
    error: 'Unable to load pricing plans. Please try again later.',
  },
};

export const EmptyState: Story = {
  args: {
    plans: [],
  },
};

export const YearlyDefault: Story = {
  args: {
    plans: allPlans,
    defaultInterval: 'year',
    highlightedPlanId: 'pro_yearly',
    onSelectPlan: () => {},
    getBadge: (plan) => (plan.name === 'Pro' ? 'Best Value' : undefined),
  },
};
