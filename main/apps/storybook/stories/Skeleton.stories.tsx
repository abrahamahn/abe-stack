// main/apps/storybook/stories/Skeleton.stories.tsx
import { Card, Heading, Skeleton, Text } from '@bslt/ui';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Skeleton> = {
  title: 'Elements/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    width: { control: 'text' },
    height: { control: 'text' },
    radius: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: { width: 200, height: 20 },
};

export const TextLine: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-sm)' }}>
      <Skeleton width="100%" height={16} />
      <Skeleton width="80%" height={16} />
      <Skeleton width="60%" height={16} />
    </div>
  ),
};

export const Circle: Story = {
  args: { width: 64, height: 64, radius: '50%' },
};

export const Rounded: Story = {
  args: { width: 120, height: 32, radius: 'var(--ui-radius-full)' },
};

export const CardSkeleton: Story = {
  render: () => (
    <Card>
      <Card.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-sm)' }}>
          <Skeleton width="60%" height={20} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="80%" height={14} />
          <Skeleton width="40%" height={14} />
        </div>
      </Card.Body>
    </Card>
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

export const TableSkeleton: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Skeleton width={180} height={22} />
      </Card.Header>
      <Card.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}>
          <div style={{ display: 'flex', gap: 'var(--ui-gap-md)' }}>
            <Skeleton width="25%" height={16} />
            <Skeleton width="30%" height={16} />
            <Skeleton width="20%" height={16} />
            <Skeleton width="15%" height={16} />
          </div>
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

export const MediaGridSkeleton: Story = {
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

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-lg)' }}>
      <div>
        <Text style={{ marginBottom: 'var(--ui-gap-sm)' }}>Text lines</Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-xs)' }}>
          <Skeleton width="100%" height={14} />
          <Skeleton width="85%" height={14} />
          <Skeleton width="70%" height={14} />
        </div>
      </div>
      <div>
        <Text style={{ marginBottom: 'var(--ui-gap-sm)' }}>Shapes</Text>
        <div style={{ display: 'flex', gap: 'var(--ui-gap-md)', alignItems: 'center' }}>
          <Skeleton width={48} height={48} radius="50%" />
          <Skeleton width={120} height={32} radius="var(--ui-radius-full)" />
          <Skeleton width={200} height={40} radius="var(--ui-radius-md)" />
        </div>
      </div>
    </div>
  ),
};
