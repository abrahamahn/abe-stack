// main/apps/storybook/stories/Modal.stories.tsx
import { Button, Input, Modal, Text } from '@bslt/ui';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Modal.Root> = {
  title: 'Layouts/Modal',
  component: Modal.Root,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof Modal.Root>;

/** Interactive wrapper to control modal open/close state. */
function ModalDemo({
  children,
  label = 'Open Modal',
}: {
  children: (props: { onClose: () => void }) => React.ReactNode;
  label?: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="primary"
        onClick={() => {
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Modal.Root
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      >
        {children({
          onClose: () => {
            setOpen(false);
          },
        })}
      </Modal.Root>
    </>
  );
}

export const Default: Story = {
  render: () => (
    <ModalDemo>
      {({ onClose }) => (
        <>
          <Modal.Header>
            <Modal.Title>Default Modal</Modal.Title>
            <Modal.Close />
          </Modal.Header>
          <Modal.Body>
            <Text>This is a simple modal dialog with a title, body, and close button.</Text>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </Modal.Footer>
        </>
      )}
    </ModalDemo>
  ),
};

export const Confirmation: Story = {
  render: () => (
    <ModalDemo label="Delete Item">
      {({ onClose }) => (
        <>
          <Modal.Header>
            <Modal.Title>Confirm Deletion</Modal.Title>
            <Modal.Close />
          </Modal.Header>
          <Modal.Body>
            <Modal.Description>
              This action cannot be undone. The item and all associated data will be permanently
              removed.
            </Modal.Description>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onClose}>
              Delete
            </Button>
          </Modal.Footer>
        </>
      )}
    </ModalDemo>
  ),
};

export const WithForm: Story = {
  render: () => (
    <ModalDemo label="Edit Profile">
      {({ onClose }) => (
        <>
          <Modal.Header>
            <Modal.Title>Edit Profile</Modal.Title>
            <Modal.Close />
          </Modal.Header>
          <Modal.Body>
            <form
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ui-gap-md)' }}
              onSubmit={(e) => {
                e.preventDefault();
                onClose();
              }}
            >
              <Input.Field label="Display Name" defaultValue="Jane Doe" />
              <Input.Field label="Email" type="email" defaultValue="jane@example.com" />
              <Input.Field label="Bio" placeholder="Tell us about yourself" />
            </form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onClose}>
              Save Changes
            </Button>
          </Modal.Footer>
        </>
      )}
    </ModalDemo>
  ),
};

export const LongContent: Story = {
  render: () => (
    <ModalDemo label="Terms & Conditions">
      {({ onClose }) => (
        <>
          <Modal.Header>
            <Modal.Title>Terms of Service</Modal.Title>
            <Modal.Close />
          </Modal.Header>
          <Modal.Body>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {Array.from({ length: 20 }, (_, i) => (
                <Text key={i} style={{ marginBottom: 'var(--ui-gap-sm)' }}>
                  Section {String(i + 1)}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
                  minim veniam, quis nostrud exercitation ullamco laboris.
                </Text>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>
              Decline
            </Button>
            <Button variant="primary" onClick={onClose}>
              Accept
            </Button>
          </Modal.Footer>
        </>
      )}
    </ModalDemo>
  ),
};
