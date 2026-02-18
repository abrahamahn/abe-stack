// main/apps/storybook/src/stories/components/Select.stories.tsx
import { Select } from '@bslt/ui';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: (args) => (
    <Select {...args}>
      <option value="apple">Apple</option>
      <option value="banana">Banana</option>
      <option value="cherry">Cherry</option>
    </Select>
  ),
};

export const WithDefaultValue: Story = {
  render: (args) => (
    <Select defaultValue="banana" {...args}>
      <option value="apple">Apple</option>
      <option value="banana">Banana</option>
      <option value="cherry">Cherry</option>
    </Select>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <Select disabled {...args}>
      <option value="apple">Apple</option>
      <option value="banana">Banana</option>
      <option value="cherry">Cherry</option>
    </Select>
  ),
};

export const WithDisabledOption: Story = {
  render: (args) => (
    <Select {...args}>
      <option value="available">Available</option>
      <option value="unavailable" disabled>
        Unavailable
      </option>
      <option value="coming-soon">Coming Soon</option>
    </Select>
  ),
};
