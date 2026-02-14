// main/apps/storybook/src/stories/elements/Alert.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from '@abe-stack/ui';

const meta: Meta<typeof Alert> = {
  title: 'Elements/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: ['info', 'success', 'danger', 'warning'],
    },
    title: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<typeof Alert>;

export const Info: Story = {
  args: {
    tone: 'info',
    title: 'Information',
    children: 'This is an informational message.',
  },
};

export const Success: Story = {
  args: {
    tone: 'success',
    title: 'Success',
    children: 'Your changes have been saved.',
  },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    title: 'Error',
    children: 'Something went wrong. Please try again.',
  },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    title: 'Warning',
    children: 'This action cannot be undone.',
  },
};

export const WithoutTitle: Story = {
  args: {
    tone: 'info',
    children: 'A simple alert message without a title.',
  },
};
