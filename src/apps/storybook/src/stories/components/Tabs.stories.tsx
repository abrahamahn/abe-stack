// src/apps/storybook/src/stories/components/Tabs.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, Text } from '@abe-stack/ui';

const sampleItems = [
  { id: 'overview', label: 'Overview', content: <Text>Overview panel content.</Text> },
  { id: 'settings', label: 'Settings', content: <Text>Settings panel content.</Text> },
  { id: 'billing', label: 'Billing', content: <Text>Billing panel content.</Text> },
];

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  argTypes: {
    defaultValue: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  args: {
    items: sampleItems,
  },
};

export const WithDefaultValue: Story = {
  args: {
    items: sampleItems,
    defaultValue: 'settings',
  },
};

export const TwoTabs: Story = {
  args: {
    items: [
      { id: 'code', label: 'Code', content: <Text>Source code view.</Text> },
      { id: 'preview', label: 'Preview', content: <Text>Live preview.</Text> },
    ],
  },
};
