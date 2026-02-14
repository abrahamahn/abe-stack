// main/apps/storybook/src/stories/elements/Input.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '@abe-stack/ui';

const meta: Meta<typeof Input> = {
  title: 'Elements/Input',
  component: Input,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'Enter text...' },
};

export const WithValue: Story = {
  args: { defaultValue: 'Hello world' },
};

export const Disabled: Story = {
  args: { placeholder: 'Disabled input', disabled: true },
};

export const WithLabel: Story = {
  render: () => <Input.Field label="Email address" type="email" placeholder="user@example.com" />,
};

export const WithDescription: Story = {
  render: () => (
    <Input.Field
      label="Username"
      description="Must be between 3 and 20 characters."
      placeholder="johndoe"
    />
  ),
};

export const WithError: Story = {
  render: () => (
    <Input.Field label="Password" type="password" error="Password must be at least 8 characters." />
  ),
};

export const DisabledField: Story = {
  render: () => <Input.Field label="Locked field" defaultValue="Cannot edit" disabled />,
};
