// main/apps/web/src/features/workspace/components/CreateWorkspaceDialog.tsx
/**
 * Create Workspace Dialog
 *
 * Modal with name and slug form for creating a new workspace.
 */

import { slugify } from '@bslt/shared';
import { Alert, Button, FormField, Input, Modal, Text } from '@bslt/ui';
import { useState, type ReactElement } from 'react';

import { useCreateWorkspace } from '../hooks';

// ============================================================================
// Types
// ============================================================================

export interface CreateWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (tenantId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export const CreateWorkspaceDialog = ({
  open,
  onClose,
  onSuccess,
}: CreateWorkspaceDialogProps): ReactElement | null => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const { create, isLoading, error, reset } = useCreateWorkspace({
    onSuccess: (tenant) => {
      setName('');
      setSlug('');
      setSlugTouched(false);
      reset();
      onClose();
      onSuccess?.(tenant.id);
    },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSlugTouched(true);
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    create({ name: name.trim(), slug: slug.trim() });
  };

  const handleClose = (): void => {
    setName('');
    setSlug('');
    setSlugTouched(false);
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <Modal.Header>
        <Modal.Title>Create Workspace</Modal.Title>
        <Modal.Description>Create a new workspace to collaborate with your team.</Modal.Description>
        <Modal.Close />
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="space-y-4">
            <FormField label="Workspace Name" htmlFor="workspace-name">
              <Input
                id="workspace-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="My Workspace"
                maxLength={100}
                required
              />
            </FormField>

            <FormField label="URL Slug" htmlFor="workspace-slug">
              <Input
                id="workspace-slug"
                type="text"
                value={slug}
                onChange={handleSlugChange}
                placeholder="my-workspace"
                maxLength={63}
                required
              />
              <Text size="sm" tone="muted" className="mt-1">
                Lowercase letters, numbers, and hyphens only.
              </Text>
            </FormField>

            {error !== null && <Alert tone="danger">{error.message}</Alert>}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={name.trim().length === 0 || slug.trim().length === 0 || isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Workspace'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal.Root>
  );
};
