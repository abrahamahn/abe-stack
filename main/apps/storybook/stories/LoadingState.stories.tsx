// main/apps/storybook/stories/LoadingState.stories.tsx
/**
 * Loading State Patterns
 *
 * Common loading patterns: skeletons, spinners, progress bars, and
 * content placeholders used across the application.
 */
import {
  Button,
  Card,
  Container,
  DelayedFallback,
  EmptyState,
  Heading,
  LoadingContainer,
  Progress,
  Skeleton,
  Spinner,
  Text,
} from '@bslt/ui';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Patterns/LoadingState',
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

type Story = StoryObj;

export const FullPageLoading: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '300px',
        border: '1px dashed var(--ui-color-border)',
        borderRadius: 'var(--ui-radius-md)',
      }}
    >
      <LoadingContainer text="Loading your dashboard..." size="lg" />
    </div>
  ),
};

export const CardSkeletons: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}>
      <Heading as="h2" size="md">
        Loading Cards
      </Heading>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--ui-gap-md)',
        }}
      >
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i}>
            <Card.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-sm)' }}>
                <Skeleton width="60%" height={20} />
                <Skeleton width="100%" height={14} />
                <Skeleton width="80%" height={14} />
                <Skeleton width="40%" height={14} />
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  ),
};

export const InlineSpinners: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-lg)' }}>
      <Heading as="h2" size="md">
        Inline Spinners
      </Heading>
      <div style={{ display: 'flex', gap: 'var(--ui-gap-lg)', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-gap-sm)' }}>
          <Spinner size="1rem" />
          <Text style={{ fontSize: 'var(--ui-font-size-sm)' }}>Saving...</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-gap-sm)' }}>
          <Spinner size="1.25rem" />
          <Text>Loading data...</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-gap-sm)' }}>
          <Spinner size="1.5rem" />
          <Text style={{ fontSize: 'var(--ui-font-size-lg)' }}>Processing...</Text>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--ui-gap-md)' }}>
        <Button variant="primary" disabled>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-gap-sm)' }}>
            <Spinner size="1rem" />
            <span>Uploading...</span>
          </span>
        </Button>
        <Button variant="secondary" disabled>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-gap-sm)' }}>
            <Spinner size="1rem" />
            <span>Saving...</span>
          </span>
        </Button>
      </div>
    </div>
  ),
};

export const ProgressIndicators: Story = {
  render: function ProgressStory() {
    const [value, setValue] = useState(45);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-lg)' }}>
        <Heading as="h2" size="md">
          Upload Progress
        </Heading>
        <Card>
          <Card.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Uploading photo.jpg</Text>
                <Text tone="muted">{String(value)}%</Text>
              </div>
              <Progress value={value} max={100} />
              <div style={{ display: 'flex', gap: 'var(--ui-gap-sm)' }}>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => { setValue(Math.max(0, value - 10)); }}
                >
                  -10%
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => { setValue(Math.min(100, value + 10)); }}
                >
                  +10%
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => { setValue(100); }}
                >
                  Complete
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  },
};

export const DelayedLoading: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}>
      <Heading as="h2" size="md">
        Delayed Fallback
      </Heading>
      <Text tone="muted">
        The loading indicator below uses DelayedFallback to avoid flickering for fast loads.
      </Text>
      <Card>
        <Card.Body>
          <DelayedFallback delay={0}>
            <LoadingContainer text="This loading indicator appeared after a brief delay..." />
          </DelayedFallback>
        </Card.Body>
      </Card>
    </div>
  ),
};

export const EmptyStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-lg)' }}>
      <Heading as="h2" size="md">
        Empty States
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
              title="No search results"
              description="Try adjusting your search terms or filters."
            />
          </Card.Body>
        </Card>
      </div>
    </div>
  ),
};
