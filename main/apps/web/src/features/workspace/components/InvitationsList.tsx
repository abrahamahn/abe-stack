// main/apps/web/src/features/workspace/components/InvitationsList.tsx
/**
 * Invitations List Component
 *
 * Table of workspace invitations with status and action controls.
 */

import { getInvitationStatusTone } from '@bslt/shared';
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

import { useInvitations, useResendInvitation, useRevokeInvitation } from '../hooks';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface InvitationsListProps {
  tenantId: string;
}

// ============================================================================
// Component
// ============================================================================

export const InvitationsList = ({ tenantId }: InvitationsListProps): ReactElement => {
  const { data: invitations, isLoading, error: fetchError } = useInvitations(tenantId);
  const { revoke, isLoading: isRevoking, error: revokeError } = useRevokeInvitation(tenantId);
  const { resend, isLoading: isResending, error: resendError } = useResendInvitation(tenantId);

  const currentError = fetchError ?? revokeError ?? resendError;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }, (_, i) => (
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
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => {
            const statusTone = getInvitationStatusTone(invitation.status);
            const isPending = invitation.status === 'pending';

            return (
              <TableRow key={invitation.id}>
                <TableCell>
                  <Text size="sm">{invitation.email}</Text>
                </TableCell>
                <TableCell>
                  <Badge>{invitation.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge tone={statusTone}>{invitation.status}</Badge>
                </TableCell>
                <TableCell>
                  <Text size="sm" tone="muted">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </Text>
                </TableCell>
                <TableCell>
                  {isPending && (
                    <div className="flex gap-2">
                      <Button
                        size="small"
                        variant="secondary"
                        disabled={isResending}
                        onClick={() => {
                          resend(invitation.id);
                        }}
                      >
                        Resend
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        className="text-danger"
                        disabled={isRevoking}
                        onClick={() => {
                          revoke(invitation.id);
                        }}
                      >
                        Revoke
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {invitations.length === 0 && (
        <EmptyState
          title="No pending invitations"
          description="Invite teammates to collaborate on this workspace"
        />
      )}
    </div>
  );
};
