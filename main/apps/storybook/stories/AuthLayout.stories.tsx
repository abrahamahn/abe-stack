// main/apps/storybook/stories/AuthLayout.stories.tsx
import { AuthLayout, Button, Input, Text } from '@bslt/ui';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof AuthLayout> = {
  title: 'Layouts/AuthLayout',
  component: AuthLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof AuthLayout>;

export const Default: Story = {
  render: () => (
    <AuthLayout title="Sign In" description="Welcome back! Enter your credentials to continue.">
      <form
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}
        onSubmit={(e) => { e.preventDefault(); }}
      >
        <Input.Field label="Email" type="email" placeholder="you@example.com" />
        <Input.Field label="Password" type="password" placeholder="Enter your password" />
        <Button variant="primary" type="submit">
          Sign In
        </Button>
      </form>
    </AuthLayout>
  ),
};

export const Register: Story = {
  render: () => (
    <AuthLayout title="Create Account" description="Sign up for a new account.">
      <form
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}
        onSubmit={(e) => { e.preventDefault(); }}
      >
        <Input.Field label="Full Name" placeholder="Jane Doe" />
        <Input.Field label="Email" type="email" placeholder="you@example.com" />
        <Input.Field label="Password" type="password" placeholder="Create a password" />
        <Input.Field label="Confirm Password" type="password" placeholder="Repeat your password" />
        <Button variant="primary" type="submit">
          Create Account
        </Button>
      </form>
    </AuthLayout>
  ),
};

export const ForgotPassword: Story = {
  render: () => (
    <AuthLayout
      title="Forgot Password"
      description="Enter your email and we'll send you a reset link."
    >
      <form
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}
        onSubmit={(e) => { e.preventDefault(); }}
      >
        <Input.Field label="Email" type="email" placeholder="you@example.com" />
        <Button variant="primary" type="submit">
          Send Reset Link
        </Button>
        <Text tone="muted" style={{ textAlign: 'center', fontSize: 'var(--ui-font-size-sm)' }}>
          Remember your password? Sign in instead.
        </Text>
      </form>
    </AuthLayout>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <AuthLayout title="Verify Your Email">
      <div style={{ textAlign: 'center', padding: 'var(--ui-gap-lg)' }}>
        <Text>Check your inbox for a verification link.</Text>
      </div>
    </AuthLayout>
  ),
};

export const NoTitleOrDescription: Story = {
  render: () => (
    <AuthLayout>
      <div style={{ padding: 'var(--ui-gap-md)', textAlign: 'center' }}>
        <Text>Custom auth content without title or description.</Text>
      </div>
    </AuthLayout>
  ),
};
