// main/apps/storybook/stories/EmptyState.stories.tsx
/**
 * Empty State Patterns
 *
 * Common empty state patterns for when there is no data to display.
 */
import { Card, Container, EmptyState, Heading } from '@bslt/ui';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof EmptyState> = {
  title: 'Patterns/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Container size="md" style={{ padding: 'var(--ui-gap-xl) 0' }}>
        <Story />
      </Container>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: 'No items yet',
    description: 'Create your first item to get started.',
    action: { label: 'Create Item', onClick: () => {} },
  },
};

export const WithoutAction: Story = {
  args: {
    title: 'No notifications',
    description: "You're all caught up!",
  },
};

export const WithoutDescription: Story = {
  args: {
    title: 'No search results',
  },
};

export const NoProjectsYet: Story = {
  render: () => (
    <Card>
      <Card.Body>
        <EmptyState
          title="No projects yet"
          description="Create your first project to get started."
          action={{ label: 'Create Project', onClick: () => {} }}
        />
      </Card.Body>
    </Card>
  ),
};

export const NoMediaFiles: Story = {
  render: () => (
    <Card>
      <Card.Body>
        <EmptyState
          title="No media files"
          description="Upload images, audio, or video to your media library."
          action={{ label: 'Upload Files', onClick: () => {} }}
        />
      </Card.Body>
    </Card>
  ),
};

export const NoSearchResults: Story = {
  render: () => (
    <Card>
      <Card.Body>
        <EmptyState
          title="No search results"
          description="Try adjusting your search terms or filters."
        />
      </Card.Body>
    </Card>
  ),
};

export const MultipleEmptyStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-lg)' }}>
      <Heading as="h2" size="md">
        Empty State Variants
      </Heading>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--ui-gap-lg)',
        }}
      >
        <Card>
          <Card.Body>
            <EmptyState
              title="No projects yet"
              description="Create your first project to get started."
              action={{ label: 'Create Project', onClick: () => {} }}
            />
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <EmptyState
              title="No media files"
              description="Upload images, audio, or video to your media library."
              action={{ label: 'Upload Files', onClick: () => {} }}
            />
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <EmptyState
              title="No search results"
              description="Try adjusting your search terms or filters."
            />
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <EmptyState title="No notifications" description="You're all caught up!" />
          </Card.Body>
        </Card>
      </div>
    </div>
  ),
};
