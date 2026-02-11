// src/apps/storybook/src/stories/elements/Spinner.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from '@abe-stack/ui';

const meta: Meta<typeof Spinner> = {
  title: 'Elements/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
  args: {},
};

export const Small: Story = {
  args: { size: 'var(--ui-gap-md)' },
};

export const Medium: Story = {
  args: { size: 'var(--ui-gap-xl)' },
};

export const Large: Story = {
  args: { size: 'var(--ui-gap-3xl)' },
};
