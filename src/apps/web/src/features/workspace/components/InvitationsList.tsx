// src/apps/web/src/features/workspace/components/InvitationsList.tsx
/**
 * Invitations List Component
 *
 * Table of workspace invitations with status and action controls.
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

import { useInvitations, useResendInvitation, useRevokeInvitation } from '../hooks';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface InvitationsListProps {
  tenantId: string;
}

// ============================================================================
// Helpers
// ============================================================================

const STATUS_COLORS: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'info',
  accepted: 'success',
  revoked: 'danger',
  expired: 'warning',
};

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
            const statusTone = STATUS_COLORS[invitation.status] ?? 'info';
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
        <Text tone="muted" className="text-center py-4">
          No invitations yet.
        </Text>
      )}
    </div>
  );
};
