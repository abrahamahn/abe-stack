// src/apps/storybook/src/stories/elements/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@abe-stack/ui';

const meta: Meta<typeof Button> = {
  title: 'Elements/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'text'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'inline'],
    },
    disabled: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Primary Button', variant: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'Secondary Button', variant: 'secondary' },
};

export const TextVariant: Story = {
  name: 'Text',
  args: { children: 'Text Button', variant: 'text' },
};

export const Small: Story = {
  args: { children: 'Small Button', variant: 'primary', size: 'small' },
};

export const Medium: Story = {
  args: { children: 'Medium Button', variant: 'primary', size: 'medium' },
};

export const Large: Story = {
  args: { children: 'Large Button', variant: 'primary', size: 'large' },
};

export const Disabled: Story = {
  args: { children: 'Disabled Button', variant: 'primary', disabled: true },
};

export const DisabledSecondary: Story = {
  args: { children: 'Disabled Secondary', variant: 'secondary', disabled: true },
};
