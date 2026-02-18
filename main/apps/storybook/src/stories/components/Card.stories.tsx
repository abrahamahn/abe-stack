// main/apps/storybook/src/stories/components/Card.stories.tsx
import { Button, Card, Text } from '@bslt/ui';
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
