// main/apps/storybook/src/stories/patterns/LoadingStates.stories.tsx
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
  title: 'Patterns/LoadingStates',
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

export const TableSkeleton: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Skeleton width={180} height={22} />
      </Card.Header>
      <Card.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}>
          {/* Header row */}
          <div style={{ display: 'flex', gap: 'var(--ui-gap-md)' }}>
            <Skeleton width="25%" height={16} />
            <Skeleton width="30%" height={16} />
            <Skeleton width="20%" height={16} />
            <Skeleton width="15%" height={16} />
          </div>
          {/* Data rows */}
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--ui-gap-md)' }}>
              <Skeleton width="25%" height={14} />
              <Skeleton width="30%" height={14} />
              <Skeleton width="20%" height={14} />
              <Skeleton width="15%" height={14} />
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  ),
};

export const MediaGallerySkeleton: Story = {
  render: () => (
    <div>
      <Heading as="h2" size="md" style={{ marginBottom: 'var(--ui-gap-md)' }}>
        Media Gallery Loading
      </Heading>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--ui-gap-md)',
        }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-xs)' }}
          >
            <Skeleton
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: 'var(--ui-radius-md)',
              }}
            />
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={12} />
          </div>
        ))}
      </div>
    </div>
  ),
};

export const ProfileSkeleton: Story = {
  render: () => (
    <Card>
      <Card.Body>
        <div style={{ display: 'flex', gap: 'var(--ui-gap-lg)', alignItems: 'flex-start' }}>
          <Skeleton width={80} height={80} radius="50%" />
          <div
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-sm)' }}
          >
            <Skeleton width="40%" height={22} />
            <Skeleton width="60%" height={14} />
            <Skeleton width="80%" height={14} />
            <div
              style={{ display: 'flex', gap: 'var(--ui-gap-sm)', marginTop: 'var(--ui-gap-sm)' }}
            >
              <Skeleton width={80} height={28} radius="var(--ui-radius-full)" />
              <Skeleton width={80} height={28} radius="var(--ui-radius-full)" />
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
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
                  onClick={() => {
                    setValue(Math.max(0, value - 10));
                  }}
                >
                  -10%
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setValue(Math.min(100, value + 10));
                  }}
                >
                  +10%
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setValue(100);
                  }}
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
