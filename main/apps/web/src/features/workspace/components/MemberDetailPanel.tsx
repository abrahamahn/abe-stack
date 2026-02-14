// main/apps/web/src/features/workspace/components/MemberDetailPanel.tsx
/**
 * Member Detail Panel
 *
 * Displays member information with role management and removal actions.
 * Only users with 'owner' or 'admin' roles can perform actions.
 */

import { getRoleLevel } from '@abe-stack/shared';
import { Badge, Button, Card, Modal, Select, Text } from '@abe-stack/ui';
import { useState, type ReactElement } from 'react';

import type { TenantRole } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export interface MemberDetail {
  userId: string;
  role: TenantRole;
  createdAt: string;
}

export interface MemberDetailPanelProps {
  member: MemberDetail;
  tenantId: string;
  currentUserRole: TenantRole;
  onRoleChange: (userId: string, role: TenantRole) => void;
  onRemove: (userId: string) => void;
  onClose: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

const ROLE_COLORS: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  owner: 'danger',
  admin: 'warning',
  member: 'info',
  viewer: 'success',
};

const ASSIGNABLE_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

function canManageMembers(role: TenantRole): boolean {
  return getRoleLevel(role) >= getRoleLevel('admin');
}

// ============================================================================
// Component
// ============================================================================

export const MemberDetailPanel = ({
  member,
  tenantId: _tenantId,
  currentUserRole,
  onRoleChange,
  onRemove,
  onClose,
}: MemberDetailPanelProps): ReactElement => {
  const [selectedRole, setSelectedRole] = useState<TenantRole>(member.role);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const roleTone = ROLE_COLORS[member.role] ?? 'info';
  const isActionable = canManageMembers(currentUserRole) && member.role !== 'owner';

  const handleRoleChange = (value: string): void => {
    const newRole = value as TenantRole;
    setSelectedRole(newRole);
    onRoleChange(member.userId, newRole);
  };

  const handleConfirmRemove = (): void => {
    setConfirmRemoveOpen(false);
    onRemove(member.userId);
  };

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <Text style={{ fontWeight: 'var(--ui-font-weight-medium)' }}>Member Details</Text>
          <Button size="small" variant="text" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card.Header>

      <Card.Body>
        <div className="space-y-4">
          <div>
            <Text size="sm" tone="muted">
              User ID
            </Text>
            <Text>{member.userId}</Text>
          </div>

          <div>
            <Text size="sm" tone="muted">
              Role
            </Text>
            <div className="mt-1">
              <Badge tone={roleTone}>{member.role}</Badge>
            </div>
          </div>

          <div>
            <Text size="sm" tone="muted">
              Joined
            </Text>
            <Text size="sm">{new Date(member.createdAt).toLocaleDateString()}</Text>
          </div>

          {isActionable && (
            <div className="border-t pt-4 space-y-4">
              <div>
                <Text size="sm" tone="muted" className="mb-1">
                  Change Role
                </Text>
                <Select value={selectedRole} onChange={handleRoleChange}>
                  {ASSIGNABLE_ROLES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Button
                  variant="secondary"
                  className="text-danger"
                  onClick={() => {
                    setConfirmRemoveOpen(true);
                  }}
                >
                  Remove Member
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card.Body>

      <Modal.Root
        open={confirmRemoveOpen}
        onClose={() => {
          setConfirmRemoveOpen(false);
        }}
      >
        <Modal.Header>
          <Modal.Title>Remove Member</Modal.Title>
          <Modal.Close />
        </Modal.Header>
        <Modal.Body>
          <Text>
            Are you sure you want to remove this member? They will lose access to the workspace
            immediately.
          </Text>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setConfirmRemoveOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button className="text-danger" onClick={handleConfirmRemove}>
            Remove
          </Button>
        </Modal.Footer>
      </Modal.Root>
    </Card>
  );
};
