// src/apps/storybook/src/stories/components/Dialog.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Dialog, Button, Text } from '@abe-stack/ui';

const meta: Meta<typeof Dialog.Root> = {
  title: 'Components/Dialog',
  component: Dialog.Root,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Dialog.Root>;

export const Default: Story = {
  render: () => (
    <Dialog.Root>
      <Dialog.Trigger className="btn btn-primary btn-medium">Open Dialog</Dialog.Trigger>
      <Dialog.Content title="Dialog Title">
        <Text>This is the dialog content. Press Escape or click the overlay to close.</Text>
      </Dialog.Content>
    </Dialog.Root>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <Dialog.Root>
      <Dialog.Trigger className="btn btn-primary btn-medium">Confirm Action</Dialog.Trigger>
      <Dialog.Content title="Are you sure?">
        <Dialog.Description>
          <Text>
            This action cannot be undone. All associated data will be permanently removed.
          </Text>
        </Dialog.Description>
        <div className="flex gap-2" style={{ marginTop: 'var(--ui-gap-md)' }}>
          <Button variant="secondary" size="small">
            Cancel
          </Button>
          <Button variant="primary" size="small">
            Confirm
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  ),
};

export const DefaultOpen: Story = {
  render: () => (
    <Dialog.Root defaultOpen>
      <Dialog.Trigger className="btn btn-secondary btn-medium">Re-open</Dialog.Trigger>
      <Dialog.Content title="Initially Open">
        <Text>This dialog opens by default when the story loads.</Text>
      </Dialog.Content>
    </Dialog.Root>
  ),
};
