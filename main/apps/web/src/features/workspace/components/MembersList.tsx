// main/apps/web/src/features/workspace/components/MembersList.tsx
/**
 * Members List Component
 *
 * Table of workspace members with role badges and action controls.
 */

import { getRoleLevel, getTenantRoleTone } from '@bslt/shared';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@bslt/ui';

import { useMembers, useRemoveMember, useUpdateMemberRole } from '../hooks';

import type { TenantRole } from '@bslt/shared';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface MembersListProps {
  tenantId: string;
  currentUserId?: string;
}

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
      <div>
        <div className="flex gap-4 border-b pb-2 mb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
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
            const roleTone = getTenantRoleTone(member.role);

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
                          const isAdminLevel = getRoleLevel(member.role) >= getRoleLevel('admin');
                          const nextRole: TenantRole = isAdminLevel ? 'member' : 'admin';
                          updateRole(member.userId, { role: nextRole });
                        }}
                      >
                        {getRoleLevel(member.role) >= getRoleLevel('admin') ? 'Demote' : 'Promote'}
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
        <EmptyState
          title="No members yet"
          description="Invite your first teammate to get started"
        />
      )}
    </div>
  );
};
