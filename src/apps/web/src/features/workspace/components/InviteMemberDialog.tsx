// src/apps/web/src/features/workspace/components/InviteMemberDialog.tsx
/**
 * Invite Member Dialog
 *
 * Modal for inviting a new member to a workspace via email.
 */

import { Alert, Button, FormField, Input, Modal, Select, Text } from '@abe-stack/ui';
import { useState, type ReactElement } from 'react';

import { useCreateInvitation } from '../hooks';

import type { TenantRole } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export interface InviteMemberDialogProps {
  tenantId: string;
  open: boolean;
  onClose: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
];

// ============================================================================
// Component
// ============================================================================

export const InviteMemberDialog = ({
  tenantId,
  open,
  onClose,
}: InviteMemberDialogProps): ReactElement | null => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TenantRole>('member');

  const { invite, isLoading, error, reset } = useCreateInvitation(tenantId, {
    onSuccess: () => {
      setEmail('');
      setRole('member');
      reset();
      onClose();
    },
  });

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    invite({ email: email.trim(), role });
  };

  const handleClose = (): void => {
    setEmail('');
    setRole('member');
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <Modal.Header>
        <Modal.Title>Invite Member</Modal.Title>
        <Modal.Description>Send an invitation to join this workspace.</Modal.Description>
        <Modal.Close />
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="space-y-4">
            <FormField label="Email Address" htmlFor="invite-email">
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                placeholder="colleague@example.com"
                required
              />
            </FormField>

            <FormField label="Role" htmlFor="invite-role">
              <Select
                id="invite-role"
                value={role}
                onChange={(value) => {
                  setRole(value as TenantRole);
                }}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Text size="sm" tone="muted" className="mt-1">
                Members can view and edit. Admins can manage members and settings.
              </Text>
            </FormField>

            {error !== null && <Alert tone="danger">{error.message}</Alert>}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={email.trim().length === 0 || isLoading}>
            {isLoading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal.Root>
  );
};
