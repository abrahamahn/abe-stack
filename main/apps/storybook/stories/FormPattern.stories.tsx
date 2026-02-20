// main/apps/storybook/stories/FormPattern.stories.tsx
/**
 * Form Patterns
 *
 * Common form layouts and patterns using the UI library components.
 */
import {
  Button,
  Card,
  Checkbox,
  Container,
  FormField,
  Heading,
  Input,
  PasswordInput,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Text,
  TextArea,
} from '@bslt/ui';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Patterns/FormPattern',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <Container size="sm">
        <Story />
      </Container>
    ),
  ],
};
export default meta;

type Story = StoryObj;

export const LoginForm: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Heading as="h2" size="md">
          Sign In
        </Heading>
      </Card.Header>
      <Card.Body>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}
          onSubmit={(e) => { e.preventDefault(); }}
        >
          <Input.Field label="Email" type="email" placeholder="you@example.com" />
          <PasswordInput.Field label="Password" placeholder="Enter password" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Checkbox label="Remember me" />
            <Button variant="text" size="small">
              Forgot password?
            </Button>
          </div>
          <Button variant="primary" type="submit">
            Sign In
          </Button>
        </form>
      </Card.Body>
    </Card>
  ),
};

export const SettingsForm: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Heading as="h2" size="md">
          Account Settings
        </Heading>
      </Card.Header>
      <Card.Body>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-lg)' }}
          onSubmit={(e) => { e.preventDefault(); }}
        >
          <Input.Field label="Display Name" defaultValue="Jane Doe" />
          <Input.Field label="Email" type="email" defaultValue="jane@example.com" />
          <TextArea.Field
            label="Bio"
            defaultValue="Software engineer who loves building things."
            rows={3}
          />
          <Select value="en" onChange={() => {}}>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </Select>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>Email notifications</Text>
            <Switch defaultChecked />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>Dark mode</Text>
            <Switch />
          </div>
        </form>
      </Card.Body>
      <Card.Footer>
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Save Changes</Button>
      </Card.Footer>
    </Card>
  ),
};

export const RegistrationForm: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Heading as="h2" size="md">
          Create Account
        </Heading>
        <Text tone="muted">Fill in your details to get started.</Text>
      </Card.Header>
      <Card.Body>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}
          onSubmit={(e) => { e.preventDefault(); }}
        >
          <div style={{ display: 'flex', gap: 'var(--ui-gap-md)' }}>
            <div style={{ flex: 1 }}>
              <Input.Field label="First Name" placeholder="Jane" />
            </div>
            <div style={{ flex: 1 }}>
              <Input.Field label="Last Name" placeholder="Doe" />
            </div>
          </div>
          <Input.Field label="Email" type="email" placeholder="jane@example.com" />
          <PasswordInput.Field label="Password" placeholder="Create a password" />
          <PasswordInput.Field label="Confirm Password" placeholder="Repeat password" />
          <Checkbox label="I agree to the Terms of Service and Privacy Policy" />
          <Button variant="primary" type="submit">
            Create Account
          </Button>
        </form>
      </Card.Body>
    </Card>
  ),
};

export const FormWithValidation: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Heading as="h2" size="md">
          Form with Validation
        </Heading>
      </Card.Header>
      <Card.Body>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}
          onSubmit={(e) => { e.preventDefault(); }}
        >
          <Input.Field label="Username" error="Username is already taken" defaultValue="admin" />
          <Input.Field
            label="Email"
            type="email"
            error="Please enter a valid email address"
            defaultValue="not-an-email"
          />
          <PasswordInput.Field
            label="Password"
            error="Password must be at least 8 characters"
            defaultValue="short"
          />
          <FormField label="Role" htmlFor="role-select" required>
            <Select value="" onChange={() => {}}>
              <option value="">Select a role...</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="viewer">Viewer</option>
            </Select>
          </FormField>
          <Button variant="primary" type="submit">
            Submit
          </Button>
        </form>
      </Card.Body>
    </Card>
  ),
};

export const RadioGroupForm: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Heading as="h2" size="md">
          Subscription Plan
        </Heading>
      </Card.Header>
      <Card.Body>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-lg)' }}
          onSubmit={(e) => { e.preventDefault(); }}
        >
          <RadioGroup name="plan" defaultValue="pro">
            <Radio value="free" label="Free - Basic features" />
            <Radio value="pro" label="Pro - $9/month" />
            <Radio value="enterprise" label="Enterprise - Custom pricing" />
          </RadioGroup>
          <RadioGroup name="billing" defaultValue="monthly">
            <Radio value="monthly" label="Monthly billing" />
            <Radio value="annual" label="Annual billing (save 20%)" />
          </RadioGroup>
          <Button variant="primary" type="submit">
            Confirm Selection
          </Button>
        </form>
      </Card.Body>
    </Card>
  ),
};

export const InlineForm: Story = {
  render: () => (
    <Card>
      <Card.Body>
        <form
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 'var(--ui-gap-md)',
            flexWrap: 'wrap',
          }}
          onSubmit={(e) => { e.preventDefault(); }}
        >
          <div style={{ flex: '1 1 12rem' }}>
            <Input.Field label="Search" placeholder="Search users..." />
          </div>
          <div style={{ minWidth: '8rem' }}>
            <Select value="all" onChange={() => {}}>
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </Select>
          </div>
          <Button variant="primary">Search</Button>
        </form>
      </Card.Body>
    </Card>
  ),
};
