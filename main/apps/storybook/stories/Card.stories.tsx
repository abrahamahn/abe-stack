// main/apps/storybook/stories/Card.stories.tsx
import { Button, Card, Heading, Input, Text } from '@bslt/ui';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card>
      <Card.Body>
        <Text>A simple card with body content.</Text>
      </Card.Body>
    </Card>
  ),
};

export const WithHeaderAndBody: Story = {
  render: () => (
    <Card>
      <Card.Header>Card Title</Card.Header>
      <Card.Body>
        <Text>This card has a header and body section.</Text>
      </Card.Body>
    </Card>
  ),
};

export const WithHeaderBodyAndFooter: Story = {
  render: () => (
    <Card>
      <Card.Header>Settings</Card.Header>
      <Card.Body>
        <Text>Update your account settings below.</Text>
      </Card.Body>
      <Card.Footer>
        <Button variant="secondary" size="small">
          Cancel
        </Button>
        <Button variant="primary" size="small">
          Save
        </Button>
      </Card.Footer>
    </Card>
  ),
};

export const ContentCard: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Heading as="h2" size="md">
          Project Overview
        </Heading>
      </Card.Header>
      <Card.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-sm)' }}>
          <Text>
            A collaborative workspace for your team to manage tasks, share files, and track
            progress.
          </Text>
          <div style={{ display: 'flex', gap: 'var(--ui-gap-md)', marginTop: 'var(--ui-gap-sm)' }}>
            <div>
              <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
                Members
              </Text>
              <Text style={{ fontWeight: 'var(--ui-font-weight-semibold)' }}>12</Text>
            </div>
            <div>
              <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
                Tasks
              </Text>
              <Text style={{ fontWeight: 'var(--ui-font-weight-semibold)' }}>48</Text>
            </div>
            <div>
              <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
                Completed
              </Text>
              <Text style={{ fontWeight: 'var(--ui-font-weight-semibold)' }}>31</Text>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  ),
};

export const WithFormContent: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Heading as="h2" size="md">
          Contact Information
        </Heading>
      </Card.Header>
      <Card.Body>
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <Input.Field label="Full Name" placeholder="Jane Doe" />
          <Input.Field label="Email" type="email" placeholder="jane@example.com" />
          <Input.Field label="Phone" type="tel" placeholder="+1 (555) 000-0000" />
        </form>
      </Card.Body>
      <Card.Footer>
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Save Contact</Button>
      </Card.Footer>
    </Card>
  ),
};

export const MultipleCards: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--ui-gap-md)',
      }}
    >
      {['Analytics', 'Users', 'Revenue'].map((title) => (
        <Card key={title}>
          <Card.Header>{title}</Card.Header>
          <Card.Body>
            <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
              Summary of {title.toLowerCase()} data for the current period.
            </Text>
          </Card.Body>
        </Card>
      ))}
    </div>
  ),
};
