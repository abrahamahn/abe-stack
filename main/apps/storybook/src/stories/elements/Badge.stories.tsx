// main/apps/storybook/src/stories/elements/Badge.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@abe-stack/ui';

const meta: Meta<typeof Badge> = {
  title: 'Elements/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: ['info', 'success', 'danger', 'warning'],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Info: Story = {
  args: { children: 'Info', tone: 'info' },
};

export const Success: Story = {
  args: { children: 'Active', tone: 'success' },
};

export const Danger: Story = {
  args: { children: 'Error', tone: 'danger' },
};

export const Warning: Story = {
  args: { children: 'Pending', tone: 'warning' },
};
