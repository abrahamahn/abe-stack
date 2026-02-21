// main/apps/storybook/stories/Input.stories.tsx
import { Input } from '@bslt/ui';
import type { Meta, StoryObj } from '@storybook/react';

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

export const AllStates: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ui-gap-lg)',
        maxWidth: '24rem',
      }}
    >
      <Input.Field label="Default" placeholder="Enter text..." />
      <Input.Field label="With value" defaultValue="Some text content" />
      <Input.Field
        label="With description"
        description="This field includes a helpful description."
        placeholder="Type here..."
      />
      <Input.Field label="With error" error="This field is required." defaultValue="" />
      <Input.Field label="Disabled" defaultValue="Cannot edit this" disabled />
    </div>
  ),
};
