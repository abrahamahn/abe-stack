// main/apps/storybook/src/stories/layouts/Container.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Container, Text } from '@abe-stack/ui';

const meta: Meta<typeof Container> = {
  title: 'Layouts/Container',
  component: Container,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ background: 'var(--ui-color-surface)', padding: 'var(--ui-gap-md)' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Container>;

export const Small: Story = {
  args: { size: 'sm' },
  render: (args) => (
    <Container {...args}>
      <div
        style={{
          padding: 'var(--ui-gap-xl)',
          background: 'var(--ui-color-bg)',
          border: '1px dashed var(--ui-color-border)',
          borderRadius: 'var(--ui-radius-md)',
        }}
      >
        <Text>Small container (narrow width)</Text>
      </div>
    </Container>
  ),
};

export const Medium: Story = {
  args: { size: 'md' },
  render: (args) => (
    <Container {...args}>
      <div
        style={{
          padding: 'var(--ui-gap-xl)',
          background: 'var(--ui-color-bg)',
          border: '1px dashed var(--ui-color-border)',
          borderRadius: 'var(--ui-radius-md)',
        }}
      >
        <Text>Medium container (default width)</Text>
      </div>
    </Container>
  ),
};

export const Large: Story = {
  args: { size: 'lg' },
  render: (args) => (
    <Container {...args}>
      <div
        style={{
          padding: 'var(--ui-gap-xl)',
          background: 'var(--ui-color-bg)',
          border: '1px dashed var(--ui-color-border)',
          borderRadius: 'var(--ui-radius-md)',
        }}
      >
        <Text>Large container (wide width)</Text>
      </div>
    </Container>
  ),
};
