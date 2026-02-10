// src/apps/web/src/features/workspace/components/MembersList.tsx
/**
 * Members List Component
 *
 * Table of workspace members with role badges and action controls.
 */

import {
  Alert,
  Badge,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@abe-stack/ui';

import { useMembers, useRemoveMember, useUpdateMemberRole } from '../hooks';

import type { TenantRole } from '@abe-stack/shared';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface MembersListProps {
  tenantId: string;
  currentUserId?: string;
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

// ============================================================================
// Component
// ============================================================================

export const MembersList = ({ tenantId, currentUserId }: MembersListProps): ReactElement => {
  const { data: members, isLoading, error: fetchError } = useMembers(tenantId);
  const { updateRole, isLoading: isUpdating, error: updateError } = useUpdateMemberRole(tenantId);
  const { remove, isLoading: isRemoving, error: removeError } = useRemoveMember(tenantId);

  const currentError = fetchError ?? updateError ?? removeError;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {currentError !== null && (
        <Alert tone="danger" className="mb-4">
          {currentError.message}
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isCurrentUser = member.userId === currentUserId;
            const roleTone = ROLE_COLORS[member.role] ?? 'info';

            return (
              <TableRow key={member.id}>
                <TableCell>
                  <Text size="sm">{member.userId}</Text>
                  {isCurrentUser && (
                    <Text size="xs" tone="muted">
                      (You)
                    </Text>
                  )}
                </TableCell>
                <TableCell>
                  <Badge tone={roleTone}>{member.role}</Badge>
                </TableCell>
                <TableCell>
                  <Text size="sm" tone="muted">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </Text>
                </TableCell>
                <TableCell>
                  {!isCurrentUser && member.role !== 'owner' && (
                    <div className="flex gap-2">
                      <Button
                        size="small"
                        variant="secondary"
                        disabled={isUpdating}
                        onClick={() => {
                          const nextRole: TenantRole = member.role === 'admin' ? 'member' : 'admin';
                          updateRole(member.userId, { role: nextRole });
                        }}
                      >
                        {member.role === 'admin' ? 'Demote' : 'Promote'}
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        className="text-danger"
                        disabled={isRemoving}
                        onClick={() => {
                          remove(member.userId);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {members.length === 0 && (
        <Text tone="muted" className="text-center py-4">
          No members yet.
        </Text>
      )}
    </div>
  );
};
