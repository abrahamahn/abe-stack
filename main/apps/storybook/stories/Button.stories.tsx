// main/apps/storybook/stories/Button.stories.tsx
import { Button } from '@bslt/ui';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Button> = {
  title: 'Elements/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'text'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'inline'],
    },
    disabled: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Primary Button', variant: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'Secondary Button', variant: 'secondary' },
};

export const Danger: Story = {
  name: 'Danger (Text Variant)',
  args: { children: 'Delete', variant: 'text' },
  render: (args) => (
    <Button {...args} style={{ color: 'var(--ui-color-danger)' }} />
  ),
};

export const TextVariant: Story = {
  name: 'Text',
  args: { children: 'Text Button', variant: 'text' },
};

export const Small: Story = {
  args: { children: 'Small Button', variant: 'primary', size: 'small' },
};

export const Medium: Story = {
  args: { children: 'Medium Button', variant: 'primary', size: 'medium' },
};

export const Large: Story = {
  args: { children: 'Large Button', variant: 'primary', size: 'large' },
};

export const Inline: Story = {
  args: { children: 'Inline Button', variant: 'primary', size: 'inline' },
};

export const Disabled: Story = {
  args: { children: 'Disabled Button', variant: 'primary', disabled: true },
};

export const DisabledSecondary: Story = {
  args: { children: 'Disabled Secondary', variant: 'secondary', disabled: true },
};

export const DisabledText: Story = {
  args: { children: 'Disabled Text', variant: 'text', disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-lg)' }}>
      <div style={{ display: 'flex', gap: 'var(--ui-gap-md)', alignItems: 'center' }}>
        <Button variant="primary" size="small">Primary Small</Button>
        <Button variant="primary" size="medium">Primary Medium</Button>
        <Button variant="primary" size="large">Primary Large</Button>
      </div>
      <div style={{ display: 'flex', gap: 'var(--ui-gap-md)', alignItems: 'center' }}>
        <Button variant="secondary" size="small">Secondary Small</Button>
        <Button variant="secondary" size="medium">Secondary Medium</Button>
        <Button variant="secondary" size="large">Secondary Large</Button>
      </div>
      <div style={{ display: 'flex', gap: 'var(--ui-gap-md)', alignItems: 'center' }}>
        <Button variant="text" size="small">Text Small</Button>
        <Button variant="text" size="medium">Text Medium</Button>
        <Button variant="text" size="large">Text Large</Button>
      </div>
      <div style={{ display: 'flex', gap: 'var(--ui-gap-md)', alignItems: 'center' }}>
        <Button variant="primary" disabled>Disabled Primary</Button>
        <Button variant="secondary" disabled>Disabled Secondary</Button>
        <Button variant="text" disabled>Disabled Text</Button>
      </div>
    </div>
  ),
};
